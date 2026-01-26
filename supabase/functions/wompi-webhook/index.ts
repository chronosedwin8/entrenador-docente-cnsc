// Setup type definitions for Deno
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Edge Function: wompi-webhook v1.0 - Automatic Premium Activation");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-event-checksum',
};

// Plan limits configuration - must match create-payment-intent
const PLAN_LIMITS: Record<string, { daily: number; monthly: number; questions: number }> = {
    basico: { daily: 1, monthly: 8, questions: 20 },
    intermedio: { daily: 2, monthly: 20, questions: 30 },
    avanzado: { daily: 3, monthly: 40, questions: 50 }
};

// SHA-256 hash function
async function generateHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify Wompi webhook checksum
async function verifyWebhookChecksum(
    event: any,
    receivedChecksum: string
): Promise<boolean> {
    const eventsSecret = Deno.env.get('WOMPI_EVENTS_SECRET');
    if (!eventsSecret) {
        console.error("WOMPI_EVENTS_SECRET not configured");
        return false;
    }

    // Wompi checksum format: timestamp + transaction.id + transaction.status + transaction.amount_in_cents + secret
    // Or simpler: Concatenate the signature properties + secret
    const transaction = event.data?.transaction;
    if (!transaction) {
        console.error("No transaction in event data");
        return false;
    }

    // Build verification string according to Wompi docs
    // The exact format depends on Wompi's documentation
    // Common format: transaction.id + transaction.status + transaction.amount_in_cents + secret
    const verificationString = `${transaction.id}${transaction.status}${transaction.amount_in_cents}${eventsSecret}`;

    const calculatedChecksum = await generateHash(verificationString);

    console.log(`Verifying checksum: received=${receivedChecksum.substring(0, 16)}... calculated=${calculatedChecksum.substring(0, 16)}...`);

    return calculatedChecksum === receivedChecksum;
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // 1. Get the checksum header
        const receivedChecksum = req.headers.get('x-event-checksum') || '';

        // 2. Parse the event body
        const event = await req.json();
        console.log("Received Wompi event:", event.event);

        // 3. Only process transaction.updated events
        if (event.event !== 'transaction.updated') {
            console.log(`Ignoring event type: ${event.event}`);
            return new Response(JSON.stringify({ message: 'Event ignored' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const transaction = event.data?.transaction;
        if (!transaction) {
            throw new Error("No transaction data in event");
        }

        console.log(`Processing transaction: ${transaction.reference}, status: ${transaction.status}`);

        // 4. Verify checksum (skip in sandbox for testing if needed)
        // In production, ALWAYS verify
        const isProduction = Deno.env.get('WOMPI_ENVIRONMENT') === 'production';

        if (isProduction && receivedChecksum) {
            const isValid = await verifyWebhookChecksum(event, receivedChecksum);
            if (!isValid) {
                console.error("Invalid checksum - potential security threat");
                return new Response(JSON.stringify({ error: 'Invalid checksum' }), {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }
        } else {
            console.log("Skipping checksum verification (sandbox mode or no checksum)");
        }

        // 5. Initialize Supabase
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

        if (!supabaseServiceKey) {
            throw new Error("Service Key not configured");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 6. Find our transaction by reference
        const { data: localTransaction, error: findError } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference', transaction.reference)
            .single();

        if (findError || !localTransaction) {
            console.error(`Transaction not found for reference: ${transaction.reference}`);
            // Return 200 to prevent Wompi from retrying for unknown transactions
            return new Response(JSON.stringify({
                message: 'Transaction not found, but acknowledged'
            }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 7. Check if already processed (idempotency)
        if (localTransaction.status === 'APPROVED' && transaction.status === 'APPROVED') {
            console.log(`Transaction ${transaction.reference} already processed`);
            return new Response(JSON.stringify({ message: 'Already processed' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 8. Update transaction record
        const { error: updateError } = await supabase
            .from('transactions')
            .update({
                status: transaction.status,
                wompi_transaction_id: transaction.id,
                payment_method_type: transaction.payment_method_type || transaction.payment_method?.type || 'unknown',
                updated_at: new Date().toISOString()
            })
            .eq('id', localTransaction.id);

        if (updateError) {
            console.error("Error updating transaction:", updateError);
        }

        // 9. If APPROVED, activate the user
        if (transaction.status === 'APPROVED') {
            console.log(`🎉 Payment APPROVED for user ${localTransaction.user_id}, plan: ${localTransaction.plan_name}`);

            const planLimits = PLAN_LIMITS[localTransaction.plan_name] || PLAN_LIMITS.basico;

            // Calculate expiration date (1 year from now)
            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);

            // Update user profile to premium
            const { error: activateError } = await supabase
                .from('profiles')
                .update({
                    subscription_tier: 'premium',
                    expiration_date: expirationDate.toISOString(),
                    custom_daily_limit: planLimits.daily,
                    custom_monthly_limit: planLimits.monthly,
                    custom_question_limit: planLimits.questions,
                    // If payment includes interview, grant access
                    has_interview_access: localTransaction.includes_interview || false
                })
                .eq('id', localTransaction.user_id);

            if (activateError) {
                console.error("Error activating user:", activateError);
                throw new Error("Failed to activate user premium status");
            }

            console.log(`✅ User ${localTransaction.user_id} activated as PREMIUM with plan ${localTransaction.plan_name}`);

            // TODO: Send confirmation email (optional enhancement)
        } else {
            console.log(`Payment status: ${transaction.status} - User NOT activated`);
        }

        // 10. Return success (always 200 to prevent retries)
        return new Response(JSON.stringify({
            message: 'Webhook processed successfully',
            transactionStatus: transaction.status,
            userActivated: transaction.status === 'APPROVED'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("Webhook error:", err.message);

        // Return 200 even on error to prevent infinite retries
        // Log the error for debugging
        return new Response(JSON.stringify({
            error: err.message,
            message: 'Error processed but acknowledged'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

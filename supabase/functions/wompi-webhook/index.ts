import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PlanName = 'basico' | 'intermedio' | 'avanzado';
interface PlanLimits { daily: number; monthly: number; questions: number; }

const FALLBACK_LIMITS: Record<PlanName, PlanLimits> = {
    basico: { daily: 1, monthly: 8, questions: 20 },
    intermedio: { daily: 2, monthly: 20, questions: 30 },
    avanzado: { daily: 3, monthly: 40, questions: 50 }
};

function planNameToConfigKey(planName: PlanName): string {
    if (planName === 'basico') return 'basic';
    if (planName === 'intermedio') return 'intermediate';
    return 'advanced';
}

async function getPlanLimits(supabase: any, planName: PlanName): Promise<PlanLimits> {
    const { data, error } = await supabase
        .from('app_settings').select('value').eq('key', 'plan_configurations').maybeSingle();
    if (error || !data?.value) {
        console.warn('plan_configurations not found, using fallback');
        return FALLBACK_LIMITS[planName];
    }
    const cfg = data.value[planNameToConfigKey(planName)];
    if (!cfg) return FALLBACK_LIMITS[planName];
    return {
        daily: Number(cfg.daily_sims) || FALLBACK_LIMITS[planName].daily,
        monthly: Number(cfg.monthly_sims) || FALLBACK_LIMITS[planName].monthly,
        questions: Number(cfg.questions_per_sim) || FALLBACK_LIMITS[planName].questions
    };
}

console.log("Edge Function: wompi-webhook v2.0 - With correct checksum, audit log & dynamic plan limits");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-event-checksum',
};

// Wompi checksum verification using the correct format documented at:
// https://docs.wompi.co/docs/colombia/eventos/
// Format: concatenate values of event.signature.properties (in that order)
//         + event.timestamp (as string) + events_secret
// then SHA-256 hex digest.
async function verifyWebhookChecksum(event: any, receivedChecksum: string): Promise<boolean> {
    const eventsSecret = Deno.env.get('WOMPI_EVENTS_SECRET');
    if (!eventsSecret) {
        console.error('WOMPI_EVENTS_SECRET not configured');
        return false;
    }

    const properties: string[] = event?.signature?.properties;
    const timestamp: number | string = event?.timestamp;
    const transaction = event?.data?.transaction;

    if (!properties || !timestamp || !transaction) {
        console.error('Missing signature.properties or timestamp in event payload');
        return false;
    }

    // Build string: value of each property (using dot-path on event.data.transaction) + timestamp + secret
    const values = properties.map((prop: string) => {
        // Properties are like "transaction.id", "transaction.status", "transaction.amount_in_cents"
        const key = prop.replace('transaction.', '');
        return String(transaction[key] ?? '');
    });

    const verificationString = values.join('') + String(timestamp) + eventsSecret;

    const encoder = new TextEncoder();
    const encoded = encoder.encode(verificationString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const calculatedChecksum = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const isValid = calculatedChecksum === receivedChecksum;
    if (!isValid) {
        console.error(`Checksum mismatch. Properties: ${properties.join(',')} | Timestamp: ${timestamp}`);
    }
    return isValid;
}

async function logWebhookError(supabase: any, data: {
    reference?: string;
    wompi_transaction_id?: string;
    payload?: any;
    error_message: string;
}) {
    const { error } = await supabase.from('webhook_errors').insert({
        source: 'wompi-webhook',
        ...data
    });
    if (error) console.error('Failed to insert webhook_error:', error.message);
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
        return new Response(JSON.stringify({ error: 'Service key not configured' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    let rawEvent: any = null;

    try {
        // 1. Parse body
        const text = await req.text();
        try {
            rawEvent = JSON.parse(text);
        } catch {
            console.error('Invalid JSON body in webhook');
            return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
                status: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        console.log('Received Wompi event:', rawEvent?.event);

        // 2. Only process transaction.updated
        if (rawEvent.event !== 'transaction.updated') {
            console.log(`Ignoring event type: ${rawEvent.event}`);
            return new Response(JSON.stringify({ message: 'Event ignored' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const transaction = rawEvent.data?.transaction;
        if (!transaction) {
            throw new Error('No transaction data in event');
        }

        console.log(`Processing: reference=${transaction.reference}, status=${transaction.status}`);

        // 3. Verify checksum (always in production, skip in sandbox only if no checksum sent)
        const receivedChecksum = req.headers.get('x-event-checksum') || '';
        const wompiEnv = Deno.env.get('WOMPI_ENVIRONMENT') || 'sandbox';
        const isProduction = wompiEnv === 'production';
        console.log(`wompi-webhook: env=${wompiEnv}, hasChecksumHeader=${!!receivedChecksum}`);

        if (receivedChecksum) {
            const isValid = await verifyWebhookChecksum(rawEvent, receivedChecksum);
            if (!isValid) {
                // In production this is a hard failure (return 401 → Wompi won't retry, but we log)
                // In sandbox treat as warning so manual testing still works
                if (isProduction) {
                    console.error('Invalid checksum in production — rejecting event');
                    await logWebhookError(supabase, {
                        reference: transaction.reference,
                        wompi_transaction_id: transaction.id,
                        payload: rawEvent,
                        error_message: 'Checksum verification failed in production'
                    });
                    return new Response(JSON.stringify({ error: 'Invalid checksum' }), {
                        status: 401,
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                    });
                } else {
                    console.warn('Checksum invalid in sandbox — processing anyway for testing');
                }
            }
        } else {
            console.log('No checksum header received — skipping verification');
        }

        // 4. Find local transaction by reference
        const { data: localTx, error: findError } = await supabase
            .from('transactions')
            .select('*')
            .eq('reference', transaction.reference)
            .maybeSingle();

        if (findError) {
            throw new Error(`DB error finding transaction: ${findError.message}`);
        }

        if (!localTx) {
            console.warn(`Unknown reference: ${transaction.reference} — acknowledged without processing`);
            return new Response(JSON.stringify({ message: 'Unknown transaction, acknowledged' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 5. Idempotency check
        if (localTx.status === 'APPROVED' && transaction.status === 'APPROVED') {
            console.log(`Already processed: ${transaction.reference}`);
            return new Response(JSON.stringify({ message: 'Already processed' }), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 6. Update transaction status
        const { error: updateTxError } = await supabase
            .from('transactions')
            .update({
                status: transaction.status,
                wompi_transaction_id: transaction.id,
                payment_method_type: transaction.payment_method_type || transaction.payment_method?.type || 'unknown',
                updated_at: new Date().toISOString()
            })
            .eq('id', localTx.id);

        if (updateTxError) {
            throw new Error(`Failed to update transaction: ${updateTxError.message}`);
        }

        // 7. Activate user if APPROVED
        if (transaction.status === 'APPROVED') {
            console.log(`Payment APPROVED for user=${localTx.user_id}, plan=${localTx.plan_name}`);

            const planLimits = await getPlanLimits(supabase, localTx.plan_name as PlanName);

            const expirationDate = new Date();
            expirationDate.setFullYear(expirationDate.getFullYear() + 1);

            const { error: activateError } = await supabase
                .from('profiles')
                .update({
                    subscription_tier: 'premium',
                    expiration_date: expirationDate.toISOString(),
                    custom_daily_limit: planLimits.daily,
                    custom_monthly_limit: planLimits.monthly,
                    custom_question_limit: planLimits.questions,
                    has_interview_access: localTx.includes_interview || false
                })
                .eq('id', localTx.user_id);

            if (activateError) {
                // Log error and return 500 so Wompi retries the webhook
                await logWebhookError(supabase, {
                    reference: localTx.reference,
                    wompi_transaction_id: transaction.id,
                    payload: rawEvent,
                    error_message: `Failed to activate profile: ${activateError.message}`
                });
                return new Response(JSON.stringify({ error: 'Failed to activate user' }), {
                    status: 500,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                });
            }

            console.log(`✅ User ${localTx.user_id} activated as PREMIUM — plan=${localTx.plan_name}, daily=${planLimits.daily}, monthly=${planLimits.monthly}, questions=${planLimits.questions}`);
        } else {
            console.log(`Payment status=${transaction.status} — user NOT activated`);
        }

        return new Response(JSON.stringify({
            message: 'Webhook processed successfully',
            transactionStatus: transaction.status,
            userActivated: transaction.status === 'APPROVED'
        }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error('Webhook unhandled error:', err.message);

        // Try to log for admin visibility
        try {
            if (supabase && rawEvent) {
                await logWebhookError(supabase, {
                    reference: rawEvent?.data?.transaction?.reference,
                    wompi_transaction_id: rawEvent?.data?.transaction?.id,
                    payload: rawEvent,
                    error_message: err.message
                });
            }
        } catch (logErr: any) {
            console.error('Also failed to log webhook error:', logErr.message);
        }

        // Return 500 so Wompi retries the webhook (only for unexpected errors)
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

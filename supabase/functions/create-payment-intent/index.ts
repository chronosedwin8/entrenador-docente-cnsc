// Setup type definitions for Deno
import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Edge Function: create-payment-intent v1.2 (Production Ready)");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan configurations - cents (multiply by 100)
const PLAN_PRICES: Record<string, number> = {
    basico: 10000000,      // $100.000 COP
    intermedio: 18000000,  // $180.000 COP
    avanzado: 30000000     // $300.000 COP
};

const PLAN_LIMITS: Record<string, { daily: number; monthly: number; questions: number }> = {
    basico: { daily: 1, monthly: 8, questions: 20 },
    intermedio: { daily: 2, monthly: 20, questions: 30 },
    avanzado: { daily: 3, monthly: 40, questions: 50 }
};

// SHA-256 hash function
async function generateIntegrityHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        console.log("Request received:", req.method);

        // 1. Parsing Body safely
        let body;
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            throw new Error("Invalid format: Body is not valid JSON");
        }

        const { planName, userId, includesInterview = false, finalAmountCents } = body;

        // 2. Validate input
        if (!planName || !userId) {
            throw new Error("Missing parameters: planName and userId are required");
        }

        if (!PLAN_PRICES[planName]) {
            throw new Error(`Invalid plan: ${planName}`);
        }

        // 3. Get Secrets
        const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
        if (!integritySecret) {
            throw new Error("Server Error: WOMPI_INTEGRITY_SECRET missing");
        }

        // 4. Calculate amount
        const amountInCents = finalAmountCents || PLAN_PRICES[planName];

        // 5. Generate unique reference
        const reference = `PAY_${userId.substring(0, 8)}_${Date.now()}`;

        // 6. Generate integrity signature
        const integrityString = `${reference}${amountInCents}COP${integritySecret}`;
        const integrity = await generateIntegrityHash(integrityString);

        console.log(`Processing Order: ${reference} - $${amountInCents / 100} COP`);

        // 7. Initialize Supabase client
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        // Fallback for Service Role Key
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Server Error: Supabase credentials missing");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // 8. Verify user exists
        const { data: userProfile, error: userError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', userId)
            .single();

        if (userError || !userProfile) {
            throw new Error("User verification failed");
        }

        // 9. Create pending transaction record
        const { error: insertError } = await supabase
            .from('transactions')
            .insert({
                user_id: userId,
                reference,
                plan_name: planName,
                amount_in_cents: amountInCents,
                currency: 'COP',
                status: 'PENDING',
                includes_interview: includesInterview
            });

        if (insertError) {
            console.error("DB Insert Error:", insertError);
            throw new Error("Database Error: Could not create transaction");
        }

        console.log(`Transaction ${reference} saved successfully.`);

        // 10. Return Success Data
        return new Response(JSON.stringify({
            reference,
            amountInCents,
            currency: 'COP',
            integrity,
            planName,
            planLimits: PLAN_LIMITS[planName],
            includesInterview
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("Error Handler:", err.message);
        return new Response(JSON.stringify({
            error: err.message,
            status: 'error'
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

import "https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Edge Function: create-payment-intent v2.1");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type PlanName = 'basico' | 'intermedio' | 'avanzado';

// Prices in cents — UNCHANGED from original to preserve integrity calculation
const PLAN_PRICES_CENTS: Record<PlanName, number> = {
    basico: 10000000,      // $100.000 COP
    intermedio: 18000000,  // $180.000 COP
    avanzado: 30000000     // $300.000 COP
};

// Fallback limits if app_settings is unreachable
const FALLBACK_LIMITS: Record<PlanName, { daily: number; monthly: number; questions: number }> = {
    basico: { daily: 1, monthly: 8, questions: 20 },
    intermedio: { daily: 2, monthly: 20, questions: 30 },
    avanzado: { daily: 3, monthly: 40, questions: 50 }
};

function planNameToConfigKey(planName: PlanName): string {
    if (planName === 'basico') return 'basic';
    if (planName === 'intermedio') return 'intermediate';
    return 'advanced';
}

async function getPlanLimits(supabase: any, planName: PlanName) {
    try {
        const { data, error } = await supabase
            .from('app_settings').select('value').eq('key', 'plan_configurations').maybeSingle();
        if (error || !data?.value) return FALLBACK_LIMITS[planName];
        const cfg = data.value[planNameToConfigKey(planName)];
        if (!cfg) return FALLBACK_LIMITS[planName];
        return {
            daily: Number(cfg.daily_sims) || FALLBACK_LIMITS[planName].daily,
            monthly: Number(cfg.monthly_sims) || FALLBACK_LIMITS[planName].monthly,
            questions: Number(cfg.questions_per_sim) || FALLBACK_LIMITS[planName].questions
        };
    } catch {
        return FALLBACK_LIMITS[planName];
    }
}

async function generateIntegrityHash(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const encoded = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        let body: any = {};
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : {};
        } catch (e) {
            throw new Error("Invalid format: Body is not valid JSON");
        }

        const { planName, userId, includesInterview = false, finalAmountCents } = body;

        if (!planName || !userId) {
            throw new Error("Missing parameters: planName and userId are required");
        }

        if (!PLAN_PRICES_CENTS[planName as PlanName]) {
            throw new Error(`Invalid plan: ${planName}`);
        }

        const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
        if (!integritySecret) {
            throw new Error("Server Error: WOMPI_INTEGRITY_SECRET missing");
        }

        // IMPORTANT: amountInCents uses the same logic as the original to preserve integrity
        // finalAmountCents comes from the frontend (which already reads from app_settings)
        // PLAN_PRICES_CENTS is fallback only when frontend doesn't provide the amount
        const amountInCents = finalAmountCents || PLAN_PRICES_CENTS[planName as PlanName];

        const reference = `PAY_${userId.substring(0, 8)}_${Date.now()}`;

        // Integrity hash: identical format to the original working version
        const integrityString = `${reference}${amountInCents}COP${integritySecret}`;
        const integrity = await generateIntegrityHash(integrityString);

        console.log(`Order: ${reference} | plan=${planName} | amount=${amountInCents} | integrityPrefix=${integrity.substring(0, 8)}...`);

        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error("Server Error: Supabase credentials missing");
        }

        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify user exists
        const { data: userProfile, error: userError } = await supabase
            .from('profiles')
            .select('id, name, email')
            .eq('id', userId)
            .single();

        if (userError || !userProfile) {
            throw new Error("User verification failed");
        }

        // Create pending transaction
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

        // Read plan limits from app_settings (doesn't affect integrity)
        const planLimits = await getPlanLimits(supabase, planName as PlanName);

        console.log(`Transaction ${reference} saved. Limits: ${JSON.stringify(planLimits)}`);

        return new Response(JSON.stringify({
            reference,
            amountInCents,
            currency: 'COP',
            integrity,
            planName,
            planLimits,
            includesInterview
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (err: any) {
        console.error("Error:", err.message);
        return new Response(JSON.stringify({
            error: err.message,
            status: 'error'
        }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});

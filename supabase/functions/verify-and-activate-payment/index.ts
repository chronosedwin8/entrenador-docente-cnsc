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

console.log("Edge Function: verify-and-activate-payment v1.0");

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');
    if (!supabaseServiceKey) {
        return errorResponse('Service key not configured', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const wompiPublicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    const wompiEnv = Deno.env.get('WOMPI_ENVIRONMENT') || 'sandbox';
    const isProduction = wompiEnv === 'production';
    const primaryBase = isProduction
        ? 'https://production.wompi.co/v1'
        : 'https://sandbox.wompi.co/v1';
    const fallbackBase = isProduction
        ? 'https://sandbox.wompi.co/v1'
        : 'https://production.wompi.co/v1';

    console.log(`verify-and-activate-payment: env=${wompiEnv}, primaryBase=${primaryBase}, publicKeyPrefix=${wompiPublicKey?.substring(0, 12)}`);

    try {
        let body: any = {};
        try {
            const text = await req.text();
            body = text ? JSON.parse(text) : {};
        } catch {
            return errorResponse('Invalid JSON body', 400, corsHeaders);
        }

        const { reference, wompi_transaction_id } = body;

        if (!reference && !wompi_transaction_id) {
            return errorResponse('Provide reference or wompi_transaction_id', 400, corsHeaders);
        }

        // 1. Look up local transaction
        let query = supabase.from('transactions').select('*');
        if (reference) {
            query = query.eq('reference', reference);
        } else {
            query = query.eq('wompi_transaction_id', wompi_transaction_id);
        }
        const { data: localTx, error: txError } = await query.maybeSingle();

        if (txError) {
            console.error('DB error finding transaction:', txError);
            return errorResponse('Database error', 500, corsHeaders);
        }
        if (!localTx) {
            return errorResponse('Transaction not found', 404, corsHeaders);
        }

        // 2. Check idempotency — if already activated, return success immediately
        const { data: profile } = await supabase
            .from('profiles')
            .select('id, subscription_tier')
            .eq('id', localTx.user_id)
            .single();

        if (localTx.status === 'APPROVED' && profile?.subscription_tier === 'premium') {
            console.log(`Transaction ${localTx.reference} already processed (idempotent)`);
            return successResponse({ activated: false, alreadyActive: true }, corsHeaders);
        }

        // 3. Verify payment against Wompi API
        // Defensive: if WOMPI_ENVIRONMENT is misconfigured (e.g. still 'sandbox' after rotating
        // public/integrity keys to production), fall back to the other base URL so the activation
        // still completes. Wompi /transactions accepts the public key as a Bearer token.
        const txRef = localTx.reference;

        async function lookupWompi(baseUrl: string): Promise<any[]> {
            const res = await fetch(
                `${baseUrl}/transactions?reference=${encodeURIComponent(txRef)}`,
                {
                    headers: wompiPublicKey
                        ? { 'Authorization': `Bearer ${wompiPublicKey}` }
                        : {}
                }
            );
            if (!res.ok) {
                const body = await res.text();
                console.warn(`Wompi API error at ${baseUrl}: ${res.status} - ${body}`);
                return [];
            }
            const json = await res.json();
            return json.data || [];
        }

        let wompiTransactions = await lookupWompi(primaryBase);
        let usedBase = primaryBase;
        if (wompiTransactions.length === 0) {
            console.warn(`No transaction at ${primaryBase} — trying fallback ${fallbackBase}`);
            wompiTransactions = await lookupWompi(fallbackBase);
            usedBase = fallbackBase;
        }

        if (wompiTransactions.length === 0) {
            console.error(`Reference ${txRef} not found in either Wompi env`);
            return errorResponse('No Wompi transaction found for this reference', 404, corsHeaders);
        }

        console.log(`Found transaction at ${usedBase} for reference ${txRef}`);

        // Pick the most recent approved, or just the first
        const wompiTx = wompiTransactions.find((t: any) => t.status === 'APPROVED')
            || wompiTransactions[0];

        console.log(`Wompi transaction status: ${wompiTx.status}, local amount: ${localTx.amount_in_cents}, wompi amount: ${wompiTx.amount_in_cents}`);

        if (wompiTx.status !== 'APPROVED') {
            return successResponse({
                activated: false,
                wompiStatus: wompiTx.status,
                message: `Payment status is ${wompiTx.status}`
            }, corsHeaders);
        }

        // 4. Anti-tampering: validate amount matches
        if (wompiTx.amount_in_cents !== localTx.amount_in_cents) {
            console.error(`Amount mismatch: local=${localTx.amount_in_cents} wompi=${wompiTx.amount_in_cents}`);
            await logWebhookError(supabase, {
                source: 'verify-and-activate-payment',
                reference: txRef,
                wompi_transaction_id: wompiTx.id,
                error_message: `Amount mismatch: expected ${localTx.amount_in_cents}, got ${wompiTx.amount_in_cents}`
            });
            return errorResponse('Payment amount mismatch — possible tampering detected', 422, corsHeaders);
        }

        // 5. Get plan limits from app_settings
        const planLimits = await getPlanLimits(supabase, localTx.plan_name as PlanName);

        // 6. Calculate expiration date (1 year from now)
        const expirationDate = new Date();
        expirationDate.setFullYear(expirationDate.getFullYear() + 1);

        // 7. Activate user profile
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
            console.error('Error activating user:', activateError);
            await logWebhookError(supabase, {
                source: 'verify-and-activate-payment',
                reference: txRef,
                wompi_transaction_id: wompiTx.id,
                error_message: `Failed to update profile: ${activateError.message}`
            });
            return errorResponse('Failed to activate premium', 500, corsHeaders);
        }

        // 8. Update transaction record
        await supabase
            .from('transactions')
            .update({
                status: 'APPROVED',
                wompi_transaction_id: wompiTx.id,
                payment_method_type: wompiTx.payment_method_type || wompiTx.payment_method?.type || 'unknown',
                updated_at: new Date().toISOString()
            })
            .eq('id', localTx.id);

        console.log(`✅ User ${localTx.user_id} activated as PREMIUM — plan: ${localTx.plan_name}, limits: daily=${planLimits.daily}, monthly=${planLimits.monthly}, questions=${planLimits.questions}`);

        return successResponse({
            activated: true,
            plan: localTx.plan_name,
            tier: 'premium',
            limits: planLimits,
            expiresAt: expirationDate.toISOString()
        }, corsHeaders);

    } catch (err: any) {
        console.error('Unexpected error in verify-and-activate-payment:', err.message);
        return errorResponse('Internal server error', 500, corsHeaders);
    }
});

async function logWebhookError(supabase: any, data: {
    source: string;
    reference?: string;
    wompi_transaction_id?: string;
    error_message: string;
    payload?: any;
}) {
    const { error } = await supabase.from('webhook_errors').insert(data);
    if (error) console.error('Failed to log webhook error:', error.message);
}

function successResponse(data: any, headers: Record<string, string>): Response {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' }
    });
}

function errorResponse(message: string, status: number, headers?: Record<string, string>): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { ...(headers || {}), 'Content-Type': 'application/json' }
    });
}

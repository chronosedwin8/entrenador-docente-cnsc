// Shared plan limits resolver — reads from app_settings.plan_configurations
// so the values stay in sync with what the admin edits in the UI.

export type PlanName = 'basico' | 'intermedio' | 'avanzado';

export interface PlanLimits {
    daily: number;
    monthly: number;
    questions: number;
}

const FALLBACK_LIMITS: Record<PlanName, PlanLimits> = {
    basico: { daily: 1, monthly: 8, questions: 20 },
    intermedio: { daily: 2, monthly: 20, questions: 30 },
    avanzado: { daily: 3, monthly: 40, questions: 50 }
};

const FALLBACK_PRICES: Record<PlanName, number> = {
    basico: 100000,
    intermedio: 180000,
    avanzado: 300000
};

function planNameToConfigKey(planName: PlanName): 'basic' | 'intermediate' | 'advanced' {
    if (planName === 'basico') return 'basic';
    if (planName === 'intermedio') return 'intermediate';
    return 'advanced';
}

export async function getPlanLimits(supabase: any, planName: PlanName): Promise<PlanLimits> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'plan_configurations')
        .maybeSingle();

    if (error || !data?.value) {
        console.warn('plan_configurations not found in app_settings, using fallback', error?.message);
        return FALLBACK_LIMITS[planName];
    }

    const cfg = data.value[planNameToConfigKey(planName)];
    if (!cfg) {
        console.warn(`plan_configurations missing key for ${planName}, using fallback`);
        return FALLBACK_LIMITS[planName];
    }

    return {
        daily: Number(cfg.daily_sims) || FALLBACK_LIMITS[planName].daily,
        monthly: Number(cfg.monthly_sims) || FALLBACK_LIMITS[planName].monthly,
        questions: Number(cfg.questions_per_sim) || FALLBACK_LIMITS[planName].questions
    };
}

export async function getPlanPriceCOP(supabase: any, planName: PlanName): Promise<number> {
    const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'plan_configurations')
        .maybeSingle();

    if (error || !data?.value) return FALLBACK_PRICES[planName];

    const cfg = data.value[planNameToConfigKey(planName)];
    return Number(cfg?.price) || FALLBACK_PRICES[planName];
}

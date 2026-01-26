import { supabase } from './supabase';

export interface PlanConfig {
    price: number;
    daily_sims: number;
    monthly_sims: number;
    questions_per_sim: number;
}

export interface PlanConfigs {
    basic: PlanConfig;
    intermediate: PlanConfig;
    advanced: PlanConfig;
}

export interface MaintenanceConfig {
    enabled: boolean;
    message: string;
}

export interface InterviewPricingConfig {
    percentage_increase: number;
    included_interviews: number;
}

export interface InfoBarConfig {
    enabled: boolean;
    message: string;
}

export const settingsService = {
    /**
     * Fetches the current plan configurations from app_settings.
     */
    async getPlanConfigs(): Promise<PlanConfigs> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'plan_configurations')
            .single();

        if (error || !data) {
            console.warn("Error fetching plan configs, using defaults", error);
            // Fallback defaults
            return {
                basic: { price: 100000, daily_sims: 1, monthly_sims: 8, questions_per_sim: 20 },
                intermediate: { price: 180000, daily_sims: 2, monthly_sims: 20, questions_per_sim: 30 },
                advanced: { price: 300000, daily_sims: 3, monthly_sims: 40, questions_per_sim: 50 },
            };
        }

        return data.value;
    },

    /**
     * Updates plan configurations.
     */
    async updatePlanConfigs(configs: PlanConfigs): Promise<boolean> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: 'plan_configurations',
                value: configs,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Error updating plan configs:", error);
            return false;
        }
        return true;
    },

    /**
     * Fetches the interview pricing configuration.
     */
    async getInterviewPricingConfig(): Promise<InterviewPricingConfig> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'interview_pricing_config')
            .single();

        if (error || !data) {
            console.warn("Error fetching interview pricing config, using defaults", error);
            return { percentage_increase: 30, included_interviews: 12 };
        }

        return data.value;
    },

    /**
     * Updates interview pricing configuration.
     */
    async updateInterviewPricingConfig(config: InterviewPricingConfig): Promise<boolean> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: 'interview_pricing_config',
                value: config,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Error updating interview pricing config:", error);
            return false;
        }
        return true;
    },

    /**
     * MAINTENANCE MODE
     */
    async getMaintenanceConfig(): Promise<MaintenanceConfig> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'maintenance_config')
            .single();

        if (error || !data) {
            // Default safe fallback (disabled)
            return {
                enabled: false,
                message: "Estamos realizando actualizaciones para mejorar el servicio. Volveremos pronto."
            };
        }
        return data.value;
    },

    async updateMaintenanceConfig(config: MaintenanceConfig): Promise<boolean> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: 'maintenance_config',
                value: config,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Error updating maintenance config:", error);
            return false;
        }
        return true;
    },

    /**
     * INFO BAR CONFIG
     */
    async getInfoBarConfig(): Promise<InfoBarConfig> {
        const { data, error } = await supabase
            .from('app_settings')
            .select('value')
            .eq('key', 'info_bar_config')
            .single();

        if (error || !data) {
            return {
                enabled: false,
                message: ""
            };
        }
        return data.value;
    },

    async updateInfoBarConfig(config: InfoBarConfig): Promise<boolean> {
        const { error } = await supabase
            .from('app_settings')
            .upsert({
                key: 'info_bar_config',
                value: config,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error("Error updating info bar config:", error);
            return false;
        }
        return true;
    }
};

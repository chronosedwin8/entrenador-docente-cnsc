import React, { useEffect, useState } from 'react';
import { settingsService, PlanConfigs, InterviewPricingConfig } from '../services/settingsService';
import { WompiButton } from './WompiButton';

interface PlansViewProps {
    userId?: string; // User ID for payment processing
}

export const PlansView: React.FC<PlansViewProps> = ({ userId }) => {
    const [plans, setPlans] = useState<PlanConfigs | null>(null);
    const [pricingConfig, setPricingConfig] = useState<InterviewPricingConfig | null>(null);
    const [isInterviewEnabled, setIsInterviewEnabled] = useState(false);

    useEffect(() => {
        const loadSettings = async () => {
            const [plansData, pricingData] = await Promise.all([
                settingsService.getPlanConfigs(),
                settingsService.getInterviewPricingConfig()
            ]);
            setPlans(plansData);
            setPricingConfig(pricingData);
        };
        loadSettings();
    }, []);

    // Calculate display price (formatted string)
    const calculateDisplayPrice = (basePrice: number): string => {
        if (!isInterviewEnabled || !pricingConfig) {
            return '$' + (basePrice / 1000).toFixed(0) + 'k';
        }

        const increased = Math.round(basePrice * (1 + (pricingConfig.percentage_increase / 100)));
        const rounded = Math.ceil(increased / 10000) * 10000;

        return '$' + (rounded / 1000).toFixed(0) + 'k';
    };

    // Calculate actual price in COP for payment
    const calculateActualPrice = (basePrice: number): number => {
        if (!isInterviewEnabled || !pricingConfig) {
            return basePrice;
        }

        const increased = Math.round(basePrice * (1 + (pricingConfig.percentage_increase / 100)));
        return Math.ceil(increased / 10000) * 10000;
    };

    const getPlanData = (
        planKey: 'basico' | 'intermedio' | 'avanzado',
        theme: string,
        displayName: string,
        defaultPrice: number,
        recommended: boolean
    ) => {
        const planConfigKey = planKey === 'basico' ? 'basic' : planKey === 'intermedio' ? 'intermediate' : 'advanced';
        const plan = plans ? plans[planConfigKey as keyof PlanConfigs] : null;
        const basePrice = plan?.price || defaultPrice;

        return {
            name: displayName,
            planKey,
            basePrice,
            displayPrice: calculateDisplayPrice(basePrice),
            actualPrice: calculateActualPrice(basePrice),
            period: '/ año',
            features: [
                { label: 'Simulacros / Día', value: plan?.daily_sims?.toString() || '?' },
                { label: 'Simulacros / Mes', value: plan?.monthly_sims?.toString() || '?' },
                { label: 'Preguntas / Simulacro', value: plan?.questions_per_sim?.toString() || '?' }
            ],
            theme,
            recommended
        };
    };

    const displayPlans = [
        getPlanData('basico', 'blue', 'Básico', 100000, false),
        getPlanData('intermedio', 'dark', 'Intermedio', 180000, true),
        getPlanData('avanzado', 'green', 'Avanzado', 300000, false)
    ];

    return (
        <div className="flex-1 overflow-y-auto bg-[#F8FAFC] p-6 lg:p-12">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl lg:text-4xl font-black text-[#0d141c] mb-4">Mejora tu Plan de Estudio</h1>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Desbloquea más simulacros y preguntas para asegurar tu plaza en el Concurso Docente 2026.
                    </p>
                </div>

                {/* Interview Upsell Toggle */}
                <div className="flex justify-center mb-12">
                    <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 pr-6">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                className="sr-only peer"
                                checked={isInterviewEnabled}
                                onChange={(e) => setIsInterviewEnabled(e.target.checked)}
                            />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <div className="text-left">
                            <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                Incluir Entrenamiento de Entrevista con IA
                                <span className="bg-gradient-to-r from-primary to-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">NUEVO</span>
                            </p>
                            <p className="text-xs text-slate-500 max-w-[280px] leading-tight mt-0.5">
                                Aumenta tu entrenamiento con el simulador de entrevistas. Incluye <span className="text-primary font-bold">{pricingConfig?.included_interviews || 12} sesiones</span> con retroalimentación y plan de mejora.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {displayPlans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`bg-white p-8 rounded-3xl shadow-lg border transition-all hover:shadow-xl relative flex flex-col
                                ${plan.theme === 'blue' ? 'border-blue-100 hover:border-blue-200' : ''}
                                ${plan.theme === 'dark' ? 'border-slate-200 scale-105 z-10' : ''}
                                ${plan.theme === 'green' ? 'border-green-100 hover:border-green-200' : ''}
                            `}
                        >
                            {plan.recommended && (
                                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-slate-800 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                                    Más Popular
                                </div>
                            )}

                            <div className="flex items-center gap-3 mb-4">
                                <span className={`material-symbols-outlined text-3xl
                                    ${plan.theme === 'blue' ? 'text-blue-500' : ''}
                                    ${plan.theme === 'dark' ? 'text-slate-800' : ''}
                                    ${plan.theme === 'green' ? 'text-green-500' : ''}
                                `}>
                                    {plan.theme === 'blue' && 'school'}
                                    {plan.theme === 'dark' && 'auto_awesome'}
                                    {plan.theme === 'green' && 'verified'}
                                </span>
                                <h3 className="text-2xl font-bold text-[#0d141c]">{plan.name}</h3>
                            </div>

                            <div className="text-4xl font-black text-[#0d141c] mb-8">
                                {plan.displayPrice} <span className="text-sm font-medium text-slate-400">{plan.period}</span>
                            </div>

                            <div className="space-y-6 mb-8 flex-1">
                                {plan.features.map((feature, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                                            <span>{feature.label}</span>
                                            <span className={`
                                                ${plan.theme === 'green' ? 'text-green-600' : 'text-[#0d141c]'}
                                            `}>{feature.value}</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full
                                                    ${plan.theme === 'blue' ? 'bg-blue-500' : ''}
                                                    ${plan.theme === 'dark' ? 'bg-slate-800' : ''}
                                                    ${plan.theme === 'green' ? 'bg-green-500' : ''}
                                                `}
                                                style={{ width: calculateWidth(feature.label, feature.value) }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {isInterviewEnabled && (
                                    <div className={`flex items-center gap-2 text-xs font-bold p-2 rounded-lg animate-pulse mt-4
                                        ${plan.theme === 'blue' ? 'bg-blue-50 text-blue-600' : ''}
                                        ${plan.theme === 'dark' ? 'bg-slate-100 text-slate-800' : ''}
                                        ${plan.theme === 'green' ? 'bg-green-50 text-green-600' : ''}
                                    `}>
                                        <span className="material-symbols-outlined text-sm">mic</span>
                                        + {pricingConfig?.included_interviews || 12} Entrevistas con IA
                                    </div>
                                )}
                            </div>

                            {/* Payment Button - Use WompiButton if userId is available */}
                            {userId ? (
                                <WompiButton
                                    planName={plan.planKey}
                                    finalPriceCOP={plan.actualPrice}
                                    userId={userId}
                                    includesInterview={isInterviewEnabled}
                                    className={`w-full py-4 rounded-xl font-bold text-center transition-transform hover:-translate-y-1 shadow-md
                                        ${plan.theme === 'blue' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : ''}
                                        ${plan.theme === 'dark' ? 'bg-slate-800 text-white hover:bg-black shadow-slate-300' : ''}
                                        ${plan.theme === 'green' ? 'bg-green-50 text-green-600 hover:bg-green-100' : ''}
                                    `}
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="material-symbols-outlined text-lg">credit_card</span>
                                        Suscribirse Ahora
                                    </span>
                                </WompiButton>
                            ) : (
                                <button
                                    onClick={() => window.location.href = '/?register=true'}
                                    className={`w-full py-4 rounded-xl font-bold text-center transition-transform hover:-translate-y-1 shadow-md
                                        ${plan.theme === 'blue' ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : ''}
                                        ${plan.theme === 'dark' ? 'bg-slate-800 text-white hover:bg-black shadow-slate-300' : ''}
                                        ${plan.theme === 'green' ? 'bg-green-50 text-green-600 hover:bg-green-100' : ''}
                                    `}
                                >
                                    Regístrate para Suscribirte
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Security badges */}
                <div className="mt-12 text-center">
                    <p className="text-xs text-slate-400 mb-4">Pago seguro procesado por</p>
                    <div className="flex items-center justify-center gap-6 opacity-60">
                        <img src="https://www.wompi.co/build/images/logo.svg" alt="Wompi" className="h-6" />
                        <span className="text-xs text-slate-500">• Certificado PCI DSS</span>
                        <span className="text-xs text-slate-500">• Encriptación SSL</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper to determine width of progress bars roughly based on max values
const calculateWidth = (label: string, value: string): string => {
    const val = parseInt(value);
    if (isNaN(val)) return '0%';
    if (label.includes('Día')) return `${Math.min((val / 3) * 100, 100)}%`;
    if (label.includes('Mes')) return `${Math.min((val / 40) * 100, 100)}%`;
    if (label.includes('Preguntas')) return `${Math.min((val / 50) * 100, 100)}%`;
    return '0%';
};

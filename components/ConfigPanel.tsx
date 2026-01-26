import React, { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { UserProfile, ExamConfig, SimulationMode, CompetencyType, UserRole, SimulationResult } from '../types';

interface ConfigPanelProps {
    userProfile: UserProfile;
    onStart: (config: ExamConfig) => void;
    history: SimulationResult[];
    onNavigate?: (tab: 'planes') => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ userProfile, onStart, history, onNavigate }) => {
    const [mode, setMode] = useState<SimulationMode>(SimulationMode.DIAGNOSTICO);
    const [questionCount, setQuestionCount] = useState<number>(10);
    const [competency, setCompetency] = useState<CompetencyType | undefined>(undefined);
    const [forceRefresh, setForceRefresh] = useState<boolean>(false);

    const isPremium = userProfile.subscription_tier === 'premium' || userProfile.system_role === 'admin';

    const checkLimits = () => {
        if (userProfile.system_role === 'admin') return true;

        // Custom override or Tier defaults
        const limitByTier = userProfile.subscription_tier === 'premium' ? 50 : 5;
        const maxQuestions = userProfile.custom_question_limit ?? limitByTier;

        if (questionCount > maxQuestions) {
            toast.error(`Tu límite actual es de ${maxQuestions} preguntas por simulacro. ${userProfile.subscription_tier === 'free' ? '¡Suscríbete a Premium para desbloquear más!' : ''}`);
            return false;
        }

        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0));
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

        const dailyCount = history.filter(h => h.date >= startOfDay).length;
        const monthlyCount = history.filter(h => h.date >= startOfMonth).length;

        // Custom override or Default limits
        const dailyLimit = userProfile.custom_daily_limit ?? 1;
        const monthlyLimit = userProfile.custom_monthly_limit ?? 2;

        if (dailyCount >= dailyLimit) {
            toast.error(`Has alcanzado tu límite diario de ${dailyLimit} simulacro(s). Vuelve mañana.`);
            return false;
        }

        if (monthlyCount >= monthlyLimit) {
            toast.error(`Has alcanzado tu límite mensual de ${monthlyLimit} simulacros.`);
            return false;
        }

        return true;
    };

    const handleStart = () => {
        if (!checkLimits()) return;

        onStart({
            mode,
            questionCount,
            isTimed: mode === SimulationMode.SIMULACRO_COMPLETO || mode === SimulationMode.DIAGNOSTICO,
            selectedCompetency: competency,
            forceRefresh: isPremium ? forceRefresh : false
        });
    };

    const ROLE_COMPETENCY_MAP: Record<UserRole, CompetencyType[]> = {
        [UserRole.DOCENTE_AULA]: [
            CompetencyType.LECTURA_CRITICA,
            CompetencyType.RAZONAMIENTO_CUANTITATIVO,
            CompetencyType.PEDAGOGICA,
            CompetencyType.DISCIPLINAR,
            CompetencyType.PSICOTECNICA,
            CompetencyType.COMPORTAMENTAL
        ],
        [UserRole.RECTOR]: [
            CompetencyType.LECTURA_CRITICA,
            CompetencyType.RAZONAMIENTO_CUANTITATIVO,
            CompetencyType.GESTION_DIRECTIVA,
            CompetencyType.GESTION_ADMINISTRATIVA,
            CompetencyType.GESTION_FINANCIERA,
            CompetencyType.GESTION_ACADEMICA,
            CompetencyType.COMPORTAMENTAL
        ],
        [UserRole.COORDINADOR]: [
            CompetencyType.LECTURA_CRITICA,
            CompetencyType.RAZONAMIENTO_CUANTITATIVO, // "Lógico Cuantitativo"
            CompetencyType.GESTION_ACADEMICA, // "Operativa"
            CompetencyType.CONVIVENCIA_ESCOLAR,
            CompetencyType.EDUCACION_INCLUSIVA, // "Implementación"
            CompetencyType.COMPORTAMENTAL
        ],
        [UserRole.ORIENTADOR]: [
            CompetencyType.LECTURA_CRITICA, // "Casos Psicosociales"
            CompetencyType.ORIENTACION_ESCOLAR,
            CompetencyType.CONVIVENCIA_ESCOLAR,
            CompetencyType.INTERVENCION_PSICOSOCIAL,
            CompetencyType.EDUCACION_INCLUSIVA,
            CompetencyType.COMPORTAMENTAL
        ]
    };

    const availableCompetencies = useMemo(() => {
        return ROLE_COMPETENCY_MAP[userProfile.role] || [];
    }, [userProfile.role]);

    return (
        <div className="flex justify-center py-10 px-4 md:px-10">
            <div className="max-w-5xl w-full flex flex-col gap-6">
                {/* Header */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span>Inicio</span>
                        <span>/</span>
                        <span className="font-bold text-primary">Configuración</span>
                    </div>
                    <h1 className="text-3xl font-black text-[#0d141c]">Diseña tu Estrategia</h1>
                    <p className="text-slate-500">Personaliza la sesión para el perfil de <strong className="text-slate-800">{userProfile.role}{userProfile.role === 'Docente de Aula' && userProfile.area ? ` - ${userProfile.area}` : ''}</strong>.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Modes */}
                    <div className="lg:col-span-2 flex flex-col gap-4">
                        <h3 className="font-bold text-lg">Selecciona el Modo de Preparación</h3>

                        {/* Option 1: Diagnostic */}
                        <button
                            onClick={() => { setMode(SimulationMode.DIAGNOSTICO); setQuestionCount(10); }}
                            className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md flex items-start gap-4 ${mode === SimulationMode.DIAGNOSTICO ? 'border-primary bg-blue-50/50' : 'border-border-light bg-white'}`}
                        >
                            <div className="size-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined">health_and_safety</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0d141c] text-lg">Diagnóstico Inicial</h4>
                                <p className="text-sm text-slate-500 mt-1">Sesión corta (10 preguntas) para identificar fortalezas y debilidades normativas rápidamente.</p>
                            </div>
                            {mode === SimulationMode.DIAGNOSTICO && <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>}
                        </button>

                        {/* Option 2: Full Exam */}
                        <button
                            onClick={() => { setMode(SimulationMode.SIMULACRO_COMPLETO); setQuestionCount(30); }}
                            className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md flex items-start gap-4 ${mode === SimulationMode.SIMULACRO_COMPLETO ? 'border-primary bg-blue-50/50' : 'border-border-light bg-white'}`}
                        >
                            <div className="size-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined">timer</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0d141c] text-lg">Simulacro Tipo CNSC</h4>
                                <p className="text-sm text-slate-500 mt-1">Experiencia realista. Cronómetro activo, mezcla de todas las competencias y retroalimentación al final.</p>
                            </div>
                            {mode === SimulationMode.SIMULACRO_COMPLETO && <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>}
                        </button>

                        {/* Option 3: By Competency */}
                        <button
                            onClick={() => { setMode(SimulationMode.PRACTICA_COMPONENTE); setQuestionCount(15); }}
                            className={`p-6 rounded-xl border-2 text-left transition-all hover:shadow-md flex items-start gap-4 ${mode === SimulationMode.PRACTICA_COMPONENTE ? 'border-primary bg-blue-50/50' : 'border-border-light bg-white'}`}
                        >
                            <div className="size-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined">category</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#0d141c] text-lg">Entrenamiento Focalizado</h4>
                                <p className="text-sm text-slate-500 mt-1">Practica una competencia específica sin límite de tiempo y con feedback inmediato.</p>
                            </div>
                            {mode === SimulationMode.PRACTICA_COMPONENTE && <span className="material-symbols-outlined text-primary ml-auto">check_circle</span>}
                        </button>

                        {/* Premium Upgrade CTA for Free Users */}
                        {!isPremium && (
                            <div className="mt-4 p-6 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl text-white shadow-lg relative overflow-hidden">
                                {/* Decorative Elements */}
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

                                <div className="relative z-10">
                                    <div className="flex items-start gap-4">
                                        <div className="size-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shrink-0">
                                            <span className="material-symbols-outlined text-3xl">rocket_launch</span>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-xl">¡Desbloquea tu Máximo Potencial!</h3>
                                            <p className="text-white/80 text-sm mt-1">
                                                Accede a más simulacros diarios, hasta 50 preguntas por sesión, análisis IA Premium y mucho más.
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => onNavigate?.('planes')}
                                        className="mt-4 w-full py-3 bg-white text-amber-600 font-bold rounded-xl hover:bg-amber-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <span className="material-symbols-outlined">star</span>
                                        Ver Planes Premium
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Details */}
                    <div className="lg:col-span-1 flex flex-col gap-6">
                        <div className="bg-white rounded-xl shadow-sm border border-border-light p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <span className="material-symbols-outlined text-slate-400">tune</span>
                                Parámetros
                            </h3>

                            <div className="flex flex-col gap-6">
                                {mode === SimulationMode.PRACTICA_COMPONENTE && (
                                    <div className="flex flex-col gap-2">
                                        <label className="text-sm font-bold text-[#0d141c]">Competencia Objetivo</label>
                                        <select
                                            className="w-full p-3 rounded-lg border border-slate-300 bg-slate-50 text-sm"
                                            onChange={(e) => setCompetency(e.target.value as CompetencyType)}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>Seleccionar...</option>
                                            {availableCompetencies.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="flex flex-col gap-2">
                                    <div className="flex justify-between">
                                        <label className="text-sm font-bold text-[#0d141c]">Cantidad de Preguntas</label>
                                        <span className="text-sm font-bold text-primary">{questionCount}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="5"
                                        max={mode === SimulationMode.DIAGNOSTICO ? 15 : 50}
                                        step="5"
                                        value={questionCount}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setQuestionCount(val);
                                        }}
                                        className="w-full accent-primary cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-slate-400">
                                        <span>Min: 5</span>
                                        <span>Max: {mode === SimulationMode.DIAGNOSTICO ? 15 : 50}</span>
                                    </div>
                                </div>

                                {/* Premium: Force New Questions */}
                                {isPremium && (
                                    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg border border-amber-200">
                                        <input
                                            type="checkbox"
                                            id="forceRefresh"
                                            checked={forceRefresh}
                                            onChange={(e) => setForceRefresh(e.target.checked)}
                                            className="mt-1 size-4 accent-amber-500 cursor-pointer"
                                        />
                                        <label htmlFor="forceRefresh" className="cursor-pointer">
                                            <span className="text-sm font-bold text-amber-800 flex items-center gap-1">
                                                <span className="material-symbols-outlined text-base">auto_awesome</span>
                                                Generar preguntas nuevas
                                            </span>
                                            <p className="text-xs text-amber-600 mt-1">
                                                Ignora el banco de preguntas y genera con IA en tiempo real.
                                            </p>
                                        </label>
                                    </div>
                                )}

                                <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 flex flex-col gap-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Tiempo estimado:</span>
                                        <span className="font-bold text-[#0d141c]">{Math.ceil(questionCount * 2.5)} min</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Dificultad:</span>
                                        <span className="font-bold text-[#0d141c]">Adaptativa (Media/Alta)</span>
                                    </div>
                                </div>

                                <button
                                    onClick={handleStart}
                                    className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
                                >
                                    <span>Generar Simulacro IA</span>
                                    <span className="material-symbols-outlined">auto_awesome</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

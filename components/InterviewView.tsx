import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserProfile } from '../types';
import { interviewService } from '../services/interviewService';
import { InterviewModal } from './InterviewModal';

interface InterviewViewProps {
    userProfile: UserProfile;
    onNavigateToPlans?: () => void;
}

export const InterviewView: React.FC<InterviewViewProps> = ({ userProfile, onNavigateToPlans }) => {
    const [loading, setLoading] = useState(true);
    const [canInterview, setCanInterview] = useState(false);
    const [nextDate, setNextDate] = useState<Date | undefined>(undefined);
    const [showModal, setShowModal] = useState(false);

    const isPremium = userProfile.subscription_tier === 'premium' || userProfile.system_role === 'admin';

    useEffect(() => {
        if (isPremium) {
            checkEligibility();
        } else {
            setLoading(false);
        }
    }, [userProfile.id, isPremium]);

    const checkEligibility = async () => {
        setLoading(true);
        const result = await interviewService.checkUserEligibility(userProfile.id);
        setCanInterview(result.canInterview);
        setNextDate(result.nextDate);
        setLoading(false);
    };

    const handleStartInterview = async () => {
        // Double check before starting
        if (!canInterview) {
            toast.error("Ya has utilizado tu entrevista de este mes.");
            return;
        }

        const featureEnabled = await interviewService.isFeatureEnabled();
        if (!featureEnabled) {
            toast.error("El módulo de entrevistas está temporalmente deshabilitado por el administrador.");
            return;
        }

        // Check user specific access (redundant but safe)
        if (userProfile.subscription_tier !== 'premium' && userProfile.system_role !== 'admin') {
            toast.error("Función exclusiva para usuarios Premium.");
            return;
        }

        if (userProfile.subscription_tier === 'premium' && !userProfile.has_interview_access && userProfile.system_role !== 'admin') {
            toast.error("No tienes acceso habilitado a este módulo. Contacta a soporte.");
            return;
        }

        // Log the interview start
        const success = await interviewService.logInterviewStart(userProfile.id);
        if (success) {
            setShowModal(true);
            // Immediately mark as used locally
            setCanInterview(false);
            // Optional: set next date logic locally or refetch
            const now = new Date();
            setNextDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
        } else {
            toast.error("Error al iniciar la sesión. Intenta nuevamente.");
        }
    };

    // FREE USER LOCKED VIEW
    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-3xl mx-auto">
                <div className="bg-purple-100 p-6 rounded-full mb-6 relative">
                    <span className="material-symbols-outlined text-6xl text-purple-600">record_voice_over</span>
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
                        PREMIUM
                    </div>
                </div>
                <h2 className="text-3xl font-black text-[#0d141c] mb-4">Simulacro de Entrevista con IA</h2>
                <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                    Prepara tu entrevista docente con una IA conversacional que evalúa tus respuestas en tiempo real.
                    Recibe <strong>feedback inmediato</strong> sobre tu desempeño comunicativo y aprovecha al máximo tu oportunidad.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full text-left">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-purple-600 mb-2"><span className="material-symbols-outlined">mic</span></div>
                        <h3 className="font-bold text-slate-800">Interacción por Voz</h3>
                        <p className="text-sm text-slate-500">Habla naturalmente con la IA como si fuera tu entrevistador.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-purple-600 mb-2"><span className="material-symbols-outlined">psychology</span></div>
                        <h3 className="font-bold text-slate-800">Feedback en Vivo</h3>
                        <p className="text-sm text-slate-500">Recibe evaluación de tus respuestas mientras practicas.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-purple-600 mb-2"><span className="material-symbols-outlined">calendar_month</span></div>
                        <h3 className="font-bold text-slate-800">1 Sesión/Mes</h3>
                        <p className="text-sm text-slate-500">Acceso mensual para practicar y mejorar tu técnica.</p>
                    </div>
                </div>
                <button
                    onClick={() => onNavigateToPlans?.()}
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">upgrade</span>
                    Desbloquear con Premium
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 bg-slate-50 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
                    <div className="inline-flex items-center justify-center p-4 bg-purple-50 rounded-full mb-6 relative">
                        <span className="material-symbols-outlined text-4xl text-purple-600">record_voice_over</span>
                        {userProfile.subscription_tier === 'premium' && (
                            <div className="absolute top-0 right-0 -mt-1 -mr-1 bg-yellow-400 text-yellow-900 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shadow-sm">
                                Premium
                            </div>
                        )}
                    </div>

                    <h1 className="text-3xl font-black text-slate-800 mb-4">Simulacro de Entrevista con IA</h1>

                    <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 leading-relaxed">
                        Practica tus habilidades de comunicación oral en un entorno seguro y realista.
                        Nuestro agente de IA evaluará tus respuestas en tiempo real simulando una entrevista docente.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 max-w-5xl mx-auto text-left">
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-purple-600">timer</span>
                                <span className="font-bold text-slate-700">Tiempo Límite</span>
                            </div>
                            <p className="text-sm text-slate-500">Cada sesión tiene una duración máxima de 8 minutos.</p>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-blue-600">calendar_month</span>
                                <span className="font-bold text-slate-700">Frecuencia</span>
                            </div>
                            <p className="text-sm text-slate-500">Acceso limitado a 1 entrevista por mes calendario.</p>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-green-600">psychology</span>
                                <span className="font-bold text-slate-700">Feedback</span>
                            </div>
                            <p className="text-sm text-slate-500">Interactúa con una IA avanzada entrenada para el contexto educativo.</p>
                        </div>

                        <div className="bg-amber-50 p-5 rounded-xl border border-amber-100">
                            <div className="flex items-center gap-3 mb-2">
                                <span className="material-symbols-outlined text-amber-600">headphones</span>
                                <span className="font-bold text-slate-700">Usa Audífonos</span>
                            </div>
                            <p className="text-sm text-slate-500">
                                <strong>Importante:</strong> Usa audífonos para evitar que la IA escuche su propia voz (eco) y se confunda al hablar.
                            </p>
                        </div>
                    </div>

                    {!canInterview ? (
                        <div className="bg-orange-50 border border-orange-100 rounded-xl p-6 max-w-xl mx-auto">
                            <span className="material-symbols-outlined text-orange-500 text-3xl mb-2">lock_clock</span>
                            <h3 className="font-bold text-orange-800 text-lg mb-1">Has utilizado tu cupo mensual</h3>
                            <p className="text-orange-700">
                                Podrás realizar tu próxima entrevista a partir del:
                            </p>
                            <p className="text-2xl font-black text-orange-800 mt-2">
                                {nextDate?.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <button
                                onClick={handleStartInterview}
                                className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-10 rounded-xl shadow-lg shadow-purple-200 transform hover:scale-105 transition-all text-lg flex items-center justify-center gap-3 mx-auto"
                            >
                                <span className="material-symbols-outlined">play_circle</span>
                                Iniciar Simulacro
                            </button>
                            <p className="text-xs text-slate-400">
                                Al iniciar, se descontará tu cupo del mes actual.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showModal && (
                <InterviewModal onClose={() => setShowModal(false)} />
            )}
        </div>
    );
};

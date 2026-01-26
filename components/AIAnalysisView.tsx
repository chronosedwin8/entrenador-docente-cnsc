import React, { useState } from 'react';
import { UserProfile, SimulationResult } from '../types';
import { generatePerformanceAnalysis, PerformanceAnalysis } from '../services/geminiService';
import { jsPDF } from "jspdf";
import toast from 'react-hot-toast';

interface AIAnalysisViewProps {
    userProfile: UserProfile;
    history: SimulationResult[];
    onNavigateToPlans: () => void;
}

export const AIAnalysisView: React.FC<AIAnalysisViewProps> = ({ userProfile, history, onNavigateToPlans }) => {
    const [loading, setLoading] = useState(false);
    const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
    const [error, setError] = useState<string | null>(null);

    const isPremium = userProfile.subscription_tier === 'premium' || userProfile.system_role === 'admin';

    const calculateStats = () => {
        if (history.length === 0) return { averageScore: 0 };
        const totalScore = history.reduce((acc, curr) => acc + curr.score, 0);
        const averageScore = Math.round(totalScore / history.length);

        // Find weakest area (simple assumption: lowest score simulation competency)
        // Group by competency
        const competencyScores: Record<string, { total: number, count: number }> = {};
        history.forEach(h => {
            const comp = h.targetCompetency || 'General';
            if (!competencyScores[comp]) competencyScores[comp] = { total: 0, count: 0 };
            competencyScores[comp].total += h.score;
            competencyScores[comp].count += 1;
        });

        let weakestArea = '';
        let minAvg = 101;

        Object.entries(competencyScores).forEach(([comp, data]) => {
            const avg = data.total / data.count;
            if (avg < minAvg) {
                minAvg = avg;
                weakestArea = comp;
            }
        });

        return { averageScore, weakestArea };
    };

    const handleAnalyze = async () => {
        if (history.length === 0) {
            toast.error("Debes realizar al menos un simulacro para generar un análisis.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const stats = calculateStats();
            const result = await generatePerformanceAnalysis(userProfile, history, stats);
            setAnalysis(result);
            toast.success("Análisis generado correctamente.");
        } catch (err: any) {
            console.error(err);
            if (err.message === 'LIMIT_REACHED') {
                setError("Has alcanzado el límite diario (1 análisis cada 24 horas). Vuelve mañana para un nuevo seguimiento.");
            } else {
                setError("Ocurrió un error al generar el análisis. Inténtalo de nuevo más tarde.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!analysis) return;

        const doc = new jsPDF();

        // Header
        doc.setFillColor(13, 127, 242); // Primary Blue
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Plan de Mejora Personalizado", 20, 20);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Entrenador Docente CNSC - Coach IA`, 20, 30);

        // User Info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(10);
        doc.text(`Docente: ${userProfile.name}`, 20, 50);
        doc.text(`Rol: ${userProfile.role}`, 20, 55);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 150, 50);

        // Strengths & Weaknesses
        let yPos = 70;

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(39, 174, 96); // Green
        doc.text("Fortalezas Identificadas", 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        analysis.strengths.forEach(s => {
            doc.text(`• ${s}`, 25, yPos);
            yPos += 5;
        });

        yPos += 10;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(192, 57, 43); // Red
        doc.text("Áreas de Mejora (Debilidades)", 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        analysis.weaknesses.forEach(w => {
            doc.text(`• ${w}`, 25, yPos);
            yPos += 5;
        });

        // Recommendations
        yPos += 10;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(13, 127, 242); // Blue
        doc.text("Recomendaciones Estratégicas", 20, yPos);
        yPos += 7;
        doc.setFontSize(10);
        doc.setTextColor(60, 60, 60);
        doc.setFont("helvetica", "normal");
        analysis.recommendations.forEach(r => {
            // Simple word wrapping logic could be needed if text is long, but assuming short bullets for now
            const splitText = doc.splitTextToSize(`• ${r}`, 170);
            doc.text(splitText, 25, yPos);
            yPos += (splitText.length * 5) + 2;
        });

        // Study Plan
        yPos += 10;
        // Check page break
        if (yPos > 240) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        doc.text("Plan de Trabajo (Semanal)", 20, yPos);
        yPos += 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);

        const splitPlan = doc.splitTextToSize(analysis.study_plan_summary, 170);
        doc.text(splitPlan, 20, yPos);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text("Generado por Inteligencia Artificial - Entrenador Docente CNSC", 105, 290, { align: 'center' });

        doc.save(`Plan_Mejora_${userProfile.name.replace(/\s+/g, '_')}.pdf`);
        toast.success("Descarga iniciada.");
    };

    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center max-w-3xl mx-auto">
                <div className="bg-amber-100 p-6 rounded-full mb-6 relative">
                    <span className="material-symbols-outlined text-6xl text-amber-600">psychology</span>
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
                        PREMIUM
                    </div>
                </div>
                <h2 className="text-3xl font-black text-[#0d141c] mb-4">Coach IA: Tu Analista Personal</h2>
                <p className="text-slate-600 text-lg mb-8 leading-relaxed">
                    Obtén un diagnóstico profundo de tu desempeño. Nuestra IA analiza cada simulacro, identifica tus brechas de conocimiento normativo o disciplinar, y diseña un <strong>Plan de Estudio PDF</strong> personalizado para que apruebes el concurso.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 w-full text-left">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-primary mb-2"><span className="material-symbols-outlined">query_stats</span></div>
                        <h3 className="font-bold text-slate-800">Análisis de Datos</h3>
                        <p className="text-sm text-slate-500">Detectamos patrones en tus errores que tú no ves.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-primary mb-2"><span className="material-symbols-outlined">gavel</span></div>
                        <h3 className="font-bold text-slate-800">Enfoque Legal</h3>
                        <p className="text-sm text-slate-500">Te decimos qué leyes específicas debes repasar.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <div className="text-primary mb-2"><span className="material-symbols-outlined">picture_as_pdf</span></div>
                        <h3 className="font-bold text-slate-800">Plan Descargable</h3>
                        <p className="text-sm text-slate-500">Lleva tu hoja de ruta contigo a donde quieras.</p>
                    </div>
                </div>
                <button
                    onClick={onNavigateToPlans}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">upgrade</span>
                    Desbloquear con Premium
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-[#0d141c] flex items-center gap-3">
                        <span className="material-symbols-outlined text-4xl text-primary">psychology</span>
                        Coach Inteligente
                    </h1>
                    <p className="text-slate-500">Análisis de desempeño y plan de mejora diario.</p>
                </div>
                {analysis && (
                    <button
                        onClick={handleDownloadPDF}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-red-700 transition-colors flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined">download</span>
                        Descargar PDF
                    </button>
                )}
            </div>

            {/* Main Content */}
            {!analysis && (
                <div className="bg-white rounded-2xl shadow-sm border border-border-light p-8 text-center">
                    {!loading ? (
                        <>
                            <div className="mb-6">
                                <span className="material-symbols-outlined text-6xl text-primary/20">analytics</span>
                            </div>
                            <h2 className="text-xl font-bold text-[#0d141c] mb-2">¿Listo para tu diagnóstico de hoy?</h2>
                            <p className="text-slate-500 mb-6 max-w-md mx-auto">
                                La IA analizará tus últimos {history.length} simulacros para generar un plan de acción.
                                <br />
                                <span className="text-xs text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded mt-2 inline-block">
                                    Límite: 1 análisis cada 24 horas
                                </span>
                            </p>

                            {error ? (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 max-w-lg mx-auto flex items-center gap-2 text-left">
                                    <span className="material-symbols-outlined text-2xl shrink-0">event_busy</span>
                                    <p className="text-sm font-medium">{error}</p>
                                </div>
                            ) : null}

                            <button
                                onClick={handleAnalyze}
                                className="bg-primary text-white px-8 py-3 rounded-xl font-bold text-lg shadow-md hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2 mx-auto"
                            >
                                <span className="material-symbols-outlined">auto_fix_high</span>
                                Analizar mi Desempeño
                            </button>
                        </>
                    ) : (
                        <div className="py-10 flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                            <p className="text-slate-600 font-medium animate-pulse">Analizando tus respuestas...</p>
                            <p className="text-slate-400 text-xs mt-2">Consultando normatividad vigente...</p>
                        </div>
                    )}
                </div>
            )}

            {/* Results View */}
            {analysis && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Strengths */}
                        <div className="bg-green-50 rounded-xl p-6 border border-green-100">
                            <h3 className="flex items-center gap-2 font-bold text-green-800 mb-4">
                                <span className="material-symbols-outlined">thumb_up</span>
                                Fortalezas
                            </h3>
                            <ul className="space-y-2">
                                {analysis.strengths.map((s, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-green-900">
                                        <span className="text-green-500 mt-0.5">•</span>
                                        {s}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="bg-red-50 rounded-xl p-6 border border-red-100">
                            <h3 className="flex items-center gap-2 font-bold text-red-800 mb-4">
                                <span className="material-symbols-outlined">warning</span>
                                A Mejorar
                            </h3>
                            <ul className="space-y-2">
                                {analysis.weaknesses.map((w, i) => (
                                    <li key={i} className="flex items-start gap-2 text-sm text-red-900">
                                        <span className="text-red-500 mt-0.5">•</span>
                                        {w}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Recommendations & Strategy */}
                    <div className="bg-white rounded-xl shadow-sm border border-border-light overflow-hidden">
                        <div className="bg-slate-50 p-4 border-b border-border-light flex justify-between items-center">
                            <h3 className="font-bold text-[#0d141c] flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">strategy</span>
                                Estrategia Personalizada
                            </h3>
                        </div>
                        <div className="p-6">
                            <div className="mb-6">
                                <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Recomendaciones Clave</h4>
                                <div className="grid gap-3">
                                    {analysis.recommendations.map((rec, i) => (
                                        <div key={i} className="flex items-start gap-3 bg-blue-50/50 p-3 rounded-lg">
                                            <span className="material-symbols-outlined text-primary text-sm mt-0.5">check_circle</span>
                                            <p className="text-slate-700 text-sm">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <h4 className="text-sm font-bold text-slate-500 uppercase mb-3">Resumen Plan de Estudio</h4>
                                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 text-sm whitespace-pre-line leading-relaxed">
                                    {analysis.study_plan_summary}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Legal Focus */}
                    <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                        <h3 className="flex items-center gap-2 font-bold text-indigo-800 mb-4">
                            <span className="material-symbols-outlined">library_books</span>
                            Normativa Sugerida
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {analysis.legal_focus.map((law, i) => (
                                <span key={i} className="px-3 py-1 bg-white text-indigo-600 rounded-full text-xs font-bold shadow-sm border border-indigo-100">
                                    {law}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

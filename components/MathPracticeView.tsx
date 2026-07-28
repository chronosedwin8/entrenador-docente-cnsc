import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import toast from 'react-hot-toast';
import { generateMathExercises, MathExercise } from '../services/geminiService';

interface Topic {
    id: string;
    label: string;
    icon: string;
}

const TOPICS: Topic[] = [
    { id: 'fracciones', label: 'Fracciones', icon: 'pie_chart' },
    { id: 'porcentajes', label: 'Porcentajes', icon: 'percent' },
    { id: 'decimales', label: 'Decimales', icon: 'more_horiz' },
    { id: 'operaciones_basicas', label: 'Operaciones básicas', icon: 'calculate' },
    { id: 'razones_proporciones', label: 'Razones y proporciones', icon: 'balance' },
    { id: 'regla_tres_simple', label: 'Regla de tres simple', icon: 'function' },
    { id: 'regla_tres_compuesta', label: 'Regla de tres compuesta', icon: 'functions' },
    { id: 'series_numericas', label: 'Series numéricas', icon: 'trending_up' },
    { id: 'completar_series', label: 'Completar series', icon: 'more_horiz' },
    { id: 'lenguaje_matematico', label: 'Lenguaje matemático', icon: 'translate' },
    { id: 'edades', label: 'Problemas de edades', icon: 'cake' },
    { id: 'moviles_tiempos', label: 'Móviles y tiempos', icon: 'directions_car' },
    { id: 'tablas_graficos', label: 'Tablas y gráficos estadísticos', icon: 'bar_chart' },
];

const DIFFICULTIES = ['Básico', 'Intermedio', 'Avanzado'] as const;

interface MathPracticeViewProps {
    isPremium?: boolean;
    onNavigateToPlans?: () => void;
}

export const MathPracticeView: React.FC<MathPracticeViewProps> = ({ isPremium = false, onNavigateToPlans }) => {
    const [topic, setTopic] = useState<Topic | null>(null);
    const [difficulty, setDifficulty] = useState<typeof DIFFICULTIES[number]>('Básico');
    const [loading, setLoading] = useState(false);
    const [exercises, setExercises] = useState<MathExercise[]>([]);
    const [showSolutions, setShowSolutions] = useState(false);

    const handleGenerate = async () => {
        if (!topic) {
            toast.error('Selecciona primero un tema.');
            return;
        }
        setLoading(true);
        setExercises([]);
        setShowSolutions(false);
        try {
            const result = await generateMathExercises(topic.id, topic.label, difficulty, 10);
            setExercises(result);
            toast.success(`${result.length} ejercicios generados.`);
        } catch (error: any) {
            console.error('Error generando ejercicios:', error);
            toast.error(error?.message || 'No se pudieron generar los ejercicios.');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (exercises.length === 0 || !topic) return;

        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const margin = 15;
        const maxW = pageW - margin * 2;
        let y = margin;

        const ensureSpace = (needed: number) => {
            if (y + needed > pageH - margin) {
                doc.addPage();
                y = margin;
            }
        };

        const writeWrapped = (text: string, size: number, style: 'normal' | 'bold' = 'normal', color: [number, number, number] = [30, 30, 30]) => {
            doc.setFont('helvetica', style);
            doc.setFontSize(size);
            doc.setTextColor(...color);
            const lines = doc.splitTextToSize(text, maxW);
            for (const line of lines) {
                ensureSpace(size * 0.5);
                doc.text(line, margin, y);
                y += size * 0.5;
            }
        };

        // Encabezado
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, pageW, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('Ejercicios de Aptitud Numérica', margin, 14);
        y = 30;

        writeWrapped(`Tema: ${topic.label}`, 12, 'bold', [37, 99, 235]);
        writeWrapped(`Nivel: ${difficulty}  |  Fecha: ${new Date().toLocaleDateString('es-CO')}`, 10, 'normal', [110, 110, 110]);
        y += 4;

        // Ejercicios
        exercises.forEach((ex, i) => {
            ensureSpace(20);
            y += 2;
            writeWrapped(`${i + 1}. ${ex.statement}`, 11, 'bold');
            y += 1;
            (ex.options || []).forEach(opt => writeWrapped(opt, 10, 'normal', [60, 60, 60]));
            y += 3;
        });

        // Soluciones en página aparte
        doc.addPage();
        y = margin;
        doc.setFillColor(22, 163, 74);
        doc.rect(0, 0, pageW, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(15);
        doc.text('Soluciones', margin, 14);
        y = 30;

        exercises.forEach((ex, i) => {
            ensureSpace(20);
            y += 2;
            writeWrapped(`${i + 1}. Respuesta correcta: ${ex.answer}`, 11, 'bold', [22, 163, 74]);
            y += 1;
            writeWrapped(ex.solution || '', 10, 'normal', [60, 60, 60]);
            y += 3;
        });

        // Pie de página
        const pageCount = doc.getNumberOfPages();
        for (let p = 1; p <= pageCount; p++) {
            doc.setPage(p);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text('Entrenador Docente CNSC - Fundales', margin, pageH - 8);
            doc.text(`Página ${p} de ${pageCount}`, pageW - margin - 25, pageH - 8);
        }

        doc.save(`Ejercicios_${topic.label.replace(/\s+/g, '_')}_${difficulty}.pdf`);
        toast.success('PDF descargado.');
    };

    const letterOf = (answer: string) => (answer || '').trim().charAt(0).toUpperCase();

    // Bloqueo para usuarios no Premium.
    if (!isPremium) {
        return (
            <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-12">
                <div className="bg-amber-100 p-6 rounded-full mb-6 relative">
                    <span className="material-symbols-outlined text-6xl text-amber-600">workspace_premium</span>
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md animate-bounce">
                        PREMIUM
                    </div>
                </div>
                <h2 className="text-2xl font-black text-[#0d141c] mb-3">Ejercicios de Matemáticas con IA</h2>
                <p className="text-slate-600 mb-8 leading-relaxed">
                    Genera <strong>ejercicios ilimitados</strong> de aptitud numérica sobre el tema que quieras
                    (fracciones, porcentajes, regla de tres, series y más), con soluciones paso a paso y
                    descarga en PDF para practicar donde quieras.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 w-full text-left">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-amber-600 mb-1">auto_awesome</span>
                        <h3 className="font-bold text-slate-800 text-sm">13 temas</h3>
                        <p className="text-xs text-slate-500">Elige exactamente lo que necesitas reforzar.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-amber-600 mb-1">lightbulb</span>
                        <h3 className="font-bold text-slate-800 text-sm">Soluciones paso a paso</h3>
                        <p className="text-xs text-slate-500">Aprende el procedimiento, no solo la respuesta.</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                        <span className="material-symbols-outlined text-amber-600 mb-1">picture_as_pdf</span>
                        <h3 className="font-bold text-slate-800 text-sm">Descarga en PDF</h3>
                        <p className="text-xs text-slate-500">Practica sin conexión e imprime tus hojas.</p>
                    </div>
                </div>
                <button
                    onClick={() => onNavigateToPlans?.()}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-outlined">upgrade</span>
                    Desbloquear con Premium
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Selección de tema */}
            <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6">
                <h3 className="font-bold text-[#0d141c] mb-1 flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">quiz</span>
                    Genera ejercicios de práctica con IA
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    Elige un tema y un nivel; la IA te propondrá 10 ejercicios de opción múltiple con sus soluciones.
                </p>

                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">1. Tema</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mb-5">
                    {TOPICS.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTopic(t)}
                            className={`flex items-center gap-2 p-3 rounded-xl border text-left text-sm font-medium transition-all ${topic?.id === t.id
                                ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/20'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <span className="material-symbols-outlined text-lg">{t.icon}</span>
                            <span className="leading-tight">{t.label}</span>
                        </button>
                    ))}
                </div>

                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">2. Nivel</label>
                <div className="flex gap-2 mb-5">
                    {DIFFICULTIES.map(d => (
                        <button
                            key={d}
                            onClick={() => setDifficulty(d)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${difficulty === d
                                ? 'bg-primary text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {d}
                        </button>
                    ))}
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading || !topic}
                    className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <span className="material-symbols-outlined animate-spin">progress_activity</span>
                            Generando ejercicios...
                        </>
                    ) : (
                        <>
                            <span className="material-symbols-outlined">auto_awesome</span>
                            Generar 10 ejercicios
                        </>
                    )}
                </button>
            </div>

            {/* Resultados */}
            {exercises.length > 0 && (
                <div className="bg-white rounded-2xl border border-border-light shadow-sm p-6">
                    <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
                        <h3 className="font-bold text-[#0d141c] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">assignment</span>
                            {topic?.label} · {difficulty} · {exercises.length} ejercicios
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowSolutions(s => !s)}
                                className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-lg">{showSolutions ? 'visibility_off' : 'lightbulb'}</span>
                                {showSolutions ? 'Ocultar soluciones' : 'Ver soluciones'}
                            </button>
                            <button
                                onClick={handleDownloadPDF}
                                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors flex items-center gap-1.5"
                            >
                                <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                                Descargar PDF
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-5">
                        {exercises.map((ex, i) => (
                            <div key={i} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                                <p className="font-bold text-[#0d141c] mb-3">
                                    <span className="text-primary">{i + 1}.</span> {ex.statement}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {(ex.options || []).map((opt, oi) => {
                                        const optLetter = opt.trim().charAt(0).toUpperCase();
                                        const isCorrect = showSolutions && optLetter === letterOf(ex.answer);
                                        return (
                                            <div
                                                key={oi}
                                                className={`px-3 py-2 rounded-lg text-sm border ${isCorrect
                                                    ? 'bg-green-50 border-green-300 text-green-800 font-bold'
                                                    : 'bg-slate-50 border-slate-100 text-slate-700'
                                                    }`}
                                            >
                                                {opt}
                                                {isCorrect && <span className="material-symbols-outlined text-base align-middle ml-1">check_circle</span>}
                                            </div>
                                        );
                                    })}
                                </div>
                                {showSolutions && (
                                    <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-900">
                                        <span className="font-bold">Solución (Resp. {ex.answer}): </span>
                                        {ex.solution}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { SimulationResult, Question, CompetencyType } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ResultsDashboardProps {
    result: SimulationResult;
    questions: Question[];
    onRestart?: () => void;
    isHistoryMode?: boolean; // If true, hide restart button and adjust title
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ result, questions, onRestart, isHistoryMode = false }) => {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfProgress, setPdfProgress] = useState(0);

    // Calculate analytics
    const competencyStats = Object.values(CompetencyType).map(comp => {
        const compQuestions = questions.filter(q => q.competency === comp);
        if (compQuestions.length === 0) return null;

        const correctCount = result.answers.filter(a => {
            const q = questions.find(qu => qu.id === a.questionId);
            return q?.competency === comp && a.isCorrect;
        }).length;

        return {
            name: comp, // Use full name here
            total: compQuestions.length,
            correct: correctCount,
            percentage: Math.round((correctCount / compQuestions.length) * 100)
        };
    }).filter(Boolean);

    const percentage = Math.round((result.correctCount / result.totalQuestions) * 100);
    let feedbackMessage = "";
    if (percentage >= 90) feedbackMessage = "¡Excelente desempeño! Estás listo para el concurso.";
    else if (percentage >= 70) feedbackMessage = "Buen trabajo. Refuerza las competencias débiles.";
    else feedbackMessage = "Se requiere mayor estudio de la normativa y casos.";

    const handleDownloadPDF = async () => {
        if (!reportRef.current) return;
        setIsGeneratingPdf(true);
        setPdfProgress(0);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const contentWidth = pageWidth - (2 * margin);
            let currentY = margin;

            // Helper to add canvas to PDF
            const addCanvasToPdf = (canvas: HTMLCanvasElement) => {
                const imgData = canvas.toDataURL('image/png');
                const imgHeight = (canvas.height * contentWidth) / canvas.width;

                // Check if we need a new page
                if (currentY + imgHeight > pageHeight - margin) {
                    pdf.addPage();
                    currentY = margin;
                }

                pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
                currentY += imgHeight + 2; // small gap
            };

            // 1. Render Summary Section
            const summaryEl = reportRef.current.querySelector('#report-summary') as HTMLElement;
            if (summaryEl) {
                const canvas = await html2canvas(summaryEl, { scale: 1.5, backgroundColor: '#ffffff' });
                addCanvasToPdf(canvas);
            }

            // 2. Render List Header
            const headerEl = reportRef.current.querySelector('#report-list-header') as HTMLElement;
            if (headerEl) {
                const canvas = await html2canvas(headerEl, { scale: 1.5, backgroundColor: '#ffffff' });
                addCanvasToPdf(canvas);
            }

            // 3. Render Questions individually to avoid Max Canvas Size error
            const questionEls = reportRef.current.querySelectorAll('.report-question-item');
            const totalQs = questionEls.length;

            for (let i = 0; i < totalQs; i++) {
                const qEl = questionEls[i] as HTMLElement;
                // Update progress
                setPdfProgress(Math.round(((i + 1) / totalQs) * 100));

                // Allow UI to update
                await new Promise(r => setTimeout(r, 10));

                const canvas = await html2canvas(qEl, { scale: 1.5, backgroundColor: '#ffffff' });
                addCanvasToPdf(canvas);
            }

            pdf.save(`Reporte_CNSC_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("PDF Generation error", e);
            toast.error("Error generando el PDF. Por favor intenta de nuevo o reduce el número de preguntas.");
        } finally {
            setIsGeneratingPdf(false);
            setPdfProgress(0);
        }
    };

    return (
        <div className="flex flex-col items-center py-10 px-4 md:px-10 max-w-6xl mx-auto w-full">
            <div className="flex justify-between items-center w-full mb-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0d141c] mb-2">{isHistoryMode ? 'Revisión Histórica' : 'Resultados del Simulacro'}</h1>
                    <p className="text-slate-500">Análisis detallado de tu desempeño alineado con CNSC.</p>
                </div>
                <button
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                    {isGeneratingPdf ? (
                        <div className="flex items-center gap-2">
                            <span className="size-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span>
                            <span className="text-xs">{pdfProgress}%</span>
                        </div>
                    ) : (
                        <>
                            <span className="material-symbols-outlined text-lg">picture_as_pdf</span>
                            <span>Guardar Reporte</span>
                        </>
                    )}
                </button>
            </div>

            {/* Report Container (captured for PDF) */}
            <div ref={reportRef} className="w-full bg-background-light p-4 md:p-8 rounded-xl">
                <div id="report-summary" className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-8">
                    {/* Main Score Card */}
                    <div className="bg-white p-8 rounded-2xl border border-border-light shadow-md flex flex-col items-center justify-center text-center col-span-1 md:col-span-1">
                        <div className="relative size-40 flex items-center justify-center">
                            <svg className="size-full transform -rotate-90">
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-100" />
                                <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="12" fill="transparent" className={percentage >= 70 ? "text-green-500" : "text-amber-500"} strokeDasharray={440} strokeDashoffset={440 - (440 * percentage) / 100} strokeLinecap="round" />
                            </svg>
                            <div className="absolute flex flex-col items-center">
                                <span className="text-4xl font-black text-[#0d141c]">{percentage}%</span>
                                <span className="text-xs font-bold text-slate-400 uppercase">Puntaje Global</span>
                            </div>
                        </div>
                        <p className="mt-6 font-medium text-slate-700">{feedbackMessage}</p>
                        <div className="text-xs text-slate-400 mt-2">
                            Fecha: {new Date(result.date).toLocaleDateString()}
                        </div>
                    </div>

                    {/* Chart Card */}
                    <div className="bg-white p-6 rounded-2xl border border-border-light shadow-md col-span-1 md:col-span-2 flex flex-col">
                        <h3 className="font-bold text-lg mb-4">Desempeño por Competencia</h3>
                        {/* Fixed height container using absolute positioning strategy to fix Recharts width(-1) error */}
                        <div className="w-full h-[300px] relative">
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={competencyStats} layout="vertical" margin={{ left: 10 }}>
                                        <XAxis type="number" domain={[0, 100]} hide />
                                        <YAxis dataKey="name" type="category" width={220} tick={{ fontSize: 11, fontWeight: 600 }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            cursor={{ fill: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={20}>
                                            {competencyStats!.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.percentage >= 70 ? '#10b981' : '#f59e0b'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Breakdown List */}
                <div className="w-full bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden mb-8">
                    <div id="report-list-header" className="p-4 bg-slate-50 border-b border-border-light font-bold text-slate-700 flex justify-between items-center">
                        <span>Detalle de Respuestas y Retroalimentación Pedagógica</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {result.answers.map((ans, idx) => {
                            const question = questions.find(q => q.id === ans.questionId);
                            if (!question) return null;

                            const selectedOptionText = question.options.find(o => o.id === ans.selectedOptionId)?.text;
                            const correctOptionText = question.options.find(o => o.id === question.correctOptionId)?.text;

                            return (
                                <div key={idx} className="report-question-item p-6 flex flex-col gap-4 hover:bg-slate-50 transition-colors break-inside-avoid">
                                    <div className="flex items-start gap-4">
                                        <div className={`size-8 rounded-full flex items-center justify-center font-bold text-white shrink-0 ${ans.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-[#0d141c] mb-2 text-lg">{question.text}</p>
                                            {question.context && <p className="text-sm text-slate-500 italic mb-2 bg-slate-50 p-2 rounded border border-slate-100">{question.context}</p>}

                                            <div className="flex flex-wrap gap-2 text-xs mb-3">
                                                <span className="px-2 py-1 rounded bg-blue-50 text-primary border border-blue-100 font-bold">
                                                    {question.competency}
                                                </span>
                                                <span className="px-2 py-1 rounded bg-slate-100 text-slate-500 border border-slate-200">
                                                    Norma: {question.normative.law} - {question.normative.article}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-12">
                                        <div className={`p-3 rounded-lg border ${ans.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                            <span className={`text-xs font-bold uppercase block mb-1 ${ans.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                                Tu Respuesta ({ans.selectedOptionId}):
                                            </span>
                                            <span className="text-sm text-slate-800">{selectedOptionText}</span>
                                        </div>

                                        {!ans.isCorrect && (
                                            <div className="p-3 rounded-lg border bg-green-50 border-green-200">
                                                <span className="text-xs font-bold uppercase block mb-1 text-green-700">
                                                    Respuesta Correcta ({question.correctOptionId}):
                                                </span>
                                                <span className="text-sm text-slate-800">{correctOptionText}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="ml-12 mt-2 p-4 bg-slate-50 border-l-4 border-primary rounded-r-lg">
                                        <h4 className="text-xs font-bold text-primary uppercase mb-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-sm">psychology</span>
                                            Retroalimentación Pedagógica y Legal
                                        </h4>
                                        <p className="text-sm text-slate-700 leading-relaxed text-justify">
                                            {question.normative.explanation}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {!isHistoryMode && onRestart && (
                <button
                    onClick={onRestart}
                    className="px-8 py-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all"
                >
                    Iniciar Nuevo Simulacro
                </button>
            )}
        </div>
    );
};
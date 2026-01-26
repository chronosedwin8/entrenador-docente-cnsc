import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend, Cell } from 'recharts';
import { SimulationResult, CompetencyType, SimulationMode } from '../types';
import { ResultsDashboard } from './ResultsDashboard';

interface GlobalStatsViewProps {
  history: SimulationResult[];
}

export const GlobalStatsView: React.FC<GlobalStatsViewProps> = ({ history }) => {
    const [selectedAttempt, setSelectedAttempt] = useState<SimulationResult | null>(null);

    // --- Data Processing ---

    // 1. Separate History by Mode
    const diagnosticsData = history
        .filter(h => h.mode === SimulationMode.DIAGNOSTICO || (!h.mode && h.totalQuestions <= 15))
        .map((res, i) => ({
            attempt: `D-${i + 1}`,
            score: Math.round(res.score),
            date: new Date(res.date).toLocaleDateString()
        }));

    const simulacroData = history
        .filter(h => h.mode === SimulationMode.SIMULACRO_COMPLETO || (!h.mode && h.totalQuestions > 15))
        .map((res, i) => ({
            attempt: `S-${i + 1}`,
            score: Math.round(res.score),
            date: new Date(res.date).toLocaleDateString()
        }));

    // 2. Competency Aggregation (Consolidated strict logic)
    const competencyAgg: Record<string, { correct: number, total: number }> = {};
    
    // Initialize strictly with known types
    const validCompetencies = Object.values(CompetencyType);
    validCompetencies.forEach(c => {
        competencyAgg[c] = { correct: 0, total: 0 };
    });

    // Helper to map AI sub-variations to main categories
    const normalizeCompetency = (input: string): CompetencyType | null => {
        const lower = input.toLowerCase();
        // Check exact match first
        if (validCompetencies.includes(input as CompetencyType)) return input as CompetencyType;

        // Fuzzy matching logic
        if (lower.includes('pedag') || lower.includes('didáct') || lower.includes('curricular') || lower.includes('evaluación')) return CompetencyType.PEDAGOGICA;
        if (lower.includes('comportamental') || lower.includes('liderazgo') || lower.includes('ética')) return CompetencyType.COMPORTAMENTAL;
        if (lower.includes('lectura') || lower.includes('crítica') || lower.includes('textual')) return CompetencyType.LECTURA_CRITICA;
        if (lower.includes('cuantitativo') || lower.includes('matem') || lower.includes('numéric')) return CompetencyType.RAZONAMIENTO_CUANTITATIVO;
        if (lower.includes('psicot')) return CompetencyType.PSICOTECNICA;
        if (lower.includes('específ') || lower.includes('disciplinar') || lower.includes('conocimiento')) return CompetencyType.DISCIPLINAR;
        
        return null; // Ignore unknown or too specific tags
    };

    history.forEach(result => {
        if (result.questions && result.questions.length > 0) {
            result.answers.forEach(ans => {
                const q = result.questions.find(q => q.id === ans.questionId);
                if (q && q.competency) {
                    const normalizedKey = normalizeCompetency(q.competency);
                    if (normalizedKey) {
                        competencyAgg[normalizedKey].total += 1;
                        if (ans.isCorrect) competencyAgg[normalizedKey].correct += 1;
                    }
                }
            });
        }
    });

    const competencyChartData = Object.keys(competencyAgg)
        .map(key => {
            const data = competencyAgg[key];
            return {
                name: key,
                percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
                count: data.total
            };
        })
        .filter(d => d.count > 0) // Only show competencies with data
        .sort((a, b) => b.percentage - a.percentage);


    // 3. KPIs
    const totalSimulations = history.length;
    const avgScore = totalSimulations > 0 
        ? Math.round(history.reduce((acc, curr) => acc + curr.score, 0) / totalSimulations) 
        : 0;
    const bestScore = totalSimulations > 0 
        ? Math.max(...history.map(h => h.score)).toFixed(0) 
        : "0";


    if (selectedAttempt) {
        if (!selectedAttempt.questions || selectedAttempt.questions.length === 0) {
            return (
                 <div className="flex flex-col items-center py-10 px-4">
                    <div className="max-w-md text-center">
                        <span className="material-symbols-outlined text-4xl text-amber-500 mb-4">warning</span>
                        <h2 className="text-xl font-bold mb-2">Detalle no disponible</h2>
                        <p className="text-slate-500 mb-6">Este simulacro es antiguo y no contiene el registro detallado de las preguntas.</p>
                        <button 
                            onClick={() => setSelectedAttempt(null)}
                            className="px-6 py-2 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300"
                        >
                            Volver al Historial
                        </button>
                    </div>
                 </div>
            );
        }

        return (
            <div className="animate-fade-in relative">
                <button 
                    onClick={() => setSelectedAttempt(null)}
                    className="absolute top-10 left-4 md:left-10 z-10 flex items-center gap-2 text-slate-500 hover:text-primary font-medium bg-white/80 backdrop-blur px-3 py-1 rounded-full border border-slate-200 shadow-sm"
                >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Volver
                </button>
                <ResultsDashboard 
                    result={selectedAttempt} 
                    questions={selectedAttempt.questions} 
                    isHistoryMode={true}
                />
            </div>
        );
    }
    
    return (
        <div className="flex flex-col items-center py-10 px-4 md:px-10 max-w-6xl mx-auto w-full gap-8">
            <div className="text-center max-w-2xl">
                <h1 className="text-3xl font-black text-[#0d141c] mb-2">Tablero de Control</h1>
                <p className="text-slate-500">Analítica segmentada por tipo de prueba y competencias.</p>
            </div>

            {history.length === 0 ? (
                <div className="w-full py-20 bg-white rounded-2xl border border-border-light flex flex-col items-center justify-center text-center">
                    <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                        <span className="material-symbols-outlined text-4xl">bar_chart</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#0d141c]">Aún no hay datos</h3>
                    <p className="text-slate-500 max-w-md mt-2">Realiza tu primer simulacro para comenzar a ver tu curva de aprendizaje.</p>
                </div>
            ) : (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm flex items-center gap-4">
                            <div className="size-14 rounded-full bg-blue-50 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl">history</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Pruebas Totales</p>
                                <p className="text-2xl font-black text-[#0d141c]">{totalSimulations}</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm flex items-center gap-4">
                            <div className="size-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl">analytics</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Promedio Global</p>
                                <p className="text-2xl font-black text-[#0d141c]">{avgScore}%</p>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm flex items-center gap-4">
                            <div className="size-14 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                                <span className="material-symbols-outlined text-2xl">emoji_events</span>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">Mejor Resultado</p>
                                <p className="text-2xl font-black text-[#0d141c]">{bestScore}%</p>
                            </div>
                        </div>
                    </div>

                    {/* SECTION: PROGRESS BY EXAM TYPE */}
                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Diagnostics Chart */}
                        <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm flex flex-col">
                             <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-indigo-500 bg-indigo-50 p-1 rounded-md">health_and_safety</span>
                                <h3 className="font-bold text-lg text-[#0d141c]">Progreso en Diagnósticos</h3>
                             </div>
                             {/* Fixed height container */}
                             <div className="w-full h-64 relative">
                                {diagnosticsData.length > 0 ? (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={diagnosticsData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="attempt" tick={{fontSize: 10, fill: '#94a3b8'}} />
                                                <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Line type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos de diagnósticos</div>
                                )}
                             </div>
                        </div>

                        {/* Full Simulations Chart */}
                        <div className="bg-white p-6 rounded-2xl border border-border-light shadow-sm flex flex-col">
                             <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-amber-500 bg-amber-50 p-1 rounded-md">timer</span>
                                <h3 className="font-bold text-lg text-[#0d141c]">Progreso en Simulacros Tipo CNSC</h3>
                             </div>
                             {/* Fixed height container */}
                             <div className="w-full h-64 relative">
                                {simulacroData.length > 0 ? (
                                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={simulacroData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="attempt" tick={{fontSize: 10, fill: '#94a3b8'}} />
                                                <YAxis domain={[0, 100]} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                                <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                                <Line type="monotone" dataKey="score" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: '#f59e0b' }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sin datos de simulacros completos</div>
                                )}
                             </div>
                        </div>
                    </div>

                    {/* SECTION: PERFORMANCE BY COMPETENCY */}
                    <div className="w-full bg-white p-6 rounded-2xl border border-border-light shadow-sm flex flex-col">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-500 bg-emerald-50 p-1 rounded-md">donut_large</span>
                                <div>
                                    <h3 className="font-bold text-lg text-[#0d141c]">Consolidado por Competencias</h3>
                                    <p className="text-xs text-slate-500">Promedio histórico acumulado (Categorías principales)</p>
                                </div>
                            </div>
                        </div>
                        {/* Increased height and strict container */}
                        <div className="w-full h-96 relative">
                             {competencyChartData.length > 0 ? (
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={competencyChartData} layout="vertical" margin={{ left: 10, right: 30 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                            <XAxis type="number" domain={[0, 100]} hide />
                                            <YAxis dataKey="name" type="category" width={220} tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} interval={0} />
                                            <Tooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        const data = payload[0].payload;
                                                        return (
                                                            <div className="bg-white p-3 border border-slate-100 shadow-lg rounded-lg">
                                                                <p className="font-bold text-slate-800">{data.name}</p>
                                                                <p className="text-primary font-bold">{data.percentage}% Aciertos</p>
                                                                <p className="text-xs text-slate-500">Basado en {data.count} preguntas</p>
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Bar dataKey="percentage" radius={[0, 4, 4, 0]} barSize={24}>
                                                {competencyChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.percentage >= 70 ? '#10b981' : (entry.percentage >= 50 ? '#f59e0b' : '#ef4444')} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                             ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    No hay suficientes datos detallados para generar el perfil de competencias.
                                </div>
                             )}
                        </div>
                    </div>

                    {/* Detailed History Table */}
                    <div className="w-full bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border-light flex justify-between items-center">
                            <h3 className="font-bold text-lg text-[#0d141c]">Historial Detallado</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Fecha</th>
                                        <th className="px-6 py-4">Tipo</th>
                                        <th className="px-6 py-4">Aciertos</th>
                                        <th className="px-6 py-4">Puntaje</th>
                                        <th className="px-6 py-4 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {history.slice().reverse().map((item, idx) => {
                                        let typeLabel = "General";
                                        let typeClass = "bg-slate-100 text-slate-600";
                                        
                                        if (item.mode === SimulationMode.DIAGNOSTICO || (!item.mode && item.totalQuestions <= 15)) {
                                            typeLabel = "Diagnóstico";
                                            typeClass = "bg-indigo-50 text-indigo-700";
                                        } else if (item.mode === SimulationMode.SIMULACRO_COMPLETO || (!item.mode && item.totalQuestions > 15)) {
                                            typeLabel = "Simulacro";
                                            typeClass = "bg-amber-50 text-amber-700";
                                        } else if (item.mode === SimulationMode.PRACTICA_COMPONENTE) {
                                            typeLabel = "Práctica";
                                            typeClass = "bg-emerald-50 text-emerald-700";
                                        }

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-[#0d141c]">
                                                    {new Date(item.date).toLocaleDateString()} 
                                                    <div className="text-slate-400 text-xs">{new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${typeClass}`}>
                                                        {typeLabel}
                                                    </span>
                                                    {item.targetCompetency && (
                                                        <div className="text-[10px] text-slate-500 mt-1 truncate max-w-[120px]">{item.targetCompetency}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    <span className="font-bold">{item.correctCount}</span>/{item.totalQuestions}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${item.score >= 70 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                        {Math.round(item.score)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setSelectedAttempt(item)}
                                                        className="text-primary hover:text-primary-dark font-bold hover:underline"
                                                    >
                                                        Ver Detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
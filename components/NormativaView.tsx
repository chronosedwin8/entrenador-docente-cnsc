import React, { useState } from 'react';
import { consultNormativeExpert } from '../services/geminiService';
import { UserRole } from '../types';
import { RectorPlanView } from './RectorPlanView';
import { DocentePlanView } from './DocentePlanView';

const LAWS = [
    {
        id: 'ley115',
        title: 'Ley 115 de 1994',
        subtitle: 'Ley General de Educación',
        desc: 'Norma rectora del sistema educativo. Define fines de la educación, organización curricular y evaluación.',
        icon: 'menu_book'
    },
    {
        id: 'dec1278',
        title: 'Decreto 1278 de 2002',
        subtitle: 'Estatuto de Profesionalización Docente',
        desc: 'Regula el concurso de méritos, evaluación de desempeño, y escalafón para nuevos docentes.',
        icon: 'gavel'
    },
    {
        id: 'dec1075',
        title: 'Decreto 1075 de 2015',
        subtitle: 'Decreto Único Reglamentario',
        desc: 'Compila toda la normativa del sector educativo. Es la "Biblia" administrativa del sector.',
        icon: 'folder_managed'
    },
    {
        id: 'ley1620',
        title: 'Ley 1620 de 2013',
        subtitle: 'Convivencia Escolar',
        desc: 'Crea el sistema nacional de convivencia escolar y formación para los derechos humanos.',
        icon: 'diversity_3'
    }
];

interface PathItem {
    doc: string;
    focus: string;
    priority: 'Alta' | 'Media';
}

const LEARNING_PATHS: Record<UserRole, PathItem[]> = {
    [UserRole.DOCENTE_AULA]: [
        { doc: "Ley 115 de 1994", focus: "Fines de la educación y organización curricular (Arts 1-25).", priority: "Alta" },
        { doc: "Decreto 1290 de 2009", focus: "Sistema Institucional de Evaluación de Estudiantes (SIEE).", priority: "Alta" },
        { doc: "Estándares Básicos de Competencia", focus: "Conocimiento específico del área a enseñar.", priority: "Alta" },
        { doc: "Decreto 1421 de 2017", focus: "Atención educativa a la población con discapacidad (PIAR).", priority: "Media" },
        { doc: "Ley 1620 de 2013", focus: "Ruta de atención integral para la convivencia escolar.", priority: "Media" }
    ],
    [UserRole.RECTOR]: [
        { doc: "Ley 715 de 2001", focus: "Gestión de recursos y competencias de entidades territoriales.", priority: "Alta" },
        { doc: "Guía 34 del MEN", focus: "Guía para el mejoramiento institucional (Gestión Directiva).", priority: "Alta" },
        { doc: "Decreto 1860 de 1994", focus: "Gobierno Escolar y Manual de Convivencia.", priority: "Alta" },
        { doc: "Decreto 1075 de 2015", focus: "Aspectos administrativos y de contratación (Fondos de Servicios).", priority: "Media" },
        { doc: "Ley 1098 de 2006", focus: "Código de Infancia y Adolescencia (Responsabilidad legal).", priority: "Media" }
    ],
    [UserRole.COORDINADOR]: [
        { doc: "Decreto 1860 de 1994", focus: "Organización de tiempos, jornadas y funciones pedagógicas.", priority: "Alta" },
        { doc: "Ley 1620 de 2013", focus: "Manejo de conflictos y Comité de Convivencia Escolar.", priority: "Alta" },
        { doc: "Decreto 1290 de 2009", focus: "Seguimiento a los procesos de evaluación y promoción.", priority: "Alta" },
        { doc: "Guía 34 del MEN", focus: "Gestión Académica y Comunitaria.", priority: "Media" }
    ],
    [UserRole.ORIENTADOR]: [
        { doc: "Ley 1098 de 2006", focus: "Código de Infancia: Restablecimiento de derechos.", priority: "Alta" },
        { doc: "Ley 1620 de 2013", focus: "Protocolos de atención a violencia y acoso escolar.", priority: "Alta" },
        { doc: "Decreto 1421 de 2017", focus: "Inclusión y Diseño Universal del Aprendizaje (DUA).", priority: "Alta" },
        { doc: "Guía 49 del MEN", focus: "Guía pedagógica para la convivencia escolar.", priority: "Media" }
    ]
};

interface NormativaViewProps {
    isPremium?: boolean;
    onNavigateToPlans?: () => void;
    onNavigate?: (tab: 'simulacros' | 'normativa' | 'estadisticas' | 'admin' | 'planes' | 'matematicas' | 'ai-coach' | 'ayuda' | 'entrevista') => void;
}

export const NormativaView: React.FC<NormativaViewProps> = ({ isPremium = false, onNavigateToPlans, onNavigate }) => {
    const [selectedLaw, setSelectedLaw] = useState<typeof LAWS[0] | null>(null);
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [isPremiumMessage, setIsPremiumMessage] = useState(false);

    // Learning Path State
    const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');

    // If Rector is selected, show the special view
    if (selectedRole === UserRole.RECTOR) {
        return (
            <RectorPlanView
                onNavigateToSimulacros={() => onNavigate?.('simulacros')}
                onBack={() => setSelectedRole('')}
            />
        );
    }

    // If Docente Aula is selected, show the special view
    if (selectedRole === UserRole.DOCENTE_AULA) {
        return (
            <DocentePlanView
                onNavigateToSimulacros={() => onNavigate?.('simulacros')}
                onBack={() => setSelectedRole('')}
            />
        );
    }

    const handleAsk = async () => {
        if (!query.trim()) return;

        // Check if user is premium
        if (!isPremium) {
            setIsPremiumMessage(true);
            setResponse('Esta función está disponible exclusivamente para usuarios Premium. ¡Actualiza tu plan para acceder al Asistente Legal IA y obtener respuestas personalizadas sobre normativa educativa!');
            setQuery('');
            return;
        }

        setIsPremiumMessage(false);

        setLoading(true);
        setResponse('');
        const answer = await consultNormativeExpert(query, selectedLaw?.title);
        setResponse(answer);
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center py-10 px-4 md:px-10 max-w-6xl mx-auto w-full gap-10">
            <div className="text-center max-w-2xl">
                <h1 className="text-3xl font-black text-[#0d141c] mb-2">Biblioteca Normativa CNSC</h1>
                <p className="text-slate-500">Accede a las fuentes oficiales, genera tu ruta de estudio y consulta a nuestro experto IA.</p>
            </div>

            {/* Learning Paths Section */}
            <div className="w-full bg-white rounded-2xl border border-border-light shadow-sm overflow-hidden animate-fade-in">
                <div className="bg-slate-50 p-6 border-b border-border-light flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h3 className="font-bold text-lg text-[#0d141c] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">alt_route</span>
                            Generador de Ruta de Aprendizaje
                        </h3>
                        <p className="text-sm text-slate-500">Selecciona tu cargo para ver los documentos obligatorios de estudio.</p>
                    </div>
                    <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                        className="h-12 px-4 rounded-xl border border-slate-300 bg-white min-w-[250px] outline-none focus:border-primary focus:ring-1 focus:ring-primary font-medium text-slate-700"
                    >
                        <option value="">Seleccionar Cargo...</option>
                        {Object.values(UserRole).map(role => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                </div>

                <div className="p-6">
                    {!selectedRole ? (
                        <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-100 rounded-xl">
                            <span className="material-symbols-outlined text-4xl mb-2">touch_app</span>
                            <p className="text-sm font-medium">Elige un rol arriba para desplegar la ruta.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-0">
                            {LEARNING_PATHS[selectedRole].map((item, idx) => (
                                <div key={idx} className="flex gap-4 group">
                                    <div className="flex flex-col items-center">
                                        <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${idx === 0 ? 'bg-primary text-white ring-4 ring-blue-50' : 'bg-slate-100 text-slate-500'}`}>
                                            {idx + 1}
                                        </div>
                                        {idx < LEARNING_PATHS[selectedRole].length - 1 && (
                                            <div className="w-0.5 flex-1 bg-slate-100 my-1 group-hover:bg-blue-100 transition-colors"></div>
                                        )}
                                    </div>
                                    <div className="pb-8">
                                        <div className="bg-white p-4 rounded-xl border border-border-light shadow-sm hover:shadow-md transition-shadow group-hover:border-blue-100">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-slate-800">{item.doc}</h4>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${item.priority === 'Alta' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                                                    Prioridad {item.priority}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed">
                                                <span className="font-semibold text-primary mr-1">Enfoque de estudio:</span>
                                                {item.focus}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full h-px bg-slate-200 my-2"></div>

            <h3 className="text-xl font-bold text-[#0d141c] self-start flex items-center gap-2">
                <span className="material-symbols-outlined">library_books</span>
                Biblioteca General
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {LAWS.map((law) => (
                    <button
                        key={law.id}
                        onClick={() => { setSelectedLaw(law); setResponse(''); setQuery(''); }}
                        className={`p-6 rounded-xl border-2 text-left transition-all flex flex-col gap-3 hover:shadow-lg ${selectedLaw?.id === law.id ? 'border-primary bg-blue-50' : 'border-border-light bg-white hover:border-blue-200'}`}
                    >
                        <div className={`size-10 rounded-lg flex items-center justify-center ${selectedLaw?.id === law.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'}`}>
                            <span className="material-symbols-outlined">{law.icon}</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-[#0d141c]">{law.title}</h3>
                            <p className="text-xs font-bold text-primary uppercase mt-1">{law.subtitle}</p>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">{law.desc}</p>
                        </div>
                    </button>
                ))}
            </div>

            {/* AI Expert Section */}
            <div className="w-full bg-white rounded-2xl border border-border-light shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[400px]">
                <div className="p-8 md:w-1/3 bg-slate-50 border-r border-border-light flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">psychology</span>
                            Asistente Legal IA
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            {selectedLaw
                                ? `Pregunta específicamente sobre el contexto de: ${selectedLaw.title}.`
                                : "Selecciona una norma arriba o haz una pregunta general sobre el sistema educativo."}
                        </p>
                    </div>
                    <div className="text-xs text-slate-400 p-3 bg-slate-100 rounded border border-slate-200">
                        <strong>Tip:</strong> Intenta preguntar "¿Cuáles son las causales de evaluación de desempeño?" o "¿Cómo se conforma el gobierno escolar?"
                    </div>
                </div>

                <div className="flex-1 p-8 flex flex-col">
                    <div className="flex-1 overflow-y-auto mb-4 min-h-[200px]">
                        {!response && !loading && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300">
                                <span className="material-symbols-outlined text-5xl mb-2">forum</span>
                                <p>Haz una pregunta para comenzar</p>
                            </div>
                        )}
                        {loading && (
                            <div className="flex items-start gap-4 animate-pulse">
                                <div className="size-8 rounded-full bg-primary/20"></div>
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                                    <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                                </div>
                            </div>
                        )}
                        {response && (
                            <div className="flex items-start gap-4">
                                <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${isPremiumMessage ? 'bg-amber-500 text-white' : 'bg-primary text-white'}`}>
                                    <span className="material-symbols-outlined text-sm">{isPremiumMessage ? 'workspace_premium' : 'smart_toy'}</span>
                                </div>
                                <div className={`p-4 rounded-2xl rounded-tl-none text-sm leading-relaxed ${isPremiumMessage ? 'bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 text-amber-900' : 'bg-blue-50 border border-blue-100 text-slate-800'}`}>
                                    {isPremiumMessage && (
                                        <div className="flex items-center gap-2 mb-2 text-amber-600 font-bold">
                                            <span className="material-symbols-outlined text-lg">lock</span>
                                            Función Premium
                                        </div>
                                    )}
                                    <p className="whitespace-pre-line">{response}</p>
                                    {isPremiumMessage && (
                                        <button
                                            onClick={() => onNavigateToPlans?.()}
                                            className="mt-3 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all inline-flex items-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">star</span>
                                            Ver Planes Premium
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                            placeholder={`Preguntar sobre ${selectedLaw?.title || 'normativa general'}...`}
                            className="w-full h-14 pl-4 pr-14 rounded-xl border border-slate-300 focus:border-primary focus:ring-primary outline-none transition-all"
                        />
                        <button
                            onClick={handleAsk}
                            disabled={loading || !query.trim()}
                            className="absolute right-2 top-2 size-10 bg-primary text-white rounded-lg flex items-center justify-center hover:bg-primary-dark transition-all disabled:opacity-50"
                        >
                            <span className="material-symbols-outlined">send</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
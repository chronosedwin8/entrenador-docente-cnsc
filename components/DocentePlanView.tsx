
import React, { useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer
} from 'recharts';

// --- DATA CONSTANTS ---

const LAWS_DATA = [
    {
        id: 'l115',
        title: 'Ley 115 de 1994',
        subtitle: 'Ley General de Educación',
        summary: 'La "Biblia" del sector. Define los fines de la educación, la organización del servicio educativo, y el currículo.',
        keyPoints: [
            'Fines de la educación (Art. 5).',
            'Enseñanza obligatoria (Art. 14).',
            'Gobierno Escolar (Art. 142).',
            'Definición de currículo y autonomía escolar (Art. 76-77).'
        ],
        focus: 'Estudiar los fines de la educación y cómo se estructura el gobierno escolar (Rector, Consejo Directivo, Académico).'
    },
    {
        id: 'd1075',
        title: 'Decreto 1075 de 2015',
        subtitle: 'Decreto Único Reglamentario',
        summary: 'Compila toda la normativa educativa. Es extenso, pero es la referencia actual para cualquier procedimiento legal.',
        keyPoints: [
            'Libro 2, Parte 3: Reglamentación de la Educación Preescolar, Básica y Media.',
            'Evaluación del aprendizaje (Antiguo Decreto 1290).',
            'Convivencia Escolar (Antigua Ley 1620 reglamentada).'
        ],
        focus: 'Enfócate en el Título 3 (Prestación del Servicio) y las normas de evaluación y promoción.'
    },
    {
        id: 'l715',
        title: 'Ley 715 de 2001',
        subtitle: 'Sistema General de Participaciones',
        summary: 'Define cómo se financia la educación y las competencias de Nación, Departamentos y Municipios.',
        keyPoints: [
            'Recursos y financiación.',
            'Competencias de las Entidades Territoriales Certificadas.',
            'Administración de plantas de personal.'
        ],
        focus: 'Entender quién es el responsable de qué (¿Quién paga? ¿Quién nombra? ¿Quién mantiene la infraestructura?).'
    },
    {
        id: 'd1278',
        title: 'Decreto 1278 de 2002',
        subtitle: 'Estatuto de Profesionalización Docente',
        summary: 'La norma que rige tu carrera. Define el ingreso, permanencia, ascenso y evaluación de los docentes nuevos.',
        keyPoints: [
            'Ingreso por concurso de méritos.',
            'Período de prueba.',
            'Evaluación de desempeño anual.',
            'Escalafón docente.'
        ],
        focus: 'Vital para entender tus derechos, deberes y cómo serás evaluado una vez ingreses.'
    },
    {
        id: 'l1620',
        title: 'Ley 1620 de 2013',
        subtitle: 'Convivencia Escolar',
        summary: 'Crea el Sistema Nacional de Convivencia Escolar y define los tipos de faltas (I, II, III).',
        keyPoints: [
            'Comité de Convivencia Escolar.',
            'Ruta de Atención Integral.',
            'Tipos de Situaciones (Conflictos, Agresiones, Delitos).'
        ],
        focus: 'Muy evaluado en casos situacionales. Aprende a diferenciar una situación Tipo II de una Tipo III.'
    },
    {
        id: 'd1421',
        title: 'Decreto 1421 de 2017',
        subtitle: 'Inclusión Educativa',
        summary: 'Reglamenta la atención educativa a la población con discapacidad bajo el esquema de inclusión.',
        keyPoints: [
            'PIAR (Plan Individual de Ajustes Razonables).',
            'DUA (Diseño Universal de Aprendizaje).',
            'No discriminación.'
        ],
        focus: 'El enfoque de inclusión es transversal en toda la prueba. Entender qué es el PIAR es obligatorio.'
    }
];

const PEDAGOGY_DATA = [
    {
        title: 'Currículo y PEI',
        desc: 'El Proyecto Educativo Institucional es la carta de navegación. Entender sus 4 componentes (Directivo, Académico, Administrativo, Comunitario).',
        color: 'blue'
    },
    {
        title: 'Evaluación Formativa',
        desc: 'Superar la nota numérica. Entender la evaluación como proceso (Diagnóstica, Formativa, Sumativa) según Decreto 1290.',
        color: 'emerald'
    },
    {
        title: 'Didáctica General',
        desc: 'Estrategias de enseñanza. Aprendizaje Basado en Problemas, Aprendizaje Significativo (Ausubel), Constructivismo (Piaget/Vygotsky).',
        color: 'amber'
    },
    {
        title: 'Gestión de Aula',
        desc: 'Clima escolar, manejo de grupo, resolución pacífica de conflictos, motivación estudiantil.',
        color: 'indigo'
    },
    {
        title: 'Inclusión y Diversidad',
        desc: 'Aplicación del DUA. Adaptaciones curriculares no significativas vs significativas. Atención a ritmos de aprendizaje.',
        color: 'rose'
    },
    {
        title: 'Competencias Ciudadanas',
        desc: 'Formación en derechos humanos, participación democrática y convivencia pacífica. Transversal a todas las áreas.',
        color: 'cyan'
    }
];

const ROADMAP_DATA = [
    {
        phase: 'Fase 1: Fundamentación (Semanas 1-3)',
        topic: 'Marco Legal y Normativo',
        detail: 'Lectura intensiva de la Ley 115 y Decreto 1075. Elaboración de mapas conceptuales sobre el Gobierno Escolar.',
        status: 'current'
    },
    {
        phase: 'Fase 2: Pedagógica (Semanas 4-6)',
        topic: 'Teorías y Modelos Pedagógicos',
        detail: 'Estudio de autores clásicos. Profundización en Evaluación (Dto 1290) e Inclusión (Dto 1421). Diseño de un PIAR simulado.',
        status: 'upcoming'
    },
    {
        phase: 'Fase 3: Específica (Semanas 7-9)',
        topic: 'Conocimientos Disciplinares',
        detail: 'Repaso de los estándares básicos de competencias (EBC) y Derechos Básicos de Aprendizaje (DBA) de tu área específica.',
        status: 'upcoming'
    },
    {
        phase: 'Fase 4: Entrenamiento (Semanas 10-12)',
        topic: 'Simulacros y Psicotécnica',
        detail: 'Realización de pruebas tipo ICFES/CNSC cronometradas. Análisis de casos de Juicio Situacional.',
        status: 'upcoming'
    }
];

// Chart Data
const EXAM_STRUCTURE_DATA = [
    { name: 'Aptitudes y Competencias Básicas', value: 60, color: '#2563eb' },
    { name: 'Psicotécnica', value: 15, color: '#f59e0b' },
    { name: 'Valoración Antecedentes', value: 20, color: '#10b981' },
    { name: 'Entrevista', value: 5, color: '#64748b' },
];

interface DocentePlanViewProps {
    onNavigateToSimulacros: () => void;
    onBack?: () => void;
}

export const DocentePlanView: React.FC<DocentePlanViewProps> = ({ onNavigateToSimulacros, onBack }) => {
    // Current logical view state
    const [activeSection, setActiveSection] = useState('dashboard');
    const [selectedLawId, setSelectedLawId] = useState<string>(LAWS_DATA[0].id);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navItems = [
        { id: 'dashboard', label: 'Inicio & Estrategia', icon: 'dashboard' },
        { id: 'legislacion', label: 'Legislación', icon: 'gavel' },
        { id: 'pedagogia', label: 'Pedagogía', icon: 'lightbulb' },
        { id: 'roadmap', label: 'Plan de Estudio', icon: 'calendar_month' },
        { id: 'simulador', label: 'Simulador Casos', icon: 'sports_esports', action: true }
    ];

    const selectedLaw = LAWS_DATA.find(l => l.id === selectedLawId) || LAWS_DATA[0];

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-[#f8fafc] overflow-hidden rounded-xl shadow-lg border border-slate-200">

            {/* Mobile Header */}
            <header className="md:hidden bg-white text-slate-800 p-4 flex justify-between items-center z-50 shadow-sm shrink-0 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button onClick={onBack} className="mr-2 text-slate-500">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                    )}
                    <span className="text-xl font-bold text-slate-800">Maestro<span className="text-blue-600">2026</span></span>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="focus:outline-none text-slate-600">
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </header>

            {/* Sidebar */}
            <nav className={`bg-white w-full md:w-64 flex-shrink-0 border-r border-slate-200 flex flex-col h-full absolute md:relative z-40 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                        {onBack && (
                            <button onClick={onBack} className="hidden md:block p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="Volver a Normativa">
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                            </button>
                        )}
                        <span className="text-2xl font-bold text-slate-800">Maestro<span className="text-blue-600">2026</span></span>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.action) {
                                    onNavigateToSimulacros();
                                } else {
                                    setActiveSection(item.id);
                                    setIsSidebarOpen(false);
                                }
                            }}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-colors flex items-center gap-3 ${activeSection === item.id && !item.action
                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-blue-600'
                                } ${item.action ? 'text-blue-600 mt-4 border border-blue-200 bg-blue-50/50 hover:bg-blue-100' : ''}`}
                        >
                            <span className="material-symbols-outlined text-xl">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">D</div>
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Aspirante</p>
                            <p className="text-xs text-slate-500">Docente de Aula</p>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 md:p-8 relative w-full h-full">

                {activeSection === 'dashboard' && (
                    <div className="max-w-6xl mx-auto animate-fade-in space-y-8">
                        <div className="text-center mb-8">
                            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-4">Ruta de Preparación Concurso Docente 2026</h1>
                            <p className="text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
                                Bienvenido, futuro Docente de Aula. Este es tu centro de comando estratégico.
                                El éxito en el concurso de la CNSC no depende de memorizar todo, sino de entender la
                                <span className="font-bold text-blue-600"> lógica normativa y pedagógica</span> del sistema educativo colombiano.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Chart */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-1 flex flex-col">
                                <h3 className="text-lg font-bold text-slate-800 mb-2">Estructura de la Prueba</h3>
                                <p className="text-sm text-slate-500 mb-4">Peso porcentual aproximado de los componentes evaluados.</p>
                                <div className="h-64 w-full flex-grow">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={EXAM_STRUCTURE_DATA}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={2}
                                                dataKey="value"
                                            >
                                                {EXAM_STRUCTURE_DATA.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 flex flex-col justify-center">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                        <h4 className="font-bold text-blue-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">auto_stories</span> Lectura Crítica
                                        </h4>
                                        <p className="text-sm text-blue-800 mt-1">Fundamental. Todas las preguntas, incluso matemáticas, requieren alta comprensión lectora.</p>
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500">
                                        <h4 className="font-bold text-amber-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">psychology</span> Juicio Situacional
                                        </h4>
                                        <p className="text-sm text-amber-800 mt-1">No te preguntarán "¿Qué dice la ley?", sino "¿Cómo aplica la ley en este caso de conflicto escolar?".</p>
                                    </div>
                                    <div className="p-4 bg-emerald-50 rounded-lg border-l-4 border-emerald-500">
                                        <h4 className="font-bold text-emerald-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">science</span> Específica
                                        </h4>
                                        <p className="text-sm text-emerald-800 mt-1">Conocimientos propios de tu área (Primaria, Matemáticas, Ciencias, etc.) y didáctica general.</p>
                                    </div>
                                    <div className="p-4 bg-slate-100 rounded-lg border-l-4 border-slate-500">
                                        <h4 className="font-bold text-slate-900 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">target</span> Meta Semanal
                                        </h4>
                                        <p className="text-sm text-slate-700 mt-1">Recomendado: 10 horas de estudio (2h/día Lun-Vie).</p>
                                    </div>
                                </div>
                                <div className="mt-8 text-center">
                                    <button
                                        onClick={() => setActiveSection('roadmap')}
                                        className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center gap-2 mx-auto"
                                    >
                                        Ver Plan de Estudio Detallado <span className="material-symbols-outlined">arrow_forward</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'legislacion' && (
                    <div className="max-w-6xl mx-auto animate-fade-in h-full flex flex-col">
                        <div className="mb-6 border-b border-slate-200 pb-4 shrink-0">
                            <h2 className="text-3xl font-bold text-slate-800">Marco Legal Educativo</h2>
                            <p className="text-slate-600 mt-2">
                                La legislación no debe memorizarse artículo por artículo. Debes entender el <strong>objeto, principios y roles</strong>.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-hidden min-h-[500px]">
                            {/* List */}
                            <div className="lg:col-span-4 space-y-3 overflow-y-auto pr-2 pb-10">
                                {LAWS_DATA.map(law => (
                                    <button
                                        key={law.id}
                                        onClick={() => setSelectedLawId(law.id)}
                                        className={`w-full text-left p-4 rounded-lg shadow-sm border transition-all group ${selectedLawId === law.id
                                            ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-200'
                                            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className={`font-bold group-hover:text-blue-600 ${selectedLawId === law.id ? 'text-blue-700' : 'text-slate-800'}`}>{law.title}</h4>
                                                <p className="text-sm text-slate-500">{law.subtitle}</p>
                                            </div>
                                            <span className={`text-xl transition-transform material-symbols-outlined ${selectedLawId === law.id ? 'text-blue-500' : 'text-slate-300 group-hover:text-blue-400'}`}>
                                                arrow_right_alt
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Detail Panel */}
                            <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-100 overflow-y-auto">
                                <div className="animate-fade-in">
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-800">{selectedLaw.title}</h3>
                                            <p className="text-lg text-blue-600 font-medium">{selectedLaw.subtitle}</p>
                                        </div>
                                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Prioridad Alta</div>
                                    </div>

                                    <div className="prose max-w-none text-slate-600">
                                        <div className="mb-6 text-lg italic border-l-4 border-slate-300 pl-4 bg-slate-50 py-2 pr-2 text-slate-700">
                                            "{selectedLaw.summary}"
                                        </div>

                                        <h4 className="font-bold text-slate-800 mt-6 mb-3 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400">checklist</span>
                                            Puntos Clave a Estudiar
                                        </h4>
                                        <ul className="space-y-2 mb-6 ml-1">
                                            {selectedLaw.keyPoints.map((kp, i) => (
                                                <li key={i} className="flex items-start gap-2">
                                                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-400 shrink-0"></span>
                                                    <span>{kp}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 mt-8">
                                            <h4 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                                                <span className="material-symbols-outlined">lightbulb</span> Tip de Estudio
                                            </h4>
                                            <p className="text-amber-800 text-sm leading-relaxed">{selectedLaw.focus}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'pedagogia' && (
                    <div className="max-w-6xl mx-auto animate-fade-in">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-slate-800">Componente Pedagógico</h2>
                            <p className="text-slate-600 mt-2">
                                Conceptos clave para resolver casos de aula. Enfócate en el "Deber Ser" del docente según el MEN.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {PEDAGOGY_DATA.map((item, index) => {
                                // Dynamic color classes mapping based on the string name
                                const colorMap: Record<string, string> = {
                                    blue: 'text-blue-600',
                                    emerald: 'text-emerald-600',
                                    amber: 'text-amber-600',
                                    indigo: 'text-indigo-600',
                                    rose: 'text-rose-600',
                                    cyan: 'text-cyan-600'
                                };
                                const textColor = colorMap[item.color] || 'text-slate-600';

                                return (
                                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
                                        <h4 className={`text-xl font-bold mb-3 ${textColor}`}>{item.title}</h4>
                                        <p className="text-slate-600 text-sm flex-grow leading-relaxed">{item.desc}</p>
                                        <div className="mt-4 pt-4 border-t border-slate-100">
                                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Concepto Clave</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {activeSection === 'roadmap' && (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                            <div>
                                <h2 className="text-3xl font-bold text-slate-800">Calendario de Estudio: 12 Semanas</h2>
                                <p className="text-slate-600 mt-2">Un plan estructurado fase por fase para llegar listo al día D.</p>
                            </div>
                            <div className="mt-4 md:mt-0">
                                <button className="text-blue-600 font-semibold hover:text-blue-800 px-4 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition flex items-center gap-2">
                                    <span className="material-symbols-outlined text-base">print</span>
                                    Imprimir Plan
                                </button>
                            </div>
                        </div>

                        <div className="relative border-l-2 border-blue-200 ml-4 space-y-12 pb-12 pl-8">
                            {ROADMAP_DATA.map((item, index) => (
                                <div key={index} className="relative fade-in">
                                    <div className={`absolute -left-[41px] top-0 w-4 h-4 rounded-full border-2 ${item.status === 'current' ? 'bg-blue-600 border-blue-200 ring-4 ring-blue-50' : 'bg-slate-300 border-white'}`}></div>

                                    <h4 className={`text-lg font-bold ${item.status === 'current' ? 'text-blue-700' : 'text-slate-700'}`}>{item.phase}</h4>
                                    <h5 className="text-md font-semibold text-slate-800 mt-1">{item.topic}</h5>

                                    <div className="mt-3 bg-white p-5 rounded-lg border border-slate-200 shadow-sm relative">
                                        {item.status === 'current' && (
                                            <span className="absolute -top-3 right-4 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold uppercase tracking-wider">En Curso</span>
                                        )}
                                        <p className="text-slate-600 leading-relaxed">{item.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

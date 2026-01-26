import React, { useState } from 'react';
import {
    PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';

// --- DATA CONSTANTS ---

const LEGAL_DATA = [
    {
        code: "Constitución Política",
        title: "Artículo 67 y Derechos Fundamentales",
        desc: "La educación como derecho y servicio público. Responsabilidad del Estado, la sociedad y la familia. Gratuidad y obligatoriedad.",
        keyPoints: ["Derecho Fundamental", "Servicio Público", "Corresponsabilidad", "Libertad de enseñanza"]
    },
    {
        code: "Ley 115 de 1994",
        title: "Ley General de Educación",
        desc: "Norma rectora. Estructura el servicio educativo, define los niveles (preescolar, básica, media), el PEI, el Gobierno Escolar y la autonomía escolar.",
        keyPoints: ["Fines de la educación", "Gobierno Escolar (Art 142)", "PEI (Art 73)", "Curículo"]
    },
    {
        code: "Ley 715 de 2001",
        title: "Sistema General de Participaciones (SGP)",
        desc: "Define recursos y competencias. CRUCIAL para Rectores: manejo de Fondos de Servicios Educativos y administración de planta docente.",
        keyPoints: ["Competencias de Rectores (Art 10)", "Administración de Fondos", "Planta de personal"]
    },
    {
        code: "Decreto 1075 de 2015",
        title: "Decreto Único Reglamentario (DURSE)",
        desc: "Compila toda la reglamentación. Debes saber navegarlo. Libro 2, Parte 3 (Gestión), Parte 4 (Personal).",
        keyPoints: ["Evaluación (Dec 1290)", "Jornada Escolar", "Manual de Convivencia"]
    },
    {
        code: "Ley 1620 de 2013",
        title: "Convivencia Escolar",
        desc: "Sistema Nacional de Convivencia. Rutas de atención integral frente a violencia escolar, acoso y ciberacoso.",
        keyPoints: ["Ruta de Atención", "Comité de Convivencia", "Mitigación y Protocolos"]
    },
    {
        code: "Decreto 1278 de 2002",
        title: "Estatuto de Profesionalización Docente",
        desc: "Normas sobre ingreso, ascenso, evaluación de desempeño y retiro de los docentes regidos por este estatuto.",
        keyPoints: ["Evaluación de Desempeño", "Evaluación de Período de Prueba", "Escalafón"]
    }
];

const MANAGEMENT_DETAILS = {
    directiva: {
        title: "Gestión Directiva",
        colorClass: "text-blue-500",
        bgClass: "bg-blue-50",
        borderClass: "border-blue-600",
        topics: [
            "Direccionamiento Estratégico (Misión, Visión, Principios)",
            "Gestión Estratégica (Liderazgo, Articulación de planes)",
            "Gobierno Escolar (Consejo Directivo, Académico)",
            "Cultura Institucional",
            "Clima Escolar",
            "Relaciones con el entorno"
        ]
    },
    academica: {
        title: "Gestión Académica",
        colorClass: "text-green-500",
        bgClass: "bg-green-50",
        borderClass: "border-green-600",
        topics: [
            "Diseño Pedagógico (Plan de estudios, enfoque)",
            "Prácticas Pedagógicas (Didáctica, opciones didácticas)",
            "Gestión de Aula (Estilo pedagógico, planeación)",
            "Seguimiento Académico (Evaluación, ausentismo, bajo rendimiento)",
            "Decreto 1290 (SIEE)"
        ]
    },
    administrativa: {
        title: "Gestión Administrativa y Financiera",
        colorClass: "text-orange-500",
        bgClass: "bg-orange-50",
        borderClass: "border-orange-600",
        topics: [
            "Apoyo a la Gestión Académica (Matrícula, boletines)",
            "Administración de la Planta Física y Recursos",
            "Administración de Servicios Complementarios",
            "Talento Humano (Perfiles, inducción, formación, evaluación)",
            "Apoyo Financiero y Contable (Presupuesto, FSE, Ingresos/Gastos)"
        ]
    },
    comunitaria: {
        title: "Gestión Comunitaria",
        colorClass: "text-purple-500",
        bgClass: "bg-purple-50",
        borderClass: "border-purple-600",
        topics: [
            "Inclusión (Poblaciones vulnerables, necesidades diversas)",
            "Proyección a la Comunidad (Escuela de padres, oferta de servicios)",
            "Participación y Convivencia (Manual de convivencia)",
            "Prevención de Riesgos (Psicosociales, físicos)"
        ]
    }
};

const INITIAL_STUDY_PLAN = [
    { week: "Semana 1", title: "Fundamentos Constitucionales y Ley 115", focus: "Legal", status: false },
    { week: "Semana 2", title: "Gestión Directiva y Gobierno Escolar", focus: "Directiva", status: false },
    { week: "Semana 3", title: "Gestión Académica y Decreto 1290", focus: "Académica", status: false },
    { week: "Semana 4", title: "Recursos, Ley 715 y FSE", focus: "Financiera", status: false },
    { week: "Semana 5", title: "Talento Humano y Decreto 1278 vs 2277", focus: "Administrativa", status: false },
    { week: "Semana 6", title: "Convivencia (Ley 1620) e Inclusión", focus: "Comunitaria", status: false },
    { week: "Semana 7", title: "Componente Psicotécnico y Liderazgo", focus: "Competencias", status: false },
    { week: "Semana 8", title: "Repaso General y Simulacros Intensivos", focus: "Práctica", status: false },
];

// Chart Data
const EXAM_STRUCTURE_DATA = [
    { name: 'Aptitudes Básicas', value: 15, color: '#e2e8f0' },
    { name: 'Psicotécnica', value: 20, color: '#fbbf24' },
    { name: 'Conocimientos Específicos', value: 45, color: '#1e3a8a' },
    { name: 'Valoración Antecedentes', value: 20, color: '#64748b' },
];

const COMPETENCIES_DATA = [
    { subject: 'Liderazgo', A: 90, fullMark: 100 },
    { subject: 'Toma Decisiones', A: 95, fullMark: 100 },
    { subject: 'Gestión Conflictos', A: 85, fullMark: 100 },
    { subject: 'Planeación', A: 90, fullMark: 100 },
    { subject: 'Gestión Recursos', A: 80, fullMark: 100 },
    { subject: 'Comun. Asertiva', A: 85, fullMark: 100 },
];

interface RectorPlanViewProps {
    onNavigateToSimulacros: () => void;
    onBack?: () => void;
}

export const RectorPlanView: React.FC<RectorPlanViewProps> = ({ onNavigateToSimulacros, onBack }) => {
    const [activeSection, setActiveSection] = useState('inicio');
    const [managementArea, setManagementArea] = useState<keyof typeof MANAGEMENT_DETAILS>('directiva');
    const [studyPlan, setStudyPlan] = useState(INITIAL_STUDY_PLAN);
    const [openLegalIndex, setOpenLegalIndex] = useState<number | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleWeek = (index: number) => {
        const newPlan = [...studyPlan];
        newPlan[index].status = !newPlan[index].status;
        setStudyPlan(newPlan);
    };

    const progress = Math.round((studyPlan.filter(w => w.status).length / studyPlan.length) * 100);

    const NavItem = ({ id, label, icon }: { id: string, label: string, icon: string }) => (
        <button
            onClick={() => {
                if (id === 'simulacro') {
                    onNavigateToSimulacros();
                } else {
                    setActiveSection(id);
                    setIsSidebarOpen(false);
                }
            }}
            className={`w-full text-left px-6 py-3 font-medium transition-colors flex items-center gap-3 ${activeSection === id ? 'bg-[#1e3a8a] text-white border-l-4 border-[#d97706]' : 'text-slate-600 hover:bg-slate-50'
                }`}
        >
            <span className="material-symbols-outlined text-lg">{icon}</span>
            {label}
        </button>
    );

    return (
        <div className="flex flex-col md:flex-row h-screen w-full bg-[#f5f5f4] overflow-hidden rounded-xl shadow-lg border border-slate-200">

            {/* Mobile Header */}
            <header className="md:hidden bg-[#1e3a8a] text-white p-4 flex justify-between items-center z-50 shadow-md shrink-0">
                <div className="flex items-center gap-2">
                    {onBack && (
                        <button onClick={onBack} className="mr-2">
                            <span className="material-symbols-outlined">arrow_back</span>
                        </button>
                    )}
                    <h1 className="font-bold text-lg">Rectoría 2026</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="focus:outline-none">
                    <span className="material-symbols-outlined">menu</span>
                </button>
            </header>

            {/* Sidebar */}
            <nav className={`bg-white w-full md:w-64 flex-shrink-0 border-r border-gray-200 flex flex-col h-full absolute md:relative z-40 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-6 border-b border-gray-100 bg-slate-50">
                    <div className="flex items-center gap-2 mb-1">
                        {onBack && (
                            <button onClick={onBack} className="hidden md:block p-1 hover:bg-slate-200 rounded-full text-slate-500" title="Volver a Normativa">
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                            </button>
                        )}
                        <h2 className="text-xl font-bold text-[#1e3a8a] leading-none">Ruta Rectoría</h2>
                    </div>
                    <p className="text-xs text-slate-500">Concurso Docente 2026</p>
                </div>
                <div className="flex-1 overflow-y-auto py-4">
                    <ul className="space-y-1">
                        <li><NavItem id="inicio" label="1. Visión General" icon="dashboard" /></li>
                        <li><NavItem id="marco-legal" label="2. Marco Legal" icon="gavel" /></li>
                        <li><NavItem id="areas-gestion" label="3. Áreas de Gestión" icon="grid_view" /></li>
                        <li><NavItem id="competencias" label="4. Perfil y Competencias" icon="person_check" /></li>
                        <li><NavItem id="plan-estudio" label="5. Plan de Estudio" icon="calendar_today" /></li>
                        {/* Modified Link to use External Navigation */}
                        <li>
                            <button
                                onClick={onNavigateToSimulacros}
                                className="w-full text-left px-6 py-3 font-medium text-[#1e3a8a] bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-3 border-l-4 border-transparent hover:border-[#1e3a8a]"
                            >
                                <span className="material-symbols-outlined">play_circle</span>
                                6. Simulacro Rápido
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="p-4 border-t border-gray-100 bg-slate-50">
                    <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white font-bold text-xs">R</div>
                        <div>
                            <p className="text-sm font-semibold text-slate-700">Aspirante</p>
                            <p className="text-xs text-slate-500">Rector / Director Rural</p>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8 relative w-full h-full">

                {activeSection === 'inicio' && (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-8 border-l-4 border-[#1e3a8a]">
                            <h1 className="text-3xl font-bold text-slate-800 mb-2">Bienvenido, futuro Rector.</h1>
                            <p className="text-slate-600 leading-relaxed">
                                Este plan estratégico está diseñado para maximizar tus probabilidades de éxito en el Concurso Docente de la CNSC.
                                El cargo de Rector exige un dominio transversal: no solo pedagógico, sino administrativo, financiero y legal.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col">
                                <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Estructura de la Prueba</h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={EXAM_STRUCTURE_DATA}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {EXAM_STRUCTURE_DATA.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="font-bold text-slate-700 mb-4 border-b pb-2">Pilares del Cargo</h3>
                                    <ul className="space-y-4">
                                        <li className="flex items-start">
                                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-[#1e3a8a] flex items-center justify-center text-sm font-bold mt-0.5">1</span>
                                            <div className="ml-3">
                                                <p className="font-semibold text-slate-800">Liderazgo Directivo</p>
                                                <p className="text-sm text-slate-500">Capacidad de orientar a la comunidad hacia el cumplimiento del PEI.</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-orange-100 text-orange-800 flex items-center justify-center text-sm font-bold mt-0.5">2</span>
                                            <div className="ml-3">
                                                <p className="font-semibold text-slate-800">Manejo de Recursos (FSE)</p>
                                                <p className="text-sm text-slate-500">Gestión transparente de los Fondos de Servicios Educativos (Ley 715).</p>
                                            </div>
                                        </li>
                                        <li className="flex items-start">
                                            <span className="flex-shrink-0 h-6 w-6 rounded-full bg-green-100 text-green-800 flex items-center justify-center text-sm font-bold mt-0.5">3</span>
                                            <div className="ml-3">
                                                <p className="font-semibold text-slate-800">Convivencia Escolar</p>
                                                <p className="text-sm text-slate-500">Aplicación de la Ley 1620 y resolución de conflictos.</p>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                                <div className="mt-6 bg-blue-50 p-4 rounded-lg">
                                    <p className="text-sm text-[#1e3a8a] font-medium text-center">💡 Tip: "Un rector no es solo un pedagogo, es un gerente público."</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'marco-legal' && (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-slate-800">El "Marco de Hierro" Legal</h2>
                            <p className="text-slate-600 mt-2">
                                El 60% de las preguntas se resuelven conociendo la norma exacta. No memorices artículos, entiende la aplicación.
                            </p>
                        </div>
                        <div className="space-y-4">
                            {LEGAL_DATA.map((item, index) => (
                                <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border border-slate-100">
                                    <button
                                        onClick={() => setOpenLegalIndex(openLegalIndex === index ? null : index)}
                                        className="w-full text-left px-6 py-4 focus:outline-none flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
                                    >
                                        <div className="flex-1 pr-4">
                                            <span className="text-xs font-bold text-blue-600 uppercase tracking-wide block mb-1">{item.code}</span>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight">{item.title}</h3>
                                        </div>
                                        <span className={`text-slate-400 transform transition-transform duration-200 material-symbols-outlined ${openLegalIndex === index ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>
                                    {openLegalIndex === index && (
                                        <div className="px-6 py-4 bg-white border-t border-slate-100 animate-fade-in">
                                            <p className="text-slate-600 mb-3">{item.desc}</p>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Puntos Clave:</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {item.keyPoints.map((kp, i) => (
                                                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-800 text-xs rounded-md border border-blue-100 font-medium">
                                                        {kp}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'areas-gestion' && (
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-bold text-slate-800">Las 4 Áreas de Gestión</h2>
                            <p className="text-slate-600 mt-2">La evaluación de desempeño y el concurso se estructuran sobre estos ejes.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            {(Object.entries(MANAGEMENT_DETAILS) as [keyof typeof MANAGEMENT_DETAILS, typeof MANAGEMENT_DETAILS.directiva][]).map(([key, data]) => (
                                <button
                                    key={key}
                                    onClick={() => setManagementArea(key)}
                                    className={`p-6 rounded-xl shadow-sm border-t-4 text-left flex flex-col justify-start transition-all ${data.borderClass
                                        } ${managementArea === key ? 'bg-white ring-2 ring-slate-200 transform scale-[1.02]' : 'bg-white/60 hover:bg-white'
                                        }`}
                                >
                                    <div className="flex items-center justify-between w-full mb-2">
                                        <h3 className={`font-bold text-lg ${data.colorClass}`}>{data.title}</h3>
                                    </div>
                                    <p className="text-sm text-slate-500">Haz clic para ver temas.</p>
                                </button>
                            ))}
                        </div>

                        <div className={`rounded-xl p-8 shadow-lg transition-all border border-slate-700 bg-slate-800 text-white animate-fade-in`}>
                            <h3 className={`text-xl font-bold mb-3 ${MANAGEMENT_DETAILS[managementArea].colorClass.replace('text-', 'text-opacity-90 text-')}`}>
                                {MANAGEMENT_DETAILS[managementArea].title}
                            </h3>
                            <p className="text-slate-300 mb-6 text-sm">Temas críticos para el examen:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                {MANAGEMENT_DETAILS[managementArea].topics.map((topic, i) => (
                                    <div key={i} className="flex items-start space-x-2">
                                        <span className={`mt-1 material-symbols-outlined text-xs ${MANAGEMENT_DETAILS[managementArea].colorClass}`}>check_circle</span>
                                        <span className="text-slate-200">{topic}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'competencias' && (
                    <div className="max-w-4xl mx-auto animate-fade-in">
                        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                            <h2 className="text-2xl font-bold text-slate-800 mb-4">Perfil Competencial</h2>
                            <p className="text-slate-600 mb-6">
                                El examen mide tanto lo que sabes (Funcionales) como cómo actúas (Comportamentales).
                            </p>
                            <div className="h-80 w-full mx-auto">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={COMPETENCIES_DATA}>
                                        <PolarGrid stroke="#e2e8f0" />
                                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                                        <Radar
                                            name="Perfil Ideal"
                                            dataKey="A"
                                            stroke="#1e3a8a"
                                            strokeWidth={2}
                                            fill="#1e3a8a"
                                            fillOpacity={0.2}
                                        />
                                        <RechartsTooltip />
                                    </RadarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div className="bg-indigo-50 p-4 rounded-lg">
                                    <h4 className="font-bold text-indigo-900 mb-2">Comportamentales Clave</h4>
                                    <ul className="list-disc list-inside text-indigo-800 space-y-1">
                                        <li><strong>Liderazgo y Motivación:</strong> Inspirar hacia metas comunes.</li>
                                        <li><strong>Toma de Decisiones:</strong> Elegir bajo presión.</li>
                                        <li><strong>Trabajo en Equipo:</strong> Consejo Académico.</li>
                                    </ul>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-lg">
                                    <h4 className="font-bold text-emerald-900 mb-2">Funcionales Clave</h4>
                                    <ul className="list-disc list-inside text-emerald-800 space-y-1">
                                        <li><strong>Planeación Estratégica:</strong> PEI, PMI.</li>
                                        <li><strong>Gestión de Personal:</strong> Asignación académica.</li>
                                        <li><strong>Administración Recursos:</strong> Contratación.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'plan-estudio' && (
                    <div className="max-w-5xl mx-auto animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-end mb-6">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">Plan de Estudio: 8 Semanas</h2>
                                <p className="text-slate-600 mt-2">Ruta intensiva de preparación.</p>
                            </div>
                            <div className="text-sm bg-white px-4 py-2 rounded-full shadow-sm text-slate-600 font-bold mt-4 md:mt-0 flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-500">track_changes</span>
                                {progress}% Completado
                            </div>
                        </div>

                        <div className="space-y-4">
                            {studyPlan.map((week, index) => (
                                <div key={index} className={`bg-white p-4 rounded-lg shadow-sm border-l-4 transition-all flex flex-col md:flex-row justify-between items-center ${week.status ? 'border-green-500 bg-green-50' : 'border-slate-300'
                                    }`}>
                                    <div className="flex-1 mb-2 md:mb-0">
                                        <span className="text-xs font-bold text-slate-400 uppercase">{week.week}</span>
                                        <h4 className={`font-bold text-lg md:text-xl ${week.status ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                            {week.title}
                                        </h4>
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium inline-block mt-1">
                                            Foco: {week.focus}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => toggleWeek(index)}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${week.status
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                : 'bg-slate-800 text-white hover:bg-slate-700'
                                            }`}
                                    >
                                        {week.status ? (
                                            <>
                                                <span className="material-symbols-outlined text-sm">check</span>
                                                Completado
                                            </>
                                        ) : 'Marcar Listo'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

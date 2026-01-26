import React, { useEffect, useState } from 'react';
import { FAQSection } from './FAQSection';
import { VideoSection } from './VideoSection';
import { GallerySection } from './GallerySection';
import { settingsService, PlanConfigs, InterviewPricingConfig } from '../services/settingsService';

interface LandingPageProps {
    onStart: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [plans, setPlans] = useState<PlanConfigs | null>(null);
    const [pricingConfig, setPricingConfig] = useState<InterviewPricingConfig | null>(null);
    const [isInterviewEnabled, setIsInterviewEnabled] = useState(false);

    useEffect(() => {
        setIsVisible(true);
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

    const calculatePrice = (basePrice: number) => {
        if (!isInterviewEnabled || !pricingConfig) {
            return (basePrice / 1000).toFixed(0) + 'k';
        }

        // Price increase logic:
        // 1. Apply percentage increase (handle floating point precision by rounding)
        // 2. Round up to nearest 10,000
        const increased = Math.round(basePrice * (1 + (pricingConfig.percentage_increase / 100)));
        const rounded = Math.ceil(increased / 10000) * 10000;

        return (rounded / 1000).toFixed(0) + 'k';
    };

    return (
        <div className="min-h-screen bg-background-light font-display flex flex-col">
            {/* Navbar Simple */}
            <nav className="flex items-center justify-between px-6 py-4 lg:px-12 bg-white/80 backdrop-blur-sm sticky top-0 z-50 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary text-3xl">school</span>
                    <h2 className="text-[#0d141c] text-lg font-bold tracking-tight">Entrenador Docente</h2>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                    <a href="#" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-primary transition-colors">Inicio</a>
                    <a href="#features" className="hover:text-primary transition-colors">Características</a>
                    <a href="#galeria" className="hover:text-primary transition-colors">Galería</a>
                    <a href="#demos" className="hover:text-primary transition-colors">Videos</a>
                    <a href="#planes" className="hover:text-primary transition-colors">Planes</a>
                    <a href="#faq" className="hover:text-primary transition-colors">Preguntas</a>
                </div>

                <button
                    onClick={onStart}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-primary rounded-xl shadow-lg shadow-blue-500/30 hover:bg-primary-dark hover:shadow-blue-500/50 hover:-translate-y-0.5 transition-all"
                >
                    Ingresar
                </button>
            </nav>

            <main className="flex-grow">
                {/* HERO SECTION */}
                <section className="relative px-6 py-16 lg:py-24 overflow-hidden">
                    {/* Background Decorations */}
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-blue-50 to-transparent opacity-60 z-[-1]" />
                    <div className="absolute top-20 right-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />

                    <div className={`max-w-4xl mx-auto text-center transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                            Concurso Docente 2026
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-black text-[#0d141c] mb-6 leading-tight">
                            Simulacro Concurso Docente 2026: Tu Plaza en la Carrera Pública con <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">Entrenamiento de Élite</span>.
                        </h1>
                        <p className="text-lg lg:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Plataforma especializada para Rectores, Coordinadores, Orientadores y Docentes. Domina el Juicio Situacional y los Ejes Temáticos de la CNSC.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={onStart}
                                className="group relative px-8 py-4 bg-primary text-white text-lg font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:-translate-y-1 transition-all overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2">
                                    EMPEZAR MI ENTRENAMIENTO
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </span>
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <p className="text-sm text-slate-400 font-medium">
                                * Miles de maestros confían en nosotros
                            </p>
                        </div>
                    </div>
                </section>

                {/* UNIFIED FEATURES SECTION (Prev. Pillars & Features) */}
                <section id="features" className="px-6 py-20 bg-white border-y border-slate-50">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl lg:text-4xl font-black text-[#0d141c] mb-6">
                                Todo lo que necesitas para asegurar tu plaza
                            </h2>
                            <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
                                Nuestra plataforma está diseñada por expertos en pedagogía y tecnología para darte una ventaja competitiva.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Feature 1: Simulacros con IA */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-violet-100 hover:shadow-xl hover:shadow-violet-100/50 transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-violet-600 mb-6 text-3xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">smart_toy</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#0d141c] mb-3">Simulacros con IA</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Genera pruebas que imitan la estructura y dificultad del examen real para Docentes de Aula, Directivos y Orientadores.
                                </p>
                            </div>

                            {/* Feature 2: Juicio Situacional */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-orange-100 hover:shadow-xl hover:shadow-orange-100/50 transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-orange-500 mb-6 text-3xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">psychology</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#0d141c] mb-3">Juicio Situacional</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Entrena con preguntas de juicio situacional y razonamiento lógico adaptadas al nivel de exigencia real de la prueba 2026.
                                </p>
                            </div>

                            {/* Feature 3: Análisis de Resultados */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-blue-100 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-primary mb-6 text-3xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">analytics</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#0d141c] mb-3">Análisis de Resultados</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Recibe una calificación detallada por cada área de competencia. Identifica tus fortalezas y debilidades al instante.
                                </p>
                            </div>

                            {/* Feature 4: Control del Tiempo */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-pink-100 hover:shadow-xl hover:shadow-pink-100/50 transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-pink-500 mb-6 text-3xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">timer</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#0d141c] mb-3">Control del Tiempo</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Practica bajo las mismas condiciones de tiempo del concurso real para mejorar tu agilidad y manejo del estrés.
                                </p>
                            </div>

                            {/* Feature 5: Refuerzo Inteligente */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-emerald-100 hover:shadow-xl hover:shadow-emerald-100/50 transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-emerald-500 mb-6 text-3xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">school</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#0d141c] mb-3">Refuerzo Inteligente</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Nuestra IA identifica tus áreas a mejorar y te sugiere temas de estudio específicos para que optimices tu preparación.
                                </p>
                            </div>

                            {/* Feature 6: Multiplataforma */}
                            <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 hover:border-indigo-100 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 hover:-translate-y-1 group">
                                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-500 mb-6 text-3xl group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined">devices</span>
                                </div>
                                <h3 className="text-xl font-bold text-[#0d141c] mb-3">Acceso Multiplataforma</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    Estudia en PC, tablet o móvil. Tu avance y simulacros se guardan automáticamente en la nube.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <GallerySection />
                <VideoSection />

                {/* SEGMENTATION SECTION */}
                <section className="px-6 py-16 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-[#0d141c] mb-4">Entrenamiento Especializado por Cargo</h2>
                            <p className="text-slate-600">Contenidos diseñados específicamente para tu aspiración</p>
                        </div>
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-[#0d141c]">Directivos</h3>
                                <p className="text-sm text-slate-600">Enfoque en Gestión Directiva, Administrativa y Comunitaria.</p>
                            </div>
                            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-[#0d141c]">Docentes de Aula</h3>
                                <p className="text-sm text-slate-600">Enfoque en Competencias Pedagógicas y Saberes Específicos.</p>
                            </div>
                            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-[#0d141c]">Orientadores</h3>
                                <p className="text-sm text-slate-600">Enfoque en Convivencia Escolar y Procesos de Orientación.</p>
                            </div>
                            <div className="p-6 rounded-xl bg-slate-50 border border-slate-100 hover:shadow-lg transition-all">
                                <h3 className="font-bold text-lg mb-2 text-[#0d141c]">Primaria/Preescolar</h3>
                                <p className="text-sm text-slate-600">Enfoque en Desarrollo Infantil y Lecto-escritura.</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* PLANS SECTION */}
                <section id="planes" className="px-4 py-20 bg-[#F8FAFC]">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl lg:text-4xl font-black text-[#0d141c] mb-4">Elige el Plan de Entrenamiento que se adapta a tu cargo</h2>
                            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                                Selecciona tu suscripción anual y empieza a entrenar hoy mismo con el plan que mejor se adapte a tus necesidades de estudio.
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

                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Plan Free */}
                            <div className="bg-white p-6 rounded-3xl border-2 border-primary/20 shadow-sm flex flex-col h-full hover:shadow-lg transition-shadow relative overflow-hidden group">
                                <div className="absolute top-0 right-0 bg-primary/10 text-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                                    ¡Gratis por 1 Año!
                                </div>
                                <span className="w-fit mb-4 px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Para Empezar
                                </span>
                                <div className="flex items-center gap-2 mb-2 text-slate-700">
                                    <span className="material-symbols-outlined text-2xl">lock_open</span>
                                    <h3 className="text-2xl font-bold">Free</h3>
                                </div>
                                <p className="text-slate-500 text-xs mb-6 h-8 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">credit_card_off</span>
                                    Sin tarjeta de crédito
                                </p>
                                <div className="text-4xl font-black text-[#0d141c] mb-8">$0 <span className="text-sm font-medium text-slate-400">/ año</span></div>

                                {/* Stats */}
                                <div className="space-y-4 mb-8 flex-1">
                                    <div className="flex items-center gap-2 text-sm text-slate-600 bg-green-50 p-2 rounded-lg border border-green-100">
                                        <span className="material-symbols-outlined text-green-600 text-lg">calendar_month</span>
                                        <span className="font-bold text-green-700">20+ Simulacros al año</span>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Simulacros / Mes</span>
                                            <span>2</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400 w-1/12 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Preguntas / Simulacro</span>
                                            <span>5</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-400 w-1/6 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={onStart} className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-all shadow-md hover:shadow-lg shadow-primary/20">
                                    EMPEZAR GRATIS AHORA
                                </button>
                            </div>

                            {/* Plan Básico */}
                            <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-md flex flex-col h-full hover:shadow-xl transition-shadow relative">
                                <span className="w-fit mb-4 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Esencial
                                </span>
                                <div className="flex items-center gap-2 mb-2 text-[#0d141c]">
                                    <span className="material-symbols-outlined text-2xl text-blue-500">school</span>
                                    <h3 className="text-2xl font-bold">Básico</h3>
                                </div>
                                <p className="text-slate-500 text-xs mb-6 h-8">Ideal para iniciar tu preparación con ritmo.</p>
                                <div className="text-4xl font-black text-[#0d141c] mb-8">
                                    ${calculatePrice(plans?.basic.price || 100000)}
                                    <span className="text-sm font-medium text-slate-400">/ año</span>
                                </div>

                                {/* Stats */}
                                <div className="space-y-4 mb-8 flex-1">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Simulacros / Día</span>
                                            <span>{plans?.basic.daily_sims || 1}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-1/4 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Simulacros / Mes</span>
                                            <span>{plans?.basic.monthly_sims || 8}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-1/5 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Preguntas / Simulacro</span>
                                            <span>{plans?.basic.questions_per_sim || 20}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-2/5 rounded-full"></div>
                                        </div>
                                    </div>
                                    {isInterviewEnabled && (
                                        <div className="flex items-center gap-2 text-xs text-primary font-bold bg-blue-50 p-2 rounded-lg animate-pulse">
                                            <span className="material-symbols-outlined text-sm">mic</span>
                                            + {pricingConfig?.included_interviews || 12} Entrevistas con IA
                                        </div>
                                    )}
                                </div>
                                <button onClick={onStart} className="w-full py-3 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors">
                                    Suscribirse
                                </button>
                            </div>

                            {/* Plan Intermedio */}
                            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl scale-105 z-10 flex flex-col h-full relative">
                                <div className="absolute top-0 transform -translate-y-1/2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 shadow-sm rounded-full border border-slate-100">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Más Popular</span>
                                </div>

                                <span className="w-fit mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                    Recomendado
                                </span>
                                <div className="flex items-center gap-2 mb-2 text-[#0d141c]">
                                    <span className="material-symbols-outlined text-2xl text-slate-800">auto_awesome</span>
                                    <h3 className="text-2xl font-bold">Intermedio</h3>
                                </div>
                                <p className="text-slate-500 text-xs mb-6 h-8">Equilibrio perfecto entre costo y beneficios.</p>
                                <div className="text-4xl font-black text-[#0d141c] mb-8">
                                    ${calculatePrice(plans?.intermediate.price || 180000)}
                                    <span className="text-sm font-medium text-slate-400">/ año</span>
                                </div>

                                {/* Stats */}
                                <div className="space-y-4 mb-8 flex-1">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Simulacros / Día</span>
                                            <span>{plans?.intermediate.daily_sims || 2}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-800 w-2/4 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Simulacros / Mes</span>
                                            <span>{plans?.intermediate.monthly_sims || 20}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-800 w-1/2 rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Preguntas / Simulacro</span>
                                            <span>{plans?.intermediate.questions_per_sim || 30}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-800 w-3/5 rounded-full"></div>
                                        </div>
                                    </div>
                                    {isInterviewEnabled && (
                                        <div className="flex items-center gap-2 text-xs text-primary font-bold bg-blue-50 p-2 rounded-lg animate-pulse">
                                            <span className="material-symbols-outlined text-sm">mic</span>
                                            + {pricingConfig?.included_interviews || 12} Entrevistas con IA
                                        </div>
                                    )}
                                </div>
                                <button onClick={onStart} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-black transition-colors shadow-lg shadow-slate-300">
                                    Suscribirse
                                </button>
                            </div>

                            {/* Plan Avanzado */}
                            <div className="bg-white p-6 rounded-3xl border border-green-100 shadow-md flex flex-col h-full hover:shadow-xl transition-shadow">
                                <span className="w-fit mb-4 px-3 py-1 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                    Profesional
                                </span>
                                <div className="flex items-center gap-2 mb-2 text-[#0d141c]">
                                    <span className="material-symbols-outlined text-2xl text-green-500">verified</span>
                                    <h3 className="text-2xl font-bold">Avanzado</h3>
                                </div>
                                <p className="text-slate-500 text-xs mb-6 h-8">Máxima preparación sin limites.</p>
                                <div className="text-4xl font-black text-[#0d141c] mb-8">
                                    ${calculatePrice(plans?.advanced.price || 300000)}
                                    <span className="text-sm font-medium text-slate-400">/ año</span>
                                </div>

                                {/* Stats */}
                                <div className="space-y-4 mb-8 flex-1">
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Simulacros / Día</span>
                                            <span className="text-green-600">{plans?.advanced.daily_sims || 3}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-full rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Simulacros / Mes</span>
                                            <span className="text-green-600">{plans?.advanced.monthly_sims || 40}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-full rounded-full"></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                                            <span>Preguntas / Simulacro</span>
                                            <span className="text-green-600">{plans?.advanced.questions_per_sim || 50}</span>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-full rounded-full"></div>
                                        </div>
                                    </div>
                                    {isInterviewEnabled && (
                                        <div className="flex items-center gap-2 text-xs text-green-600 font-bold bg-green-50 p-2 rounded-lg animate-pulse">
                                            <span className="material-symbols-outlined text-sm">mic</span>
                                            + {pricingConfig?.included_interviews || 12} Entrevistas con IA
                                        </div>
                                    )}
                                </div>
                                <button onClick={onStart} className="w-full py-3 bg-green-50 text-green-600 font-bold rounded-xl hover:bg-green-100 transition-colors">
                                    Suscribirse
                                </button>
                            </div>
                        </div>

                        <p className="text-center text-xs text-slate-400 mt-12">
                            * Precios en COP. Todos los planes incluyen acceso a la comunidad y soporte técnico básico.
                        </p>
                    </div>
                </section>

                <div id="faq">
                    <FAQSection />
                </div>

                {/* SOCIAL PROOF / FINAL CTA */}
                <section className="px-6 py-20 bg-[#0d141c] text-white text-center relative overflow-hidden">
                    {/* Abstract Shapes */}
                    <div className="absolute top-0 left-0 w-full h-full opacity-10">
                        <div className="absolute top-10 left-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-10 right-10 w-60 h-60 bg-purple-500 rounded-full blur-3xl"></div>
                    </div>

                    <div className="relative z-10 max-w-3xl mx-auto">
                        <h2 className="text-3xl lg:text-4xl font-bold mb-6">Tu camino al éxito en el Concurso Docente empieza aquí.</h2>
                        <p className="text-slate-400 mb-10 text-lg">
                            No dejes tu nombramiento al azar. Prepárate con la herramienta definitiva para el Concurso de Ingreso 2026.
                        </p>
                        <button
                            onClick={onStart}
                            className="inline-flex items-center justify-center px-10 py-5 bg-gradient-to-r from-primary to-blue-500 text-white font-bold text-xl rounded-2xl shadow-lg shadow-blue-900/50 hover:scale-105 transition-transform"
                        >
                            INICIAR AHORA
                        </button>
                    </div>
                </section>

                <footer className="py-12 bg-[#0a0f16] border-t border-white/5 text-center px-6">
                    <div className="flex justify-center items-center gap-6 mb-8">
                        {/* Facebook Link */}
                        <a
                            href="https://www.facebook.com/profile.php?id=61585907685057"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/5 hover:bg-[#1877F2] text-slate-400 hover:text-white transition-all duration-300 hover:-translate-y-1 group"
                            aria-label="Síguenos en Facebook"
                        >
                            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </a>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-slate-500 text-sm">© 2026 Entrenador Docente CNSC. Todos los derechos reservados.</p>
                        <p className="text-slate-700 text-xs">Diseñado para el éxito del Magisterio.</p>
                    </div>
                </footer>

                {/* WhatsApp Floating Button */}
                <a
                    href="https://wa.me/573162830615"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white p-4 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center group hover:shadow-green-500/30"
                    aria-label="Contáctanos por WhatsApp"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.506-.669-.516l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <div className="absolute right-full mr-3 bg-white text-[#0d141c] text-xs font-bold px-3 py-1.5 rounded-lg shadow-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        ¡Contáctanos!
                    </div>
                </a>
            </main>
        </div>
    );
};

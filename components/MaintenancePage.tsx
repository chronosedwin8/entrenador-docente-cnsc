import React from 'react';

interface MaintenancePageProps {
    message?: string;
}

export const MaintenancePage: React.FC<MaintenancePageProps> = ({ message }) => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden text-center">
                <div className="bg-amber-100 p-8 flex justify-center">
                    <div className="bg-white p-4 rounded-full shadow-sm">
                        <span className="material-symbols-outlined text-6xl text-amber-500">construction</span>
                    </div>
                </div>

                <div className="p-8">
                    <h1 className="text-3xl font-black text-slate-800 mb-4">Sitio en Mantenimiento</h1>

                    <p className="text-slate-600 mb-8 leading-relaxed">
                        {message || "Estamos realizando actualizaciones importantes para mejorar tu experiencia. Volveremos en breve."}
                    </p>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8">
                        <div className="flex items-center gap-3 text-left">
                            <span className="material-symbols-outlined text-amber-500 text-3xl">info</span>
                            <div>
                                <h4 className="font-bold text-slate-700 text-sm">¿Eres Administrador?</h4>
                                <p className="text-xs text-slate-500">
                                    Si tienes rol de administrador, puedes iniciar sesión normalmente.
                                </p>
                            </div>
                        </div>
                    </div>

                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                    >
                        <span className="material-symbols-outlined">refresh</span>
                        Reintentar
                    </a>
                </div>

                <div className="bg-slate-50 px-8 py-4 border-t border-slate-100">
                    <p className="text-xs text-slate-400 font-medium">
                        Entrenador Docente CNSC &copy; {new Date().getFullYear()}
                    </p>
                </div>
            </div>
        </div>
    );
};

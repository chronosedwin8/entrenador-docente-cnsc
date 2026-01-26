import React, { useState } from 'react';

interface TermsModalProps {
    onAccept: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ onAccept }) => {
    const [accepted, setAccepted] = useState(false);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up">

                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-[#0d141c] flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-500">warning</span>
                        Descargo de Responsabilidad (Disclaimer)
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto text-slate-600 text-sm leading-relaxed space-y-4">
                    <p>
                        Las preguntas y simulacros disponibles en esta aplicación son contenidos originales generados mediante inteligencia artificial, elaborados con fines exclusivamente pedagógicos y de entrenamiento, tomando como referencia la normativa vigente en Colombia y los lineamientos generales establecidos por la Comisión Nacional del Servicio Civil (CNSC).
                    </p>
                    <p>
                        Ninguna de las preguntas incluidas en este simulador corresponde a copias, reproducciones ni adaptaciones de pruebas reales aplicadas en concursos anteriores, ni proviene de bancos de preguntas oficiales, guías disponibles en internet, cursos pagos, plataformas externas o materiales protegidos por derechos de autor.
                    </p>
                    <p>
                        Este simulador no garantiza, bajo ninguna circunstancia, que las preguntas presentadas coincidan total o parcialmente con las que serán aplicadas en las pruebas reales del concurso docente o de directivos docentes. Su finalidad es orientar, entrenar y fortalecer competencias, no predecir ni replicar evaluaciones oficiales.
                    </p>
                    <p>
                        El acceso a los planes pagos implica que el usuario ha utilizado previamente la versión gratuita, comprende las características de cada plan y acepta de manera expresa las limitaciones asociadas al número de preguntas, número de simulacros diarios y mensuales, así como las condiciones del servicio ofrecido.
                    </p>
                    <p className="font-medium text-slate-800">
                        Esta aplicación es un producto independiente, desarrollado con fines educativos y comerciales, y no tiene ninguna relación, aval, dependencia, patrocinio ni vínculo institucional con el Estado colombiano, la Comisión Nacional del Servicio Civil (CNSC) ni con ninguna de sus entidades adscritas o dependencias.
                    </p>
                    <p>
                        El uso de esta plataforma implica la aceptación plena de este descargo de responsabilidad.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <div className="relative flex items-center">
                            <input
                                type="checkbox"
                                checked={accepted}
                                onChange={(e) => setAccepted(e.target.checked)}
                                className="peer size-5 border-2 border-slate-300 rounded checked:bg-primary checked:border-primary transition-all cursor-pointer appearance-none"
                            />
                            <span className="absolute inset-0 text-white material-symbols-outlined text-sm flex items-center justify-center opacity-0 peer-checked:opacity-100 pointer-events-none">check</span>
                        </div>
                        <span className="text-sm font-medium text-slate-700 group-hover:text-primary transition-colors select-none">
                            Al continuar, usted acepta este descargo de responsabilidad.
                        </span>
                    </label>

                    <button
                        onClick={onAccept}
                        disabled={!accepted}
                        className="w-full py-3 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        Continuar
                    </button>
                </div>
            </div>
        </div>
    );
};

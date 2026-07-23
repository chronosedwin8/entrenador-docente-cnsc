import React, { useState } from 'react';

/**
 * Envuelve una gráfica en una tarjeta con botón "ampliar". Al pulsarlo, la misma
 * gráfica se muestra en un popup grande para verla mejor.
 *
 * Se pasa la gráfica como render-prop `chart(height)` para poder renderizarla
 * en dos tamaños (tarjeta y modal) sin duplicar código.
 */
interface ExpandableChartProps {
    title: string;
    subtitle?: string;
    /** Render de la gráfica; recibe la altura en px a usar. */
    chart: (height: number) => React.ReactNode;
    /** Altura de la gráfica dentro de la tarjeta (px). */
    cardHeight?: number;
    className?: string;
}

export const ExpandableChart: React.FC<ExpandableChartProps> = ({
    title,
    subtitle,
    chart,
    cardHeight = 220,
    className = ''
}) => {
    const [open, setOpen] = useState(false);

    return (
        <>
            <div className={`bg-white p-5 rounded-xl border border-border-light shadow-sm ${className}`}>
                <div className="flex items-start justify-between mb-3">
                    <div>
                        <h3 className="text-slate-600 font-bold text-sm uppercase">{title}</h3>
                        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={() => setOpen(true)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors"
                        title="Ampliar gráfica"
                    >
                        <span className="material-symbols-outlined text-lg">open_in_full</span>
                    </button>
                </div>
                {chart(cardHeight)}
            </div>

            {open && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setOpen(false)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between p-6 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-black text-[#0d141c]">{title}</h2>
                                {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
                            </div>
                            <button
                                onClick={() => setOpen(false)}
                                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 flex-1 overflow-auto">
                            {chart(Math.round(window.innerHeight * 0.62))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

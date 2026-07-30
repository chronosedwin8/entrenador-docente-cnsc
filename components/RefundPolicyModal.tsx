import React from 'react';

interface RefundPolicyModalProps {
    onClose: () => void;
}

export const RefundPolicyModal: React.FC<RefundPolicyModalProps> = ({ onClose }) => {
    return (
        <div
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-[#0d141c] flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">receipt_long</span>
                        Política de Devoluciones
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto text-slate-600 text-sm leading-relaxed space-y-4">
                    {/* Destacado: prueba gratis */}
                    <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                        <p className="font-bold text-green-800 flex items-center gap-2 mb-1">
                            <span className="material-symbols-outlined text-lg">verified</span>
                            Prueba gratis durante un (1) año
                        </p>
                        <p className="text-green-800/90">
                            Antes de pagar, tienes acceso a una <strong>versión gratuita disponible por un año</strong> que
                            te permite explorar la plataforma, realizar simulacros y conocer el contenido. Te recomendamos
                            usarla para tomar una decisión informada antes de suscribirte a un plan Premium.
                        </p>
                    </div>

                    <h3 className="font-bold text-slate-800 pt-2">1. Aceptación al pagar</h3>
                    <p>
                        Al completar el pago de cualquier plan Premium, el usuario <strong>acepta de manera expresa las
                        condiciones del simulador y su contenido</strong>, así como las limitaciones de cada plan
                        (número de preguntas, simulacros diarios y mensuales) descritas antes de la compra.
                    </p>

                    <h3 className="font-bold text-slate-800">2. Activación inmediata del servicio</h3>
                    <p>
                        Al confirmarse el pago se <strong>activa de inmediato</strong> el acceso a las funcionalidades
                        Premium (simulacros ampliados, contenido y recursos exclusivos). El usuario solicita y entiende
                        que la prestación del servicio comienza en ese momento.
                    </p>

                    <h3 className="font-bold text-slate-800">3. No devoluciones tras la activación</h3>
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-amber-900">
                            Dado que existe una <strong>versión gratuita para evaluar la plataforma</strong> y que la
                            activación inicia la prestación del servicio, <strong>una vez activado el plan Premium no se
                            realizarán devoluciones del dinero</strong>. Si el usuario decide pagar un plan sin haber
                            conocido antes la plataforma mediante la versión gratuita, asume esa decisión y, bajo estas
                            condiciones, tampoco habrá lugar a devolución.
                        </p>
                    </div>

                    <h3 className="font-bold text-slate-800">4. Excepciones</h3>
                    <p>Sí se estudiará y, cuando corresponda, se hará la devolución en casos de:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Error de cobro o cobro duplicado.</li>
                        <li>Falla técnica atribuible a la plataforma que impida usar el servicio.</li>
                        <li>Imposibilidad de acceder al servicio pagado por causas atribuibles a la plataforma.</li>
                        <li>Cuando la legislación colombiana aplicable así lo exija.</li>
                    </ul>

                    <h3 className="font-bold text-slate-800">5. Cancelación</h3>
                    <p>
                        La cancelación de la suscripción evita futuras renovaciones o cobros, pero <strong>no genera
                        devolución del período ya iniciado</strong>.
                    </p>

                    <p className="text-xs text-slate-400 pt-2 border-t border-slate-100">
                        Esta política se aplica sin perjuicio de los derechos que la Ley 1480 de 2011 (Estatuto del
                        Consumidor) y demás normas colombianas reconozcan al consumidor. Para cualquier solicitud,
                        escríbenos por los canales de contacto de la plataforma.
                    </p>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-blue-600 transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
};

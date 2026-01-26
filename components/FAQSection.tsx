import React, { useState } from 'react';

interface FAQItemProps {
    question: string;
    answer: React.ReactNode;
    isOpen: boolean;
    onClick: () => void;
}

const FAQItem: React.FC<FAQItemProps> = ({ question, answer, isOpen, onClick }) => {
    return (
        <div className={`border-b border-slate-200 last:border-0`}>
            <button
                className="w-full flex items-center justify-between py-5 text-left focus:outline-none group"
                onClick={onClick}
            >
                <h3 className={`text-lg font-bold transition-colors ${isOpen ? 'text-primary' : 'text-[#0d141c] group-hover:text-primary'}`}>
                    {question}
                </h3>
                <span className={`material-symbols-outlined transform transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-slate-400'}`}>
                    expand_more
                </span>
            </button>
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mb-5' : 'max-h-0 opacity-0'}`}
            >
                <div className="text-slate-600 leading-relaxed text-base">
                    {answer}
                </div>
            </div>
        </div>
    );
};

export const FAQSection: React.FC = () => {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const faqs = [
        {
            question: "¿El simulador garantiza que voy a ganar el concurso docente?",
            answer: "No. El simulador es una herramienta pedagógica de entrenamiento diseñada para fortalecer tus conocimientos, habilidades y familiaridad con la prueba escrita del concurso docente. No garantiza resultados, ya que el desempeño final depende de múltiples factores personales y del proceso oficial de evaluación."
        },
        {
            question: "¿La plataforma Simulador Docente tiene relación con la CNSC o con el Estado colombiano?",
            answer: "No. Simulador Docente es un emprendimiento privado e independiente. No tiene vínculos, convenios ni avales con la Comisión Nacional del Servicio Civil (CNSC) ni con ninguna entidad del Estado colombiano."
        },
        {
            question: "¿Las preguntas del simulador son las mismas que circulan en Internet o exámenes reales?",
            answer: "No. Las preguntas son generadas por un motor de inteligencia artificial, diseñado para replicar el estilo, nivel cognitivo, estructura y tipo de preguntas del concurso docente, pero no corresponden a bancos oficiales ni a exámenes reales filtrados."
        },
        {
            question: "¿Cómo puedo conocer la plataforma antes de pagar?",
            answer: "Puedes hacerlo mediante el plan gratuito, disponible por un año, que te permite explorar la plataforma, realizar simulacros limitados y conocer la experiencia de uso antes de adquirir un plan pago."
        },
        {
            question: "¿Cómo funcionan los contadores de simulacros y preguntas de cada plan?",
            answer: (
                <>
                    <p className="mb-2">Cada plan incluye límites diarios, mensuales y por número de preguntas por simulacro.</p>
                    <p className="mb-2"><strong>Ejemplo:</strong> si tu plan permite 2 simulacros por día, podrás realizar hasta dos en ese mismo día. Una vez consumidos, deberás esperar al siguiente día para que el contador diario se reinicie.</p>
                    <p>Lo mismo aplica para los contadores mensuales.</p>
                </>
            )
        },
        {
            question: "¿Qué ocurre si no uso todos mis simulacros o preguntas del mes?",
            answer: "Los contadores no son acumulables. Los simulacros o preguntas no utilizados se pierden al finalizar el período correspondiente (día o mes), según las condiciones del plan."
        },
        {
            question: "¿Puedo cambiar el rol o perfil del cargo después de haber pagado?",
            answer: "Sí. Puedes solicitar el cambio de rol comunicándote con nuestro equipo de soporte vía WhatsApp. El proceso es manual y suele completarse en pocos minutos."
        },
        {
            question: "¿Puedo obtener más simulacros o más preguntas de las que incluye mi plan?",
            answer: "Sí. Es posible adquirir simulacros o paquetes adicionales, los cuales pueden tener un costo extra. Para ello debes comunicarte con nuestro canal oficial de WhatsApp disponible en la web."
        },
        {
            question: "¿Los simulacros se adaptan al cargo o nivel al que me presento?",
            answer: "Sí. El sistema genera simulacros segmentados por perfil del cargo, ajustando el tipo de preguntas, competencias evaluadas y nivel de dificultad según la selección del usuario."
        },
        {
            question: "¿Qué tipo de seguimiento ofrece la plataforma?",
            answer: "La plataforma incluye estadísticas de desempeño, históricos de simulacros, gráficos de avance y recomendaciones de mejora para apoyar tu proceso de preparación."
        },
        {
            question: "¿El contenido sirve para el examen de Rectores y Coordinadores?",
            answer: "Sí, contamos con simulacros específicos que evalúan la gestión directiva según la normativa vigente de la CNSC."
        }
    ];

    return (
        <section className="px-6 py-20 bg-white border-t border-slate-100">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-3xl lg:text-4xl font-black text-[#0d141c] mb-4">Preguntas Frecuentes</h2>
                    <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Resuelve tus dudas sobre el Simulador Docente y prepárate para el éxito.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-10">
                    {faqs.map((faq, index) => (
                        <FAQItem
                            key={index}
                            question={faq.question}
                            answer={faq.answer}
                            isOpen={openIndex === index}
                            onClick={() => toggleFAQ(index)}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

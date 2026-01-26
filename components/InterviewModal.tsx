import React, { useEffect, useRef, useState } from 'react';
import { interviewService } from '../services/interviewService';

interface InterviewModalProps {
    onClose: () => void;
}

// 8 minutes in seconds
const TIME_LIMIT_SECONDS = 8 * 60;

// Memoized container to prevent re-rendering of the widget when timer updates
const WidgetContainer = React.memo(({ html }: { html: string }) => (
    <div
        className="w-full h-full flex items-center justify-center"
        dangerouslySetInnerHTML={{ __html: html }}
    />
));

export const InterviewModal: React.FC<InterviewModalProps> = ({ onClose }) => {
    const [timeLeft, setTimeLeft] = useState(TIME_LIMIT_SECONDS);
    const [widgetConfig, setWidgetConfig] = useState<{ html: string, scriptSrc: string | null } | null>(null);
    const widgetContainerRef = useRef<HTMLDivElement>(null);

    // Timer logic
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose(); // Auto close when time is up
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onClose]);

    // Load Widget Config
    useEffect(() => {
        const loadWidget = async () => {
            const code = await interviewService.getWidgetCode();

            // Parse the code to separate HTML and Script
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = code;

            const script = tempDiv.querySelector('script');
            const scriptSrc = script ? script.getAttribute('src') : null;

            // Remove script from html content to render purely the custom element
            if (script) script.remove();

            setWidgetConfig({ html: tempDiv.innerHTML, scriptSrc });
        };
        loadWidget();
    }, []);

    // Load Script dynamically
    useEffect(() => {
        if (!widgetConfig?.scriptSrc) return;

        // Check if script already exists to avoid re-loading/flickering
        const existingScript = document.querySelector(`script[src="${widgetConfig.scriptSrc}"]`);
        if (existingScript) return;

        const script = document.createElement('script');
        script.src = widgetConfig.scriptSrc;
        script.async = true;
        script.type = "text/javascript";
        document.body.appendChild(script);

        // We do NOT remove the script on unmount. 
        // Web Components/Global scripts should typically load once per session.
        // Removing and re-adding them can cause re-initialization loops or state loss.
    }, [widgetConfig]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative flex flex-col items-center p-6">

                {/* Header with Timer */}
                <div className="flex items-center justify-between w-full mb-6 relative">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-red-500 animate-pulse">
                            mic
                        </span>
                        <span className="font-black text-lg text-slate-700">ENTREVISTA IA</span>
                    </div>

                    <div className={`px-4 py-1 rounded-full font-mono font-bold text-xl ${timeLeft < 60 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                        {formatTime(timeLeft)}
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined text-slate-400">close</span>
                    </button>
                </div>

                {/* ElevenLabs Widget Container */}
                <div className="w-full h-96 bg-slate-50 rounded-xl flex items-center justify-center relative overflow-hidden border border-slate-200">
                    {widgetConfig ? (
                        <WidgetContainer html={widgetConfig.html} />
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
                            <span className="text-xs">Cargando entrevista...</span>
                        </div>
                    )}
                </div>

                <div className="mt-4 text-center">
                    <p className="text-xs text-slate-400">
                        La sesión se cerrará automáticamente al finalizar el tiempo.
                    </p>
                </div>
            </div>
        </div>
    );
};

// Add type definition for the custom element to avoid TS errors
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'elevenlabs-convai': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { 'agent-id': string }, HTMLElement>;
        }
    }
}

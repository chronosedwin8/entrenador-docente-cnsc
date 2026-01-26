import React, { useEffect } from 'react';

interface YouTubeModalProps {
    isOpen: boolean;
    videoId: string;
    onClose: () => void;
}

export const YouTubeModal: React.FC<YouTubeModalProps> = ({ isOpen, videoId, onClose }) => {
    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-4xl bg-black rounded-2xl overflow-hidden shadow-2xl animate-zoom-in border border-white/10 aspect-video">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 size-10 rounded-full bg-black/50 text-white hover:bg-white/20 flex items-center justify-center transition-all backdrop-blur-sm group"
                >
                    <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">close</span>
                </button>

                <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                    title="YouTube video player"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full"
                ></iframe>
            </div>
        </div>
    );
};

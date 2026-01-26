import React, { useState, useEffect, useRef } from 'react';

const IMAGES = [
    ...Array.from({ length: 15 }, (_, i) => ({
        src: `/Imagenes/${i + 1}.jpg`,
        alt: `Vista de la plataforma ${i + 1}`,
    })),
    { src: '/Imagenes/16.png', alt: 'Coach Inteligente - Análisis' },
    { src: '/Imagenes/17.png', alt: 'Coach Inteligente - Plan de Estudio' },
    { src: '/Imagenes/18.png', alt: 'Simulacro de Entrevista con IA' }
];

export const GallerySection: React.FC = () => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handlePrev = () => {
        setSelectedIndex((prev) => (prev === 0 ? IMAGES.length - 1 : prev - 1));
    };

    const handleNext = () => {
        setSelectedIndex((prev) => (prev === IMAGES.length - 1 ? 0 : prev + 1));
    };

    // Auto-scroll thumbnails to keep selected in view
    useEffect(() => {
        if (scrollContainerRef.current) {
            const thumbnail = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
            if (thumbnail) {
                const scrollLeft = thumbnail.offsetLeft - (scrollContainerRef.current.offsetWidth / 2) + (thumbnail.offsetWidth / 2);
                scrollContainerRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [selectedIndex]);

    // Handle keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'ArrowRight') handleNext();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <section className="px-4 py-16 bg-background-light relative z-10" id="galeria">
            <div className="max-w-5xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-black text-[#0d141c] mb-2 flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl">gallery_thumbnail</span>
                        Galería de la Plataforma
                    </h2>
                    <p className="text-slate-500">
                        Conoce la interfaz intuitiva y moderna que te ayudará a lograr tu nombramiento.
                    </p>
                </div>

                {/* Main Gallery Container */}
                <div className="bg-white p-4 rounded-3xl shadow-2xl border border-slate-100">
                    {/* Active Image Stage */}
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black group">
                        <img
                            src={IMAGES[selectedIndex].src}
                            alt={IMAGES[selectedIndex].alt}
                            className="w-full h-full object-contain md:object-cover transition-opacity duration-500"
                        />

                        {/* Navigation Arrows */}
                        <button
                            onClick={handlePrev}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Anterior"
                        >
                            <span className="material-symbols-outlined text-3xl">chevron_left</span>
                        </button>
                        <button
                            onClick={handleNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100"
                            aria-label="Siguiente"
                        >
                            <span className="material-symbols-outlined text-3xl">chevron_right</span>
                        </button>

                        {/* Image Counter Badge */}
                        <div className="absolute top-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md">
                            {selectedIndex + 1} / {IMAGES.length}
                        </div>
                    </div>

                    {/* Thumbnails Strip */}
                    <div className="mt-4 relative">
                        <div
                            ref={scrollContainerRef}
                            className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x"
                            style={{ scrollBehavior: 'smooth' }}
                        >
                            {IMAGES.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setSelectedIndex(idx)}
                                    className={`relative flex-shrink-0 w-24 h-16 rounded-xl overflow-hidden transition-all duration-300 border-2 snap-start ${selectedIndex === idx
                                        ? 'border-primary ring-2 ring-primary/30 scale-105 opacity-100'
                                        : 'border-transparent opacity-60 hover:opacity-100'
                                        }`}
                                >
                                    <img
                                        src={img.src}
                                        alt={`Thumbnail ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

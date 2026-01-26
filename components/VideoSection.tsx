import React, { useState, useEffect } from 'react';

const VIDEOS = [
    { id: '1rTzLsJBT6E', title: 'Video Demo 1' },
    { id: '4-KTyXcEnqk', title: 'Video Demo 2' },
    { id: 'chRC_ESGYhw', title: 'Video Demo 3' },
    { id: 'NyZiJ8Ga7tk', title: 'Video Demo 4' },
    { id: '6dnSo7LzOpA', title: 'Video Demo 5' },
];

const SHORTS = [
    { id: 'w6yCyxNq050', title: 'Short Demo 1' },
    { id: 'ZjuKOxdZnrw', title: 'Short Demo 2' },
];

export const VideoSection: React.FC = () => {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [isShort, setIsShort] = useState(false);

    useEffect(() => {
        if (selectedVideo) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [selectedVideo]);

    return (
        <section className="px-6 py-12 bg-slate-50 relative border-y border-slate-200" id="demos">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-[#0d141c] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">play_circle</span>
                            Galería de Video
                        </h2>
                        <p className="text-sm text-slate-500 mt-1 max-w-lg">
                            Descubre en segundos cómo nuestra plataforma acelera tu aprendizaje.
                        </p>
                    </div>
                </div>

                {/* Horizontal Scroll Container for Videos */}
                <div className="relative group">
                    <div className="flex overflow-x-auto gap-4 pb-4 snap-x hide-scrollbar">
                        {VIDEOS.map((video) => (
                            <div
                                key={video.id}
                                className="min-w-[260px] md:min-w-[320px] aspect-video relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-slate-200 bg-white snap-center group/card"
                                onClick={() => { setSelectedVideo(video.id); setIsShort(false); }}
                            >
                                <img
                                    src={`https://img.youtube.com/vi/${video.id}/mqdefault.jpg`}
                                    alt={video.title}
                                    className="w-full h-full object-cover opacity-90 group-hover/card:opacity-100 transition-opacity"
                                    loading="lazy"
                                />
                                <div className="absolute inset-0 bg-black/10 group-hover/card:bg-black/20 transition-colors"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-sm text-primary group-hover/card:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-2xl">play_arrow</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {/* Shorts Inline */}
                        {SHORTS.map((short) => (
                            <div
                                key={short.id}
                                className="min-w-[140px] md:min-w-[160px] aspect-[9/16] relative rounded-xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all border border-slate-200 bg-black snap-center group/card"
                                onClick={() => { setSelectedVideo(short.id); setIsShort(true); }}
                            >
                                <img
                                    src={`https://img.youtube.com/vi/${short.id}/hqdefault.jpg`}
                                    alt={short.title}
                                    className="w-full h-full object-cover opacity-80 group-hover/card:opacity-100 transition-opacity"
                                    loading="lazy"
                                />
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 text-white/90 text-[10px] font-bold bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                                    <span className="material-symbols-outlined text-xs">movie</span>
                                    Short
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Fade overlay on right to indicate scroll */}
                    <div className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-slate-50 to-transparent pointer-events-none md:hidden"></div>
                </div>
            </div>

            {/* Video Modal */}
            {selectedVideo && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-fade-in"
                    style={{ backgroundColor: 'rgba(13, 20, 28, 0.95)' }}
                    onClick={() => setSelectedVideo(null)}
                >
                    <div
                        className={`relative w-full bg-black rounded-2xl overflow-hidden shadow-2xl animate-fade-in-up ${isShort ? 'max-w-sm aspect-[9/16]' : 'max-w-5xl aspect-video'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={() => setSelectedVideo(null)}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors backdrop-blur-sm group"
                        >
                            <span className="material-symbols-outlined text-2xl group-hover:rotate-90 transition-transform">close</span>
                        </button>

                        <iframe
                            className="w-full h-full"
                            src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1&rel=0&showinfo=0`}
                            title="Entrenador Docente Video"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}
        </section>
    );
};

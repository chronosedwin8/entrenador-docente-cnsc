import React, { useState, useEffect } from 'react';
import { YouTubeModal } from './YouTubeModal';
import { supabase } from '../services/supabase';
import { HelpVideo } from '../types';

export const HelpVideosView: React.FC = () => {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [videos, setVideos] = useState<HelpVideo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const { data, error } = await supabase
                    .from('help_videos')
                    .select('*')
                    .order('display_order', { ascending: true });

                if (error) throw error;
                if (data) setVideos(data);
            } catch (error) {
                console.error("Error fetching help videos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    const getCategoryLabel = (category: string) => {
        switch (category) {
            case 'tutorial': return { label: 'Tutorial', color: 'bg-blue-50 text-blue-600 border-blue-100' };
            case 'faq': return { label: 'Pregunta Frecuente', color: 'bg-amber-50 text-amber-600 border-amber-100' };
            case 'feature': return { label: 'Nueva Función', color: 'bg-green-50 text-green-600 border-green-100' };
            default: return { label: 'Video', color: 'bg-slate-50 text-slate-600 border-slate-100' };
        }
    };

    return (
        <div className="flex flex-col py-10 px-4 md:px-10 max-w-7xl mx-auto w-full gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0d141c] flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-4xl text-primary">help</span>
                        Centro de Ayuda
                    </h1>
                    <p className="text-slate-500 max-w-2xl">
                        Aprende a usar todas las funciones de la plataforma con estos videos tutoriales.
                    </p>
                </div>
            </div>

            <div className="w-full h-px bg-slate-200"></div>

            {loading ? (
                <div className="text-center p-10 text-slate-500">Cargando videos...</div>
            ) : videos.length === 0 ? (
                <div className="text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">video_library</span>
                    <p className="text-slate-500">No hay videos de ayuda disponibles por el momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video) => {
                        const categoryInfo = getCategoryLabel(video.category);
                        return (
                            <div
                                key={video.id}
                                onClick={() => setSelectedVideo(video.youtube_id)}
                                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-border-light cursor-pointer hover:-translate-y-1"
                            >
                                {/* Thumbnail Container */}
                                <div className="relative aspect-video overflow-hidden bg-slate-100">
                                    <img
                                        src={`https://img.youtube.com/vi/${video.youtube_id}/maxresdefault.jpg`}
                                        alt={video.title}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;
                                        }}
                                    />

                                    {/* Play Button Overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                        <div className="size-14 rounded-full bg-white/90 text-primary flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <span className="material-symbols-outlined text-3xl ml-1">play_arrow</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide border ${categoryInfo.color}`}>
                                            {categoryInfo.label}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-[#0d141c] text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                        {video.title}
                                    </h3>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <YouTubeModal
                isOpen={!!selectedVideo}
                videoId={selectedVideo || ''}
                onClose={() => setSelectedVideo(null)}
            />
        </div>
    );
};

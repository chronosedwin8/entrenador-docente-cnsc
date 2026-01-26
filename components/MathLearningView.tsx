import React, { useState, useEffect } from 'react';
import { YouTubeModal } from './YouTubeModal';
import { supabase } from '../services/supabase';
import { LearningVideo } from '../types';

export const MathLearningView: React.FC = () => {
    const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
    const [videos, setVideos] = useState<LearningVideo[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchVideos = async () => {
            try {
                const { data, error } = await supabase
                    .from('learning_videos')
                    .select('*')
                    .order('created_at', { ascending: true });

                if (error) throw error;
                if (data) setVideos(data);
            } catch (error) {
                console.error("Error fetching math videos:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchVideos();
    }, []);

    return (
        <div className="flex flex-col py-10 px-4 md:px-10 max-w-7xl mx-auto w-full gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-black text-[#0d141c] flex items-center gap-3 mb-2">
                        <span className="material-symbols-outlined text-4xl text-primary">calculate</span>
                        Aprende Matemáticas
                    </h1>
                    <p className="text-slate-500 max-w-2xl">
                        Domina el Razonamiento Cuantitativo con esta selección de videos especializados para el Concurso Docente.
                    </p>
                </div>
                <a
                    href="https://www.youtube.com/playlist?list=PLrkNalpcHIZBYxpEw5bxg0g7qc8GWk5gm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold text-sm shadow-sm"
                >
                    <span className="material-symbols-outlined">playlist_play</span>
                    Ver lista completa en YouTube
                </a>
            </div>

            <div className="w-full h-px bg-slate-200"></div>

            {loading ? (
                <div className="text-center p-10 text-slate-500">Cargando videos...</div>
            ) : videos.length === 0 ? (
                <div className="text-center p-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">video_library</span>
                    <p className="text-slate-500">No hay videos disponibles por el momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {videos.map((video) => (
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
                                        // Fallback if maxresdefault doesn't exist
                                        (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;
                                    }}
                                />

                                {/* Play Button Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                                    <div className="size-14 rounded-full bg-white/90 text-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                        <span className="material-symbols-outlined text-3xl ml-1">play_arrow</span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${video.level === 'Básico' ? 'bg-green-50 text-green-600 border border-green-100' :
                                        video.level === 'Intermedio' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                            'bg-purple-50 text-purple-600 border border-purple-100'
                                        }`}>
                                        {video.level}
                                    </span>
                                </div>
                                <h3 className="font-bold text-[#0d141c] text-lg leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                    {video.title}
                                </h3>
                            </div>
                        </div>
                    ))}
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

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { UserProfile, UserRole, SystemRole, SubscriptionTier, KnowledgeArea, LearningVideo, HelpVideo } from '../types';
import { settingsService, PlanConfigs, InterviewPricingConfig, PlanConfig, MaintenanceConfig, InfoBarConfig } from '../services/settingsService';
import { UserDetailModal } from './UserDetailModal';
import { EmailCampaignTab } from './EmailCampaignTab';
import { BulkUserDeletionModal } from './BulkUserDeletionModal';
import { interviewService } from '../services/interviewService';

interface AdminPanelProps {
    currentUser: UserProfile;
    onClose: () => void;
    onHistoryReset?: (userId: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose, onHistoryReset }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'videos' | 'help-videos' | 'email-campaigns' | 'config'>('users');
    const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

    // Config State
    const [interviewEnabled, setInterviewEnabled] = useState(false);
    const [widgetCode, setWidgetCode] = useState('');
    const [planConfigs, setPlanConfigs] = useState<PlanConfigs | null>(null);
    const [interviewPricing, setInterviewPricing] = useState<InterviewPricingConfig | null>(null);
    const [maintenanceConfig, setMaintenanceConfig] = useState<MaintenanceConfig | null>(null);
    const [infoBarConfig, setInfoBarConfig] = useState<InfoBarConfig | null>(null);

    // Users State
    // ... rest of the file ... (lines 28-490 are fine so we skip replacing them to save tokens if possible, but replace_file_content needs contiguous block. 
    // Actually, I'll just replace the top part and add the handlers)

    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [usersPerPage] = useState(10);
    const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
    const [userSimulationCounts, setUserSimulationCounts] = useState<Record<string, number>>({});
    const [stats, setStats] = useState({
        totalUsers: 0,
        byRole: {} as Record<string, { total: number, free: number, premium: number }>,
        byArea: {} as Record<string, number>,
        totalSimulations: 0,
        usersByTier: { free: 0, premium: 0 },
        simulationsByTier: { free: 0, premium: 0 }
    });

    // Learning Videos State
    const [videos, setVideos] = useState<LearningVideo[]>([]);
    const [loadingVideos, setLoadingVideos] = useState(false);
    const [newVideo, setNewVideo] = useState({
        youtubeId: '',
        title: '',
        level: 'Básico' as 'Básico' | 'Intermedio' | 'Avanzado' | 'Todos'
    });

    // Help Videos State
    const [helpVideos, setHelpVideos] = useState<HelpVideo[]>([]);
    const [loadingHelpVideos, setLoadingHelpVideos] = useState(false);
    const [newHelpVideo, setNewHelpVideo] = useState({
        youtubeId: '',
        title: '',
        category: 'tutorial' as 'tutorial' | 'faq' | 'feature'
    });

    useEffect(() => {
        if (activeTab === 'users') fetchUsers();
        if (activeTab === 'videos') fetchVideos();
        if (activeTab === 'help-videos') fetchHelpVideos();
        if (activeTab === 'config') fetchConfig();
    }, [activeTab]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const fetchUsers = async () => {
        // ... (fetchUsers implementation omitted for brevity, assuming standard fetch logic) ...
        setLoadingUsers(true);
        try {
            // 1. Fetch Profiles
            const { data: profiles, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false });

            if (profileError) throw profileError;

            // 2. Fetch Simulation Data (user_id only) to categorize by tier
            const { data: simulations, error: simError } = await supabase
                .from('simulations')
                .select('user_id');

            if (simError) throw simError;

            // Transform data
            const mappedUsers: UserProfile[] = (profiles || []).map((p: any) => ({
                id: p.id,
                name: p.name,
                email: p.email,
                role: p.role,
                area: p.area,
                system_role: p.system_role || 'user',
                subscription_tier: p.subscription_tier || 'free',
                created_at: p.created_at,
                custom_daily_limit: p.custom_daily_limit,
                custom_monthly_limit: p.custom_monthly_limit,
                custom_question_limit: p.custom_question_limit,
                expiration_date: p.expiration_date,
                has_interview_access: p.has_interview_access
            }));

            setUsers(mappedUsers);

            // Calc Stats
            const roleCounts: Record<string, { total: number, free: number, premium: number }> = {};
            const areaCounts: Record<string, number> = {};
            const usersTierCounts = { free: 0, premium: 0 };
            const userTierMap = new Map<string, string>();
            const simCountByUser: Record<string, number> = {};

            // Count simulations per user
            (simulations || []).forEach((s: any) => {
                simCountByUser[s.user_id] = (simCountByUser[s.user_id] || 0) + 1;
            });
            setUserSimulationCounts(simCountByUser);

            mappedUsers.forEach(u => {
                // Tier Logic
                const tier = u.subscription_tier === 'premium' ? 'premium' : 'free';
                usersTierCounts[tier]++;
                userTierMap.set(u.id, tier);

                // Role Logic
                if (!roleCounts[u.role]) {
                    roleCounts[u.role] = { total: 0, free: 0, premium: 0 };
                }
                roleCounts[u.role].total++;
                if (tier === 'premium') {
                    roleCounts[u.role].premium++;
                } else {
                    roleCounts[u.role].free++;
                }

                // Area Logic (only for Docentes de Aula)
                if (u.role === UserRole.DOCENTE_AULA && u.area && u.area !== KnowledgeArea.NONE) {
                    areaCounts[u.area] = (areaCounts[u.area] || 0) + 1;
                }
            });

            // Calc Simulation Stats by User Tier
            const simTierCounts = { free: 0, premium: 0 };
            (simulations || []).forEach((s: any) => {
                const tier = userTierMap.get(s.user_id);
                if (tier === 'premium') {
                    simTierCounts.premium++;
                } else {
                    simTierCounts.free++;
                }
            });

            setStats({
                totalUsers: mappedUsers.length,
                byRole: roleCounts,
                byArea: areaCounts,
                totalSimulations: simulations?.length || 0,
                usersByTier: usersTierCounts,
                simulationsByTier: simTierCounts
            });

        } catch (error) {
            console.error("Error fetching admin data:", error);
            toast.error("Error cargando datos de administración.");
        } finally {
            setLoadingUsers(false);
        }
    };

    const fetchVideos = async () => {
        setLoadingVideos(true);
        try {
            const { data, error } = await supabase
                .from('learning_videos')
                .select('*')
                .order('display_order', { ascending: true, nullsFirst: false });

            if (error) throw error;
            if (data) setVideos(data);
        } catch (error) {
            console.error("Error fetching videos:", error);
            toast.error("Error cargando videos.");
        } finally {
            setLoadingVideos(false);
        }
    };

    const fetchHelpVideos = async () => {
        setLoadingHelpVideos(true);
        try {
            const { data, error } = await supabase
                .from('help_videos')
                .select('*')
                .order('display_order', { ascending: true });

            if (error) throw error;
            if (data) setHelpVideos(data);
        } catch (error) {
            console.error("Error fetching help videos:", error);
            toast.error("Error cargando videos de ayuda.");
        } finally {
            setLoadingHelpVideos(false);
        }
    };

    // User Actions
    const handleUpdateUser = async (userId: string, updates: Partial<UserProfile>) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);

            if (error) throw error;

            setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updates } : u));
            if (selectedUser && selectedUser.id === userId) {
                setSelectedUser(prev => prev ? { ...prev, ...updates } : null);
            }
            if ('subscription_tier' in updates) fetchUsers();

        } catch (error) {
            console.error("Update error:", error);
            toast.error("Error actualizando usuario.");
        }
    };

    const handleDeleteHistory = async (userId: string) => {
        if (!confirm("¿Seguro que deseas eliminar el historial de simulacros de este usuario? Esta acción no se puede deshacer.")) return;
        try {
            const { error } = await supabase
                .from('simulations')
                .delete()
                .eq('user_id', userId);

            if (error) throw error;

            fetchUsers();
            if (onHistoryReset) onHistoryReset(userId);
            setSelectedUser(null);
            toast.success("Historial eliminado correctamente.");
        } catch (error) {
            console.error("Error deleting history:", error);
            toast.error("Error eliminando historial.");
        }
    };

    const handleResetInterview = async (userId: string) => {
        if (!confirm("¿Deseas resetear el último intento de entrevista de este usuario? Esto le permitirá realizar una nueva entrevista inmediatamente.")) return;
        try {
            const success = await interviewService.deleteLastInterviewLog(userId);
            if (success) {
                toast.success("Intento de entrevista reseteado exitosamente.");
            } else {
                toast.error("No se encontró historial reciente o hubo un error.");
            }
        } catch (error) {
            console.error("Error resetting interview:", error);
            toast.error("Error al resetear entrevista.");
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!confirm("¿ESTÁS SEGURO? Esto eliminará todo el historial y datos del usuario permanentemente.")) return;

        try {
            // 1. Delete simulations
            const { error: simError } = await supabase
                .from('simulations')
                .delete()
                .eq('user_id', userId);

            if (simError) throw simError;

            // 2. Delete profile
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', userId);

            if (profileError) throw profileError;

            setUsers(prev => prev.filter(u => u.id !== userId));
            setSelectedUser(null);
            fetchUsers();
            toast.success("Usuario eliminado correctamente.");
        } catch (error) {
            console.error("Delete error:", error);
            toast.error("Error eliminando usuario.");
        }
    };

    // Video Actions
    const handleAddVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Extract ID if URL is provided
            let finalId = newVideo.youtubeId;
            if (finalId.includes('youtube.com') || finalId.includes('youtu.be')) {
                const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                const match = finalId.match(regex);
                if (match && match[1]) {
                    finalId = match[1];
                } else {
                    toast.error("URL de YouTube no válida.");
                    return;
                }
            }

            // Get max display_order
            const maxOrder = videos.length > 0 ? Math.max(...videos.map(v => v.display_order || 0)) : 0;

            const { data, error } = await supabase
                .from('learning_videos')
                .insert([{
                    youtube_id: finalId,
                    title: newVideo.title,
                    level: newVideo.level,
                    display_order: maxOrder + 1
                }])
                .select();

            if (error) throw error;

            toast.success("Video agregado correctamente.");
            setNewVideo({ youtubeId: '', title: '', level: 'Básico' });
            fetchVideos();
        } catch (error) {
            console.error("Error adding video:", error);
            toast.error("Error agregando video.");
        }
    };

    const handleDeleteVideo = async (id: string) => {
        if (!confirm("¿Eliminar este video?")) return;
        try {
            const { error } = await supabase
                .from('learning_videos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Video eliminado.");
            setVideos(prev => prev.filter(v => v.id !== id));
        } catch (error) {
            console.error("Error deleting video:", error);
            toast.error("Error eliminando video.");
        }
    };

    const handleMoveVideo = async (id: string, direction: 'up' | 'down') => {
        const currentIndex = videos.findIndex(v => v.id === id);
        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === videos.length - 1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const currentVideo = videos[currentIndex];
        const targetVideo = videos[targetIndex];

        // Optimistic UI update
        const newVideos = [...videos];
        newVideos[currentIndex] = targetVideo;
        newVideos[targetIndex] = currentVideo;
        setVideos(newVideos);

        const currentOrder = currentVideo.display_order ?? currentIndex + 1;
        const targetOrder = targetVideo.display_order ?? targetIndex + 1;

        try {
            // Update 1: Move current video to target position
            const { error: err1 } = await supabase
                .from('learning_videos')
                .update({ display_order: targetOrder })
                .eq('id', currentVideo.id);

            if (err1) throw err1;

            // Update 2: Move target video to current position
            const { error: err2 } = await supabase
                .from('learning_videos')
                .update({ display_order: currentOrder })
                .eq('id', targetVideo.id);

            if (err2) throw err2;

            toast.success('Orden actualizado');
        } catch (error: any) {
            console.error("Error reordering videos:", error);
            // Rollback
            setVideos(videos);
            toast.error("Error guardando el orden. Verifica tu conexión.");
        }
    };

    // Help Video Actions
    const handleAddHelpVideo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            let finalId = newHelpVideo.youtubeId;
            if (finalId.includes('youtube.com') || finalId.includes('youtu.be')) {
                const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
                const match = finalId.match(regex);
                if (match && match[1]) {
                    finalId = match[1];
                } else {
                    toast.error("URL de YouTube no válida.");
                    return;
                }
            }

            const maxOrder = helpVideos.length > 0 ? Math.max(...helpVideos.map(v => v.display_order || 0)) : 0;

            const { data, error } = await supabase
                .from('help_videos')
                .insert([{
                    youtube_id: finalId,
                    title: newHelpVideo.title,
                    category: newHelpVideo.category,
                    display_order: maxOrder + 1
                }])
                .select();

            if (error) throw error;

            toast.success("Video de ayuda agregado correctamente.");
            setNewHelpVideo({ youtubeId: '', title: '', category: 'tutorial' });
            fetchHelpVideos();
        } catch (error) {
            console.error("Error adding help video:", error);
            toast.error("Error agregando video de ayuda.");
        }
    };

    const handleDeleteHelpVideo = async (id: string) => {
        if (!confirm("¿Eliminar este video de ayuda?")) return;
        try {
            const { error } = await supabase
                .from('help_videos')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Video de ayuda eliminado.");
            setHelpVideos(prev => prev.filter(v => v.id !== id));
        } catch (error) {
            console.error("Error deleting help video:", error);
            toast.error("Error eliminando video de ayuda.");
        }
    };

    const handleMoveHelpVideo = async (id: string, direction: 'up' | 'down') => {
        const currentIndex = helpVideos.findIndex(v => v.id === id);
        if (currentIndex === -1) return;
        if (direction === 'up' && currentIndex === 0) return;
        if (direction === 'down' && currentIndex === helpVideos.length - 1) return;

        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        const currentVideo = helpVideos[currentIndex];
        const targetVideo = helpVideos[targetIndex];

        const currentOrder = currentVideo.display_order ?? currentIndex + 1;
        const targetOrder = targetVideo.display_order ?? targetIndex + 1;

        try {
            const { error: err1 } = await supabase
                .from('help_videos')
                .update({ display_order: targetOrder })
                .eq('id', currentVideo.id);

            if (err1) throw err1;

            const { error: err2 } = await supabase
                .from('help_videos')
                .update({ display_order: currentOrder })
                .eq('id', targetVideo.id);

            if (err2) throw err2;

            toast.success('Video de ayuda reordenado');
            fetchHelpVideos();
        } catch (error) {
            console.error("Error reordering help videos:", error);
            toast.error("Error reordenando videos de ayuda. ¿Ejecutaste la migración SQL?");
        }
    };

    const fetchConfig = async () => {
        const [enabled, code, plans, pricing, maintenance, infoBar] = await Promise.all([
            interviewService.isFeatureEnabled(),
            interviewService.getWidgetCode(),
            settingsService.getPlanConfigs(),
            settingsService.getInterviewPricingConfig(),
            settingsService.getMaintenanceConfig(),
            settingsService.getInfoBarConfig()
        ]);
        setInterviewEnabled(enabled);
        setWidgetCode(code);
        setPlanConfigs(plans);
        setInterviewPricing(pricing);
        setMaintenanceConfig(maintenance);
        setInfoBarConfig(infoBar);
    };

    const handleToggleInterview = async (enabled: boolean) => {
        const success = await interviewService.setFeatureEnabled(enabled);
        if (success) {
            setInterviewEnabled(enabled);
            toast.success(enabled ? "Entrevistas habilitadas globalmente." : "Entrevistas deshabilitadas globalmente.");
        } else {
            toast.error("Error actualizando configuración.");
        }
    };

    const handleSaveInfoBarConfig = async () => {
        if (!infoBarConfig) return;
        const success = await settingsService.updateInfoBarConfig(infoBarConfig);
        if (success) {
            toast.success("Barra informativa actualizada.");
        } else {
            toast.error("Error al actualizar la barra.");
        }
    };

    const handleSaveWidgetCode = async () => {
        const success = await interviewService.setWidgetCode(widgetCode);
        if (success) {
            toast.success("Código del widget actualizado.");
        } else {
            toast.error("Error actualizando widget.");
        }
    };

    const handleSavePlanConfig = async () => {
        if (!planConfigs) return;
        const success = await settingsService.updatePlanConfigs(planConfigs);
        if (success) {
            toast.success("Planes actualizados.");
        } else {
            toast.error("Error actualizando planes.");
        }
    };

    const handleSaveInterviewPricing = async () => {
        if (!interviewPricing) return;
        const success = await settingsService.updateInterviewPricingConfig(interviewPricing);
        if (success) {
            toast.success("Precios de entrevista actualizados.");
        } else {
            toast.error("Error actualizando precios de entrevista.");
        }
    };

    const handleSaveMaintenanceConfig = async () => {
        if (!maintenanceConfig) return;
        const success = await settingsService.updateMaintenanceConfig(maintenanceConfig);
        if (success) {
            toast.success("Configuración de mantenimiento actualizada.");
        } else {
            toast.error("Error al actualizar mantenimiento.");
        }
    };

    // Filtering and Pagination
    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const paginatedUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const formatTime = (dateStr?: string) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    };

    const maxRoleCount = Math.max(...Object.values(stats.byRole).map((r: { total: number }) => r.total), 1);
    const maxAreaCount = Math.max(...Object.values(stats.byArea).map((v: number) => v), 1);

    return (
        <div className="flex flex-col h-full bg-background-light p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black text-[#0d141c] flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
                        Panel de Administración
                    </h2>
                    <p className="text-slate-500">Gestión de usuarios, videos y métricas.</p>
                </div>
                <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-bold">
                    Cerrar
                </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-4 mb-6 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb-2 px-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'users' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Usuarios y Métricas
                </button>
                <button
                    onClick={() => setActiveTab('videos')}
                    className={`pb-2 px-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'videos' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Videos Matemáticas
                </button>
                <button
                    onClick={() => setActiveTab('help-videos')}
                    className={`pb-2 px-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'help-videos' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    Videos de Ayuda
                </button>
                <button
                    onClick={() => setActiveTab('email-campaigns')}
                    className={`pb-2 px-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'email-campaigns' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    📧 Campañas Email
                </button>
                <button
                    onClick={() => setActiveTab('config')}
                    className={`pb-2 px-4 font-bold text-sm transition-all border-b-2 ${activeTab === 'config' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    ⚙️ Configuración
                </button>
            </div>

            {/* USERS TAB */}
            {activeTab === 'users' && (
                <>
                    {loadingUsers ? <div className="p-10 text-center">Cargando datos...</div> : (
                        <>
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                {/* Total Users */}
                                <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm">
                                    <h3 className="text-slate-500 font-bold text-sm uppercase mb-2">Total Usuarios</h3>
                                    <p className="text-4xl font-black text-[#0d141c] mb-2">{stats.totalUsers}</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-bold text-xs border border-amber-200">
                                            Premium: {stats.usersByTier.premium}
                                        </span>
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold text-xs border border-slate-200">
                                            Free: {stats.usersByTier.free}
                                        </span>
                                    </div>
                                </div>

                                {/* Simulations */}
                                <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm">
                                    <h3 className="text-slate-500 font-bold text-sm uppercase mb-2">Simulacros Realizados</h3>
                                    <p className="text-4xl font-black text-primary mb-2">{stats.totalSimulations}</p>
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold text-xs border border-blue-200">
                                            Premium: {stats.simulationsByTier.premium}
                                        </span>
                                        <span className="bg-slate-50 text-slate-600 px-2 py-0.5 rounded font-bold text-xs border border-slate-200">
                                            Free: {stats.simulationsByTier.free}
                                        </span>
                                    </div>
                                </div>

                                {/* Role Distribution Chart */}
                                <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm">
                                    <h3 className="text-slate-500 font-bold text-sm uppercase mb-3">Distribución por Rol</h3>
                                    <div className="flex flex-col gap-2">
                                        {Object.entries(stats.byRole).map(([role, counts]) => {
                                            const typedCounts = counts as { total: number; free: number; premium: number };
                                            const percentage = (typedCounts.total / maxRoleCount) * 100;
                                            return (
                                                <div key={role} className="flex items-center gap-2">
                                                    <div className="w-20 text-[10px] text-slate-600 truncate" title={role}>
                                                        {role.replace('Docente ', '').replace('de ', '')}
                                                    </div>
                                                    <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-700 w-6 text-right">{typedCounts.total}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Area Distribution Chart (Docentes de Aula) */}
                                <div className="bg-white p-6 rounded-xl border border-border-light shadow-sm overflow-hidden">
                                    <h3 className="text-slate-500 font-bold text-sm uppercase mb-3">Docentes por Área</h3>
                                    <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                                        {Object.entries(stats.byArea).length === 0 ? (
                                            <p className="text-xs text-slate-400">Sin docentes de aula registrados</p>
                                        ) : (
                                            Object.entries(stats.byArea)
                                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                                .map(([area, count]) => {
                                                    const countNum = count as number;
                                                    const percentage = (countNum / maxAreaCount) * 100;
                                                    const shortArea = area.split(' - ').pop() || area;
                                                    return (
                                                        <div key={area} className="flex items-center gap-2">
                                                            <div className="w-16 text-[9px] text-slate-600 truncate" title={area}>
                                                                {shortArea}
                                                            </div>
                                                            <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all"
                                                                    style={{ width: `${percentage}%` }}
                                                                />
                                                            </div>
                                                            <span className="text-[10px] font-bold text-slate-700 w-4 text-right">{countNum}</span>
                                                        </div>
                                                    );
                                                })
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Users Table */}
                            <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden flex-1 flex flex-col">
                                <div className="p-4 border-b border-border-light flex gap-4 bg-slate-50 items-center">
                                    <div className="relative flex-1">
                                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                        <input
                                            type="text"
                                            placeholder="Buscar por nombre, correo o rol..."
                                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>

                                    {/* Bulk Deletion Button */}
                                    <button
                                        onClick={() => setShowBulkDeleteModal(true)}
                                        className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold hover:bg-red-600 transition-colors flex items-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete_sweep</span>
                                        Eliminación Masiva
                                    </button>

                                    <span className="text-sm text-slate-500">
                                        {filteredUsers.length} usuarios encontrados
                                    </span>
                                </div>
                                <div className="overflow-auto flex-1">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
                                            <tr>
                                                <th className="p-4">Usuario</th>
                                                <th className="p-4">Email</th>
                                                <th className="p-4">Rol</th>
                                                <th className="p-4">Plan</th>
                                                <th className="p-4">Registro</th>
                                                <th className="p-4 text-center">Sims</th>
                                                <th className="p-4 text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {paginatedUsers.map(user => (
                                                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-[#0d141c]">{user.name}</div>
                                                        <div className="text-xs text-slate-400">{user.id.substring(0, 8)}...</div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-sm text-slate-600 max-w-[200px] truncate" title={user.email}>
                                                            {user.email || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-sm">{user.role}</div>
                                                        {user.role === UserRole.DOCENTE_AULA && (
                                                            <div className="text-xs text-slate-400 truncate max-w-[120px]" title={user.area}>
                                                                {user.area}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${user.subscription_tier === 'premium' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                            {user.subscription_tier === 'premium' ? '⭐ Premium' : 'Free'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4">
                                                        <div className="text-sm text-slate-600">{formatDate(user.created_at)}</div>
                                                        <div className="text-xs text-slate-400">{formatTime(user.created_at)}</div>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">
                                                            {userSimulationCounts[user.id] || 0}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <button
                                                            onClick={() => setSelectedUser(user)}
                                                            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-bold hover:bg-blue-600 transition-colors"
                                                        >
                                                            Ver Detalles
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination Controls */}
                                {totalPages > 1 && (
                                    <div className="p-4 border-t border-border-light bg-slate-50 flex justify-between items-center">
                                        <span className="text-sm text-slate-500">
                                            Mostrando {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} de {filteredUsers.length}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                            >
                                                Anterior
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    let pageNum;
                                                    if (totalPages <= 5) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage <= 3) {
                                                        pageNum = i + 1;
                                                    } else if (currentPage >= totalPages - 2) {
                                                        pageNum = totalPages - 4 + i;
                                                    } else {
                                                        pageNum = currentPage - 2 + i;
                                                    }
                                                    return (
                                                        <button
                                                            key={pageNum}
                                                            onClick={() => setCurrentPage(pageNum)}
                                                            className={`size-8 rounded-lg text-sm font-bold transition-colors ${currentPage === pageNum ? 'bg-primary text-white' : 'hover:bg-slate-100'}`}
                                                        >
                                                            {pageNum}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                                disabled={currentPage === totalPages}
                                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100 transition-colors"
                                            >
                                                Siguiente
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* VIDEOS TAB (Matemáticas) */}
            {activeTab === 'videos' && (
                <div className="flex gap-6 h-full overflow-hidden">
                    {/* Add Video Form */}
                    <div className="w-1/3 bg-white p-6 rounded-xl border border-border-light shadow-sm flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-[#0d141c]">Agregar Nuevo Video</h3>
                        <form onSubmit={handleAddVideo} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ID de YouTube o URL</label>
                                <input
                                    type="text"
                                    placeholder="Ej. https://youtu.be/..."
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={newVideo.youtubeId}
                                    onChange={e => setNewVideo({ ...newVideo, youtubeId: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Se extraerá el ID automáticamente.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Título del Video</label>
                                <input
                                    type="text"
                                    placeholder="Título descriptivo"
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={newVideo.title}
                                    onChange={e => setNewVideo({ ...newVideo, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Nivel</label>
                                <select
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={newVideo.level}
                                    onChange={e => setNewVideo({ ...newVideo, level: e.target.value as any })}
                                >
                                    <option value="Básico">Básico</option>
                                    <option value="Intermedio">Intermedio</option>
                                    <option value="Avanzado">Avanzado</option>
                                    <option value="Todos">Todos</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-primary text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors">
                                Agregar Video
                            </button>
                        </form>
                    </div>

                    {/* Videos List */}
                    <div className="flex-1 bg-white rounded-xl border border-border-light shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border-light bg-slate-50 font-bold text-slate-600">
                            Videos de Matemáticas ({videos.length}) - Arrastra para ordenar
                        </div>
                        <div className="flex-1 overflow-auto p-4 grid gap-2">
                            {loadingVideos ? <div className="text-center p-10">Cargando videos...</div> : videos.map((video, index) => (
                                <div key={video.id} className="flex gap-4 p-3 border border-slate-100 rounded-lg bg-white hover:bg-slate-50 transition-colors group items-center">
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={() => handleMoveVideo(video.id, 'up')}
                                            disabled={index === 0}
                                            className="size-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                                        </button>
                                        <button
                                            onClick={() => handleMoveVideo(video.id, 'down')}
                                            disabled={index === videos.length - 1}
                                            className="size-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                                        </button>
                                    </div>
                                    <div className="w-24 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
                                        <img
                                            src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                                            alt={video.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[#0d141c] line-clamp-1">{video.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded">ID: {video.youtube_id}</span>
                                            <span className={`text-xs px-2 py-0.5 rounded ${video.level === 'Básico' ? 'bg-green-50 text-green-700' :
                                                video.level === 'Intermedio' ? 'bg-amber-50 text-amber-700' :
                                                    'bg-purple-50 text-purple-700'
                                                }`}>{video.level}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteVideo(video.id)}
                                        className="size-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100"
                                        title="Eliminar Video"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* HELP VIDEOS TAB */}
            {activeTab === 'help-videos' && (
                <div className="flex gap-6 h-full overflow-hidden">
                    {/* Add Help Video Form */}
                    <div className="w-1/3 bg-white p-6 rounded-xl border border-border-light shadow-sm flex flex-col gap-4">
                        <h3 className="text-lg font-bold text-[#0d141c] flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">help</span>
                            Agregar Video de Ayuda
                        </h3>
                        <form onSubmit={handleAddHelpVideo} className="flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">ID de YouTube o URL</label>
                                <input
                                    type="text"
                                    placeholder="Ej. https://youtu.be/..."
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={newHelpVideo.youtubeId}
                                    onChange={e => setNewHelpVideo({ ...newHelpVideo, youtubeId: e.target.value })}
                                    required
                                />
                                <p className="text-[10px] text-slate-400 mt-1">Se extraerá el ID automáticamente.</p>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Título del Video</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Cómo configurar tu simulacro"
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={newHelpVideo.title}
                                    onChange={e => setNewHelpVideo({ ...newHelpVideo, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Categoría</label>
                                <select
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                    value={newHelpVideo.category}
                                    onChange={e => setNewHelpVideo({ ...newHelpVideo, category: e.target.value as any })}
                                >
                                    <option value="tutorial">Tutorial</option>
                                    <option value="faq">Pregunta Frecuente</option>
                                    <option value="feature">Nueva Función</option>
                                </select>
                            </div>
                            <button type="submit" className="bg-primary text-white py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors">
                                Agregar Video de Ayuda
                            </button>
                        </form>
                    </div>

                    {/* Help Videos List */}
                    <div className="flex-1 bg-white rounded-xl border border-border-light shadow-sm overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-border-light bg-slate-50 font-bold text-slate-600">
                            Videos de Ayuda ({helpVideos.length}) - Usa las flechas para ordenar
                        </div>
                        <div className="flex-1 overflow-auto p-4 grid gap-2">
                            {loadingHelpVideos ? <div className="text-center p-10">Cargando videos de ayuda...</div> : helpVideos.length === 0 ? (
                                <div className="text-center p-10 text-slate-400">
                                    <span className="material-symbols-outlined text-4xl mb-2">video_library</span>
                                    <p>No hay videos de ayuda. ¡Agrega el primero!</p>
                                </div>
                            ) : helpVideos.map((video, index) => (
                                <div key={video.id} className="flex gap-4 p-3 border border-slate-100 rounded-lg bg-white hover:bg-slate-50 transition-colors group items-center">
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={() => handleMoveHelpVideo(video.id, 'up')}
                                            disabled={index === 0}
                                            className="size-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-sm">keyboard_arrow_up</span>
                                        </button>
                                        <button
                                            onClick={() => handleMoveHelpVideo(video.id, 'down')}
                                            disabled={index === helpVideos.length - 1}
                                            className="size-6 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-sm">keyboard_arrow_down</span>
                                        </button>
                                    </div>
                                    <div className="w-24 aspect-video bg-black rounded overflow-hidden flex-shrink-0">
                                        <img
                                            src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`}
                                            alt={video.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-[#0d141c] line-clamp-1">{video.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs px-2 py-0.5 rounded border ${video.category === 'tutorial' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                video.category === 'faq' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-green-50 text-green-600 border-green-100'
                                                }`}>
                                                {video.category === 'tutorial' ? 'Tutorial' :
                                                    video.category === 'faq' ? 'FAQ' : 'Feature'}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteHelpVideo(video.id)}
                                        className="size-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-100"
                                        title="Eliminar Video"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* EMAIL CAMPAIGNS TAB */}
            {activeTab === 'email-campaigns' && (
                <EmailCampaignTab />
            )}

            {/* CONFIG TAB */}
            {activeTab === 'config' && (
                <div className="max-w-2xl mx-auto py-10">
                    <div className="bg-white rounded-2xl border border-border-light shadow-sm p-8">
                        <h3 className="text-2xl font-black text-[#0d141c] mb-6 flex items-center gap-3">
                            <span className="material-symbols-outlined text-3xl text-slate-400">tune</span>
                            Configuración del Sistema
                        </h3>

                        {/* INFO BAR CONFIG */}
                        <div className="mb-6 flex items-start gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <div className={`p-3 rounded-full ${infoBarConfig?.enabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                                <span className="material-symbols-outlined text-2xl">campaign</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-slate-800 mb-1">Barra Informativa</h4>
                                <p className="text-slate-500 text-sm mb-4">
                                    Muestra un mensaje importante en la parte superior de la aplicación para todos los usuarios.
                                </p>

                                <div className="flex flex-col gap-4">
                                    <div className="flex items-center gap-3">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={infoBarConfig?.enabled || false}
                                                onChange={(e) => setInfoBarConfig(prev => prev ? { ...prev, enabled: e.target.checked } : null)}
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                            <span className="ml-3 text-sm font-medium text-slate-700">
                                                {infoBarConfig?.enabled ? 'Visible' : 'Oculta'}
                                            </span>
                                        </label>
                                    </div>

                                    {infoBarConfig?.enabled && (
                                        <div className="animate-fade-in">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Mensaje</label>
                                            <input
                                                type="text"
                                                value={infoBarConfig.message}
                                                onChange={(e) => setInfoBarConfig(prev => prev ? { ...prev, message: e.target.value } : null)}
                                                className="w-full p-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                                placeholder="Ej. Mantenimiento programado para esta noche."
                                            />
                                        </div>
                                    )}

                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={handleSaveInfoBarConfig}
                                            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            Guardar Barra
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <div className={`p-3 rounded-full ${interviewEnabled ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                                <span className="material-symbols-outlined text-2xl">record_voice_over</span>
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-lg text-slate-800 mb-1">Entrevistas con IA</h4>
                                <p className="text-slate-500 text-sm mb-4">
                                    Habilita o deshabilita el acceso al módulo de entrevistas para todos los usuarios Premium.
                                    Útil para mantenimiento o control de costos.
                                </p>

                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={interviewEnabled}
                                            onChange={(e) => handleToggleInterview(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-700">
                                            {interviewEnabled ? 'Habilitado' : 'Deshabilitado'}
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Maintenance Mode Config */}
                    <div className="mt-6 flex items-start gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
                        <div className={`p-3 rounded-full ${maintenanceConfig?.enabled ? 'bg-amber-100 text-amber-600' : 'bg-slate-200 text-slate-500'}`}>
                            <span className="material-symbols-outlined text-2xl">construction</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg text-slate-800 mb-1">Modo Mantenimiento</h4>
                            <p className="text-slate-500 text-sm mb-4">
                                Activa una pantalla de bloqueo para usuarios no administradores. El sitio seguirá visible, pero el acceso estará restringido.
                            </p>

                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-3">
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={maintenanceConfig?.enabled || false}
                                            onChange={(e) => setMaintenanceConfig(prev => prev ? { ...prev, enabled: e.target.checked } : null)}
                                        />
                                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                        <span className="ml-3 text-sm font-medium text-slate-700">
                                            {maintenanceConfig?.enabled ? 'Sitio en Mantenimiento' : 'Sitio Activo'}
                                        </span>
                                    </label>
                                </div>

                                {maintenanceConfig?.enabled && (
                                    <div className="animate-fade-in">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Mensaje para Usuarios</label>
                                        <textarea
                                            value={maintenanceConfig.message}
                                            onChange={(e) => setMaintenanceConfig(prev => prev ? { ...prev, message: e.target.value } : null)}
                                            className="w-full h-24 p-3 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                            placeholder="Estamos realizando actualizaciones..."
                                        />
                                    </div>
                                )}

                                <div className="flex justify-end mt-2">
                                    <button
                                        onClick={handleSaveMaintenanceConfig}
                                        className={`px-4 py-2 text-white text-sm font-bold rounded-lg transition-colors ${maintenanceConfig?.enabled ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-500 hover:bg-slate-600'}`}
                                    >
                                        Actualizar Estado
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Widget Code Config */}
                    <div className="mt-6 flex items-start gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
                        <div className="p-3 rounded-full bg-slate-200 text-slate-500">
                            <span className="material-symbols-outlined text-2xl">code</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="font-bold text-lg text-slate-800 mb-1">Código del Widget (ElevenLabs)</h4>
                            <p className="text-slate-500 text-sm mb-4">
                                Pega aquí el código HTML/JS proporcionado por ElevenLabs para el widget.
                            </p>
                            <textarea
                                value={widgetCode}
                                onChange={(e) => setWidgetCode(e.target.value)}
                                className="w-full h-32 p-3 text-xs font-mono bg-slate-800 text-green-400 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                placeholder="<elevenlabs-convai agent-id='...'></elevenlabs-convai>..."
                            />
                            <div className="flex justify-end mt-4">
                                <button
                                    onClick={handleSaveWidgetCode}
                                    className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                >
                                    Guardar Cambios
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Interview Pricing Config */}
                    {interviewPricing && (
                        <div className="mt-6 flex flex-col gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-full bg-slate-200 text-slate-500">
                                    <span className="material-symbols-outlined text-2xl">price_change</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-slate-800 mb-1">Configuración Precios Entrevista</h4>
                                    <p className="text-slate-500 text-sm mb-4">
                                        Ajusta el incremento de precio y las entrevistas incluidas cuando el usuario habilita "Entrenamiento de Entrevista".
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Incremento (%)</label>
                                            <input
                                                type="number"
                                                value={interviewPricing.percentage_increase}
                                                onChange={e => setInterviewPricing({ ...interviewPricing, percentage_increase: Number(e.target.value) })}
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">Entrevistas Incluidas</label>
                                            <input
                                                type="number"
                                                value={interviewPricing.included_interviews}
                                                onChange={e => setInterviewPricing({ ...interviewPricing, included_interviews: Number(e.target.value) })}
                                                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={handleSaveInterviewPricing}
                                            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            Guardar
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Plan Configs */}
                    {planConfigs && (
                        <div className="mt-6 flex flex-col gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex items-start gap-4">
                                <div className="p-3 rounded-full bg-slate-200 text-slate-500">
                                    <span className="material-symbols-outlined text-2xl">table_chart</span>
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-bold text-lg text-slate-800 mb-1">Planes y Precios</h4>
                                    <p className="text-slate-500 text-sm mb-4">
                                        Configura los límites y precios base de cada plan.
                                    </p>

                                    <div className="space-y-6">
                                        {(['basic', 'intermediate', 'advanced'] as Array<keyof PlanConfigs>).map(planKey => (
                                            <div key={planKey} className="pb-4 border-b border-slate-200 last:border-0 last:pb-0">
                                                <h5 className="font-bold text-slate-700 capitalize mb-3">Plan {planKey === 'basic' ? 'Básico' : planKey === 'intermediate' ? 'Intermedio' : 'Avanzado'}</h5>
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Precio (COP)</label>
                                                        <input
                                                            type="number"
                                                            value={planConfigs[planKey].price}
                                                            onChange={e => setPlanConfigs({ ...planConfigs, [planKey]: { ...planConfigs[planKey], price: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Sims Diarios</label>
                                                        <input
                                                            type="number"
                                                            value={planConfigs[planKey].daily_sims}
                                                            onChange={e => setPlanConfigs({ ...planConfigs, [planKey]: { ...planConfigs[planKey], daily_sims: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Sims Mensuales</label>
                                                        <input
                                                            type="number"
                                                            value={planConfigs[planKey].monthly_sims}
                                                            onChange={e => setPlanConfigs({ ...planConfigs, [planKey]: { ...planConfigs[planKey], monthly_sims: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Preguntas/Sim</label>
                                                        <input
                                                            type="number"
                                                            value={planConfigs[planKey].questions_per_sim}
                                                            onChange={e => setPlanConfigs({ ...planConfigs, [planKey]: { ...planConfigs[planKey], questions_per_sim: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1.5 text-xs rounded border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="flex justify-end mt-4">
                                        <button
                                            onClick={handleSavePlanConfig}
                                            className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:bg-blue-600 transition-colors"
                                        >
                                            Guardar Planes
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            )
            }

            {/* User Detail Modal */}
            {
                selectedUser && (
                    <UserDetailModal
                        user={selectedUser}
                        simulationCount={userSimulationCounts[selectedUser.id] || 0}
                        onClose={() => setSelectedUser(null)}
                        onUpdate={handleUpdateUser}
                        onDeleteHistory={handleDeleteHistory}
                        onResetInterview={handleResetInterview}
                        onDeleteUser={handleDeleteUser}
                    />
                )
            }

            {/* Bulk User Deletion Modal */}
            {
                showBulkDeleteModal && (
                    <BulkUserDeletionModal
                        onClose={() => setShowBulkDeleteModal(false)}
                        onDeleted={() => {
                            fetchUsers();
                            setShowBulkDeleteModal(false);
                        }}
                    />
                )
            }
        </div >
    );
};

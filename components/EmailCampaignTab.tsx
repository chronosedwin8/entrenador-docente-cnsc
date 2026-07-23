import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { UserRole, KnowledgeArea } from '../types';
import toast from 'react-hot-toast';

interface FilterOption {
    id: string;
    label: string;
    description: string;
    query: (supabase: any, params?: any) => Promise<Array<{ id: string, email: string, name: string }>>;
    requiresParams?: boolean;
    paramType?: 'role' | 'area' | 'days';
}

const FILTER_OPTIONS: FilterOption[] = [
    {
        id: 'no_simulations',
        label: 'Sin simulacros realizados',
        description: 'Usuarios que nunca han completado un simulacro',
        query: async (supabase) => {
            const { data: allUsers } = await supabase.from('profiles').select('id, email, name');
            const { data: usersWithSims } = await supabase.from('simulations').select('user_id');
            const idsWithSims = new Set(usersWithSims?.map((s: any) => s.user_id) || []);
            return (allUsers || []).filter((u: any) => !idsWithSims.has(u.id));
        }
    },
    {
        id: 'unverified_email',
        label: 'Email no verificado',
        description: 'Usuarios que no han confirmado su correo electrónico',
        query: async (supabase) => {
            // Usar la función RPC segura que consulta auth.users directamente
            const { data, error } = await supabase.rpc('get_candidates_for_deletion', {
                criteria: 'unverified_email'
            });

            if (error) {
                console.error('Error fetching unverified users:', error);
                return [];
            }

            return data || [];
        }
    },
    {
        id: 'inactive_30days',
        label: 'Inactivos (30+ días)',
        description: 'No han realizado simulacros en el último mes',
        query: async (supabase) => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const { data } = await supabase
                .from('profiles')
                .select('id, email, name')
                .or(`last_simulation_at.is.null,last_simulation_at.lt.${thirtyDaysAgo.toISOString()}`);
            return data || [];
        }
    },
    {
        id: 'free_tier',
        label: 'Usuarios Free',
        description: 'Usuarios con plan gratuito',
        query: async (supabase) => {
            const { data } = await supabase
                .from('profiles')
                .select('id, email, name')
                .eq('subscription_tier', 'free');
            return data || [];
        }
    },
    {
        id: 'premium_tier',
        label: 'Usuarios Premium',
        description: 'Usuarios con plan premium activo',
        query: async (supabase) => {
            const { data } = await supabase
                .from('profiles')
                .select('id, email, name')
                .eq('subscription_tier', 'premium');
            return data || [];
        }
    },
    {
        id: 'expiring_soon',
        label: 'Suscripción próxima a vencer',
        description: 'Usuarios cuya suscripción vence en los próximos días',
        requiresParams: true,
        paramType: 'days',
        query: async (supabase, params) => {
            const days = params?.days || 7;
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + days);

            const { data } = await supabase
                .from('profiles')
                .select('id, email, name, expiration_date')
                .lte('expiration_date', futureDate.toISOString())
                .gte('expiration_date', new Date().toISOString());
            return data || [];
        }
    },
    {
        id: 'by_role',
        label: 'Por Rol Específico',
        description: 'Filtrar usuarios por cargo (Rector, Coordinador, etc.)',
        requiresParams: true,
        paramType: 'role',
        query: async (supabase, params) => {
            const { data } = await supabase
                .from('profiles')
                .select('id, email, name')
                .eq('role', params?.role || UserRole.RECTOR);
            return data || [];
        }
    },
    {
        id: 'by_area',
        label: 'Por Área Específica (Docentes de Aula)',
        description: 'Filtrar docentes de aula por área de conocimiento',
        requiresParams: true,
        paramType: 'area',
        query: async (supabase, params) => {
            const { data } = await supabase
                .from('profiles')
                .select('id, email, name')
                .eq('role', UserRole.DOCENTE_AULA)
                .eq('area', params?.area || KnowledgeArea.MATEMATICAS);
            return data || [];
        }
    },
    {
        id: 'all_users',
        label: 'Todos los usuarios',
        description: 'Enviar a toda la base de usuarios',
        query: async (supabase) => {
            const { data } = await supabase.from('profiles').select('id,email, name');
            return data || [];
        }
    }
];

export const EmailCampaignTab: React.FC = () => {
    const [selectedFilter, setSelectedFilter] = useState<string>('');
    const [filterParams, setFilterParams] = useState<any>({});
    const [campaignName, setCampaignName] = useState('');
    const [subject, setSubject] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [recipientCount, setRecipientCount] = useState(0);
    const [recipientEmails, setRecipientEmails] = useState<Array<{ id: string, email: string, name: string }>>([]);
    const [isSending, setIsSending] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [resumingId, setResumingId] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Cargar historial de campañas
    useEffect(() => {
        fetchCampaigns();
    }, []);

    // Auto-refresco: mientras haya alguna campaña "enviando", reconciliar cada 7s
    // para que el progreso y el estado se actualicen solos (sin recargar la página).
    useEffect(() => {
        const hasActive = campaigns.some(c => c.status === 'sending' || c.status === 'scheduled');
        if (hasActive && !pollRef.current) {
            pollRef.current = setInterval(() => { refreshCampaigns(true); }, 7000);
        } else if (!hasActive && pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
        };
    }, [campaigns]);

    // Actualizar contador cuando cambie filtro o parámetros
    useEffect(() => {
        if (selectedFilter) {
            updateRecipientCount();
        }
    }, [selectedFilter, filterParams]);

    const fetchCampaigns = async () => {
        const { data } = await supabase
            .from('email_campaigns')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);
        setCampaigns(data || []);
        return data || [];
    };

    // Reconcilia una campaña contra la fuente de verdad (email_recipients):
    // corrige contadores y el estado (p. ej. desatasca un 'sending' ya terminado).
    const reconcileCampaign = async (campaignId: string) => {
        const { error } = await supabase.rpc('reconcile_campaign_stats', {
            p_campaign_id: campaignId
        });
        if (error) console.error('Error reconciliando campaña:', error);
    };

    // Refresca el historial; si hay campañas en curso, las reconcilia primero.
    // silent = true evita el spinner del botón (usado por el auto-refresco).
    const refreshCampaigns = async (silent = false) => {
        if (!silent) setRefreshing(true);
        try {
            const current = campaigns.length ? campaigns : await fetchCampaigns();
            const active = current.filter((c: any) => c.status === 'sending' || c.status === 'scheduled');
            if (active.length > 0) {
                await Promise.all(active.map((c: any) => reconcileCampaign(c.id)));
            }
            await fetchCampaigns();
        } finally {
            if (!silent) setRefreshing(false);
        }
    };

    // Reanuda una campaña con destinatarios pendientes: reconcilia y, si aún
    // quedan pendientes, vuelve a invocar la Edge Function para procesarlos.
    const handleResumeCampaign = async (campaign: any) => {
        setResumingId(campaign.id);
        try {
            await reconcileCampaign(campaign.id);
            const { error } = await supabase.functions.invoke('send-campaign', {
                body: { campaignId: campaign.id }
            });
            if (error) throw error;
            toast.success('Reanudando envío de los pendientes en segundo plano...');
            await fetchCampaigns();
        } catch (error: any) {
            console.error('Error reanudando campaña:', error);
            toast.error('Error al reanudar: ' + (error?.message || 'desconocido'));
        } finally {
            setResumingId(null);
        }
    };

    const updateRecipientCount = async () => {
        const filter = FILTER_OPTIONS.find(f => f.id === selectedFilter);
        if (!filter) return;

        try {
            const users = await filter.query(supabase, filterParams);

            // Excluir usuarios que se dieron de baja
            const { data: unsubscribed } = await supabase
                .from('unsubscribed_users')
                .select('user_id');
            const unsubscribedIds = new Set(unsubscribed?.map((u: any) => u.user_id) || []);

            const validUsers = users.filter(u => !unsubscribedIds.has(u.id));

            setRecipientCount(validUsers.length);
            setRecipientEmails(validUsers);
        } catch (error) {
            console.error('Error counting recipients:', error);
            toast.error('Error contando destinatarios');
        }
    };

    const handleSendCampaign = async () => {
        if (!campaignName || !subject || !htmlContent || recipientCount === 0) {
            toast.error('Por favor completa todos los campos');
            return;
        }

        setIsSending(true);

        try {
            // 1. Obtener usuario actual
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No autenticado');

            // 2. Crear campaña
            const { data: campaign, error: campaignError } = await supabase
                .from('email_campaigns')
                .insert({
                    name: campaignName,
                    subject,
                    html_content: htmlContent,
                    plain_text_content: stripHtml(htmlContent),
                    filter_criteria: { type: selectedFilter, params: filterParams },
                    recipient_count: recipientCount,
                    status: 'scheduled',
                    created_by: user.id
                })
                .select()
                .single();

            if (campaignError) throw campaignError;

            // 3. Crear registros de destinatarios
            const recipients = recipientEmails.map(recipient => ({
                campaign_id: campaign.id,
                user_id: recipient.id,
                email: recipient.email,
                status: 'pending'
            }));

            const { error: recipientsError } = await supabase
                .from('email_recipients')
                .insert(recipients);

            if (recipientsError) throw recipientsError;

            // 4. Llamar Edge Function para enviar
            const { error: sendError } = await supabase.functions.invoke('send-campaign', {
                body: { campaignId: campaign.id }
            });

            if (sendError) throw sendError;

            toast.success(
                `Campaña iniciada: enviando a ${recipientCount} usuarios en segundo plano. El progreso se actualiza solo abajo.`,
                { duration: 6000 }
            );

            // Limpiar formulario
            setCampaignName('');
            setSubject('');
            setHtmlContent('');
            setSelectedFilter('');
            setFilterParams({});
            setRecipientCount(0);
            setRecipientEmails([]);

            fetchCampaigns();
        } catch (error: any) {
            console.error('Error sending campaign:', error);

            // Detección específica de error de sesión (401)
            if (error.message?.includes('non-2xx') || error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                toast.error('Tu sesión ha expirado. Por favor cierra sesión y vuelve a ingresar.', { duration: 5000 });
            } else {
                toast.error('Error enviando campaña: ' + error.message);
            }
        } finally {
            setIsSending(false);
        }
    };

    const handleExportCSV = () => {
        if (recipientEmails.length === 0) {
            toast.error('No hay destinatarios para exportar');
            return;
        }

        const csv = [
            'Nombre,Email',
            ...recipientEmails.map(u => `"${u.name}","${u.email}"`)
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `destinatarios_${selectedFilter}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success('CSV descargado');
    };

    const stripHtml = (html: string) => {
        return html.replace(/<[^>]*>/g, '');
    };

    const handleDeleteCampaign = async (campaignId: string, campaignName: string) => {
        if (!confirm(`¿Estás seguro de eliminar la campaña "${campaignName}"?\n\nEsto eliminará:\n- La campaña\n- Todos los registros de destinatarios\n- El historial de envíos\n\nEsta acción no se puede deshacer.`)) {
            return;
        }

        try {
            const { error } = await supabase
                .from('email_campaigns')
                .delete()
                .eq('id', campaignId);

            if (error) throw error;

            toast.success('Campaña eliminada correctamente');
            fetchCampaigns();
        } catch (error: any) {
            console.error('Error deleting campaign:', error);
            toast.error('Error eliminando campaña: ' + error.message);
        }
    };

    const currentFilter = FILTER_OPTIONS.find(f => f.id === selectedFilter);

    const handleTestEmail = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user?.email) {
                toast.error('No se pudo obtener tu email');
                return;
            }

            toast.loading('Enviando email de prueba...');

            const { data, error } = await supabase.functions.invoke('send-email-ses', {
                body: {
                    to: user.email,
                    subject: 'Test directo - Sistema de Campañas',
                    html: '<p>Hola,</p><p>Este es un <strong>email de prueba</strong> del sistema de campañas.</p><p>Si recibes esto, ¡el sistema funciona correctamente! 🎉</p>',
                    text: 'Este es un email de prueba del sistema de campañas.'
                }
            });

            if (error) throw error;

            console.log('Respuesta de send-email-ses:', data);
            toast.dismiss();
            toast.success(`Email de prueba enviado a ${user.email}. Revisa tu bandeja.`);
        } catch (error: any) {
            toast.dismiss();
            console.error('Error test email:', error);
            toast.error('Error enviando test: ' + error.message);
        }
    };

    return (
        <div className="flex gap-6 h-full overflow-hidden">
            {/* PANEL IZQUIERDO: Editor */}
            <div className="flex-1 bg-white p-6 rounded-xl border border-border-light overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-[#0d141c]">Nueva Campaña de Email</h3>
                    <button
                        onClick={handleTestEmail}
                        className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                        title="Enviar email de prueba a tu correo"
                    >
                        🧪 Test Email
                    </button>
                </div>

                {/* Nombre de campaña */}
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-600 mb-2">Nombre de la Campaña</label>
                    <input
                        type="text"
                        placeholder="Ej: Bienvenida nuevos usuarios - Enero 2026"
                        className="w-full p-3 border border-slate-200 rounded-lg"
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                    />
                </div>

                {/* Filtro de destinatarios */}
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-600 mb-2">
                        Destinatarios
                    </label>
                    <select
                        className="w-full p-3 border border-slate-200 rounded-lg"
                        value={selectedFilter}
                        onChange={(e) => {
                            setSelectedFilter(e.target.value);
                            setFilterParams({});
                        }}
                    >
                        <option value="">Selecciona un filtro...</option>
                        {FILTER_OPTIONS.map(filter => (
                            <option key={filter.id} value={filter.id}>
                                {filter.label}
                            </option>
                        ))}
                    </select>

                    {/* Parámetros adicionales según filtro */}
                    {currentFilter?.requiresParams && currentFilter.paramType === 'role' && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <label className="block text-xs font-bold text-blue-700 mb-2">Selecciona el Rol</label>
                            <select
                                className="w-full p-2 border border-blue-300 rounded-lg text-sm"
                                value={filterParams.role || UserRole.RECTOR}
                                onChange={(e) => setFilterParams({ ...filterParams, role: e.target.value })}
                            >
                                {Object.values(UserRole).map(role => (
                                    <option key={role} value={role}>{role}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {currentFilter?.requiresParams && currentFilter.paramType === 'area' && (
                        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <label className="block text-xs font-bold text-green-700 mb-2">Selecciona el Área</label>
                            <select
                                className="w-full p-2 border border-green-300 rounded-lg text-sm"
                                value={filterParams.area || KnowledgeArea.MATEMATICAS}
                                onChange={(e) => setFilterParams({ ...filterParams, area: e.target.value })}
                            >
                                {Object.values(KnowledgeArea).filter(area => area !== KnowledgeArea.NONE).map(area => (
                                    <option key={area} value={area}>{area}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {currentFilter?.requiresParams && currentFilter.paramType === 'days' && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <label className="block text-xs font-bold text-amber-700 mb-2">Días hasta vencimiento</label>
                            <input
                                type="number"
                                min="1"
                                max="90"
                                className="w-full p-2 border border-amber-300 rounded-lg text-sm"
                                value={filterParams.days || 7}
                                onChange={(e) => setFilterParams({ ...filterParams, days: parseInt(e.target.value) })}
                            />
                            <p className="text-xs text-amber-600 mt-1">
                                Usuarios que vencen en los próximos {filterParams.days || 7} días
                            </p>
                        </div>
                    )}

                    {selectedFilter && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="text-sm text-slate-600">
                                    {currentFilter?.description}
                                </p>
                                <p className="text-xs text-blue-600 font-bold mt-1">
                                    {recipientCount} destinatarios encontrados
                                </p>
                            </div>
                            <button
                                onClick={handleExportCSV}
                                disabled={recipientCount === 0}
                                className="px-3 py-1.5 bg-white border border-slate-200 rounded text-xs font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                📥 Exportar CSV
                            </button>
                        </div>
                    )}
                </div>

                {/* Asunto */}
                <div className="mb-4">
                    <label className="block text-sm font-bold text-slate-600 mb-2">Asunto del Correo</label>
                    <input
                        type="text"
                        placeholder="¡Completa tu primer simulacro! 🎯"
                        className="w-full p-3 border border-slate-200 rounded-lg"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>

                {/* Editor HTML Simple */}
                <div className="mb-6">
                    <label className="block text-sm font-bold text-slate-600 mb-2">Contenido del Email</label>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3 text-xs text-amber-800">
                        <strong>✅ Nota importante:</strong> Se agregará automáticamente al final del correo un enlace para que el usuario pueda darse de baja completamente del sistema (incluyendo eliminación de cuenta y datos).
                    </div>

                    {/* Simple HTML Editor */}
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* Toolbar */}
                        <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setHtmlContent(htmlContent + '<p><strong>Texto en negrita</strong></p>')}
                                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold"
                                title="Negrita"
                            >
                                <strong>B</strong>
                            </button>
                            <button
                                type="button"
                                onClick={() => setHtmlContent(htmlContent + '<p><em>Texto en cursiva</em></p>')}
                                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm italic"
                                title="Cursiva"
                            >
                                I
                            </button>
                            <button
                                type="button"
                                onClick={() => setHtmlContent(htmlContent + '<p><a href="https://fundales.com">Link</a></p>')}
                                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                                title="Agregar Link"
                            >
                                🔗
                            </button>
                            <button
                                type="button"
                                onClick={() => setHtmlContent(htmlContent + '<h2>Título Grande</h2>')}
                                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm font-bold"
                                title="Título"
                            >
                                H2
                            </button>
                            <button
                                type="button"
                                onClick={() => setHtmlContent(htmlContent + '<ul><li>Elemento de lista</li></ul>')}
                                className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                                title="Lista"
                            >
                                📋
                            </button>
                        </div>

                        {/* Textarea */}
                        <textarea
                            value={htmlContent}
                            onChange={(e) => setHtmlContent(e.target.value)}
                            placeholder="Escribe tu mensaje en HTML aquí... Ejemplo: <p>Hola,</p><p><strong>Bienvenido</strong> a nuestro sistema.</p>"
                            className="w-full p-4 font-mono text-sm resize-none border-none focus:outline-none"
                            rows={15}
                            style={{ minHeight: '300px' }}
                        />
                    </div>

                    {/* Preview */}
                    {htmlContent && (
                        <div className="mt-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                            <div className="text-xs font-bold text-slate-600 mb-2">Vista Previa:</div>
                            <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: htmlContent }}
                            />
                        </div>
                    )}
                </div>

                {/* Botones de acción */}
                <div className="flex gap-3">
                    <button
                        onClick={handleSendCampaign}
                        disabled={isSending || recipientCount === 0}
                        className="flex-1 bg-primary text-white py-3 rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending ? '📤 Enviando...' : `📧 Enviar a ${recipientCount} usuarios`}
                    </button>
                </div>
            </div>

            {/* PANEL DERECHO: Historial */}
            <div className="w-1/3 bg-white p-6 rounded-xl border border-border-light overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-[#0d141c]">Campañas Enviadas</h3>
                    <button
                        onClick={() => refreshCampaigns(false)}
                        disabled={refreshing}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                        title="Actualizar y reconciliar el estado real de las campañas"
                    >
                        <span className={`material-symbols-outlined text-base ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
                        {refreshing ? 'Actualizando...' : 'Actualizar'}
                    </button>
                </div>

                {campaigns.length === 0 ? (
                    <p className="text-sm text-slate-400">No hay campañas aún</p>
                ) : (
                    <div className="flex flex-col gap-3">
                        {campaigns.map(campaign => {
                            const total = campaign.recipient_count || 0;
                            const sent = campaign.successful_sends || 0;
                            const failed = campaign.failed_sends || 0;
                            const processed = sent + failed;
                            const pending = Math.max(0, total - processed);
                            const pct = total > 0 ? Math.round((processed / total) * 100) : 0;
                            const statusLabel =
                                campaign.status === 'sent' ? 'Completada' :
                                campaign.status === 'sending' ? 'Enviando' :
                                campaign.status === 'scheduled' ? 'En cola' :
                                campaign.status === 'failed' ? 'Fallida' : campaign.status;

                            return (
                                <div key={campaign.id} className="p-3 border border-slate-200 rounded-lg hover:border-slate-300 transition-colors">
                                    {/* Header con nombre y botón eliminar */}
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="font-bold text-sm text-[#0d141c] flex-1">{campaign.name}</div>
                                        <button
                                            onClick={() => handleDeleteCampaign(campaign.id, campaign.name)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded transition-colors"
                                            title="Eliminar campaña"
                                        >
                                            <span className="material-symbols-outlined text-lg">delete</span>
                                        </button>
                                    </div>

                                    <div className="text-xs text-slate-500 mb-2">{campaign.subject}</div>
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className={`px-2 py-0.5 rounded font-bold flex items-center gap-1 ${campaign.status === 'sent' ? 'bg-green-100 text-green-700' :
                                            campaign.status === 'sending' ? 'bg-blue-100 text-blue-700' :
                                                campaign.status === 'failed' ? 'bg-red-100 text-red-700' :
                                                    'bg-slate-100 text-slate-600'
                                            }`}>
                                            {campaign.status === 'sending' && (
                                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                            )}
                                            {statusLabel}
                                        </span>
                                        <span className="text-slate-400">
                                            {new Date(campaign.created_at).toLocaleDateString('es-CO')}
                                        </span>
                                    </div>

                                    {/* Barra de progreso */}
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-1.5">
                                        <div
                                            className={`h-full rounded-full transition-all ${pending === 0 ? 'bg-green-500' : 'bg-blue-500'}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>

                                    {/* Desglose real */}
                                    <div className="flex items-center justify-between text-xs text-slate-500">
                                        <span>{processed}/{total} procesados ({pct}%)</span>
                                        <span className="flex items-center gap-2">
                                            <span className="text-green-600 font-bold">✅ {sent}</span>
                                            {failed > 0 && <span className="text-red-500 font-bold">❌ {failed}</span>}
                                            {pending > 0 && <span className="text-amber-600 font-bold">⏳ {pending}</span>}
                                        </span>
                                    </div>

                                    {/* Botón Reanudar si quedan pendientes */}
                                    {pending > 0 && (
                                        <button
                                            onClick={() => handleResumeCampaign(campaign)}
                                            disabled={resumingId === campaign.id}
                                            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                                            title="Reanuda el envío de los correos que aún están pendientes"
                                        >
                                            <span className="material-symbols-outlined text-sm">play_arrow</span>
                                            {resumingId === campaign.id ? 'Reanudando...' : `Reanudar (${pending} pendientes)`}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

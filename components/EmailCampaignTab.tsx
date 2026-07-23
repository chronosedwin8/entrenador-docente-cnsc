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

// -----------------------------------------------------------------------------
// IMPORTANTE: Supabase/PostgREST devuelve un MÁXIMO de 1000 filas por consulta.
// Sin paginar, las campañas se cortaban silenciosamente en 1000 destinatarios
// (por eso "Usuarios Free" mostraba 1000 aunque hubiera más).
// Este helper recorre todas las páginas. Se ordena siempre por una columna
// estable (id) para que la paginación no duplique ni omita filas.
// -----------------------------------------------------------------------------
const PAGE_SIZE = 1000;

// Formato mínimo válido: algo@algo.tld (descarta casos como "user@hotmailcom").
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

async function fetchAllPaginated<T = any>(
    buildQuery: (from: number, to: number) => any
): Promise<T[]> {
    let all: T[] = [];
    let from = 0;
    while (true) {
        const { data, error } = await buildQuery(from, from + PAGE_SIZE - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        all = all.concat(data as T[]);
        if (data.length < PAGE_SIZE) break;
        from += PAGE_SIZE;
    }
    return all;
}

/** Consulta paginada sobre `profiles` con columnas estándar. */
const profilesPaged = (supabase: any, apply: (q: any) => any = (q) => q) =>
    fetchAllPaginated((f, t) =>
        apply(supabase.from('profiles').select('id, email, name')).order('id', { ascending: true }).range(f, t)
    );

const FILTER_OPTIONS: FilterOption[] = [
    {
        id: 'no_simulations',
        label: 'Sin simulacros realizados',
        description: 'Usuarios que nunca han completado un simulacro',
        query: async (supabase) => {
            const allUsers = await profilesPaged(supabase);
            const usersWithSims = await fetchAllPaginated((f, t) =>
                supabase.from('simulations').select('user_id').order('user_id', { ascending: true }).range(f, t)
            );
            const idsWithSims = new Set(usersWithSims.map((s: any) => s.user_id));
            return allUsers.filter((u: any) => !idsWithSims.has(u.id));
        }
    },
    {
        id: 'unverified_email',
        label: 'Email no verificado',
        description: 'Usuarios que no han confirmado su correo electrónico',
        query: async (supabase) => {
            // get_unconfirmed_users viene ordenada (ORDER BY created_at DESC),
            // por lo que es segura de paginar.
            try {
                return await fetchAllPaginated((f, t) =>
                    supabase.rpc('get_unconfirmed_users', { search_email: null }).range(f, t)
                );
            } catch (error) {
                console.error('Error fetching unverified users:', error);
                return [];
            }
        }
    },
    {
        id: 'inactive_30days',
        label: 'Inactivos (30+ días)',
        description: 'No han realizado simulacros en el último mes',
        query: async (supabase) => {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            return profilesPaged(supabase, (q) =>
                q.or(`last_simulation_at.is.null,last_simulation_at.lt.${thirtyDaysAgo.toISOString()}`)
            );
        }
    },
    {
        id: 'free_tier',
        label: 'Usuarios Free',
        description: 'Usuarios con plan gratuito',
        // "Free" = todo lo que no sea premium, incluyendo los que tienen el campo nulo.
        query: async (supabase) =>
            profilesPaged(supabase, (q) =>
                q.or('subscription_tier.is.null,subscription_tier.neq.premium')
            )
    },
    {
        id: 'premium_tier',
        label: 'Usuarios Premium',
        description: 'Usuarios con plan premium activo',
        query: async (supabase) =>
            profilesPaged(supabase, (q) => q.eq('subscription_tier', 'premium'))
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
            return profilesPaged(supabase, (q) =>
                q.lte('expiration_date', futureDate.toISOString())
                    .gte('expiration_date', new Date().toISOString())
            );
        }
    },
    {
        id: 'by_role',
        label: 'Por Rol Específico',
        description: 'Filtrar usuarios por cargo (Rector, Coordinador, etc.)',
        requiresParams: true,
        paramType: 'role',
        query: async (supabase, params) =>
            profilesPaged(supabase, (q) => q.eq('role', params?.role || UserRole.RECTOR))
    },
    {
        id: 'by_area',
        label: 'Por Área Específica (Docentes de Aula)',
        description: 'Filtrar docentes de aula por área de conocimiento',
        requiresParams: true,
        paramType: 'area',
        query: async (supabase, params) =>
            profilesPaged(supabase, (q) =>
                q.eq('role', UserRole.DOCENTE_AULA)
                    .eq('area', params?.area || KnowledgeArea.MATEMATICAS)
            )
    },
    {
        id: 'all_users',
        label: 'Todos los usuarios',
        description: 'Enviar a toda la base de usuarios',
        query: async (supabase) => profilesPaged(supabase)
    }
];

export const EmailCampaignTab: React.FC = () => {
    const [selectedFilter, setSelectedFilter] = useState<string>('');
    const [filterParams, setFilterParams] = useState<any>({});
    const [campaignName, setCampaignName] = useState('');
    const [subject, setSubject] = useState('');
    const [htmlContent, setHtmlContent] = useState('');
    const [recipientCount, setRecipientCount] = useState(0);
    const [invalidEmailCount, setInvalidEmailCount] = useState(0);
    const [recipientEmails, setRecipientEmails] = useState<Array<{ id: string, email: string, name: string }>>([]);
    const [isSending, setIsSending] = useState(false);
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [resumingId, setResumingId] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Reporte de fallos
    const [failureReport, setFailureReport] = useState<{
        campaign: any;
        rows: Array<{ email: string; error_message: string | null; status: string }>;
        loading: boolean;
    } | null>(null);
    const [retryingId, setRetryingId] = useState<string | null>(null);

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

            // Excluir usuarios que se dieron de baja (también paginado)
            const unsubscribed = await fetchAllPaginated((f, t) =>
                supabase.from('unsubscribed_users').select('user_id').order('user_id', { ascending: true }).range(f, t)
            );
            const unsubscribedIds = new Set(unsubscribed.map((u: any) => u.user_id));

            // Deduplicar por id y descartar correos con formato inválido
            // (ej. "user@hotmailcom"), que solo generarían fallos garantizados.
            const seen = new Set<string>();
            let invalid = 0;
            const validUsers = users.filter(u => {
                if (!u.id || unsubscribedIds.has(u.id) || seen.has(u.id)) return false;
                seen.add(u.id);
                if (!u.email || !EMAIL_RE.test(u.email.trim())) {
                    invalid++;
                    return false;
                }
                return true;
            });

            setInvalidEmailCount(invalid);
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

            // Insertar por lotes: un insert único de miles de filas puede fallar
            // o exceder límites de payload.
            const INSERT_CHUNK = 500;
            for (let i = 0; i < recipients.length; i += INSERT_CHUNK) {
                const { error: recipientsError } = await supabase
                    .from('email_recipients')
                    .insert(recipients.slice(i, i + INSERT_CHUNK));
                if (recipientsError) throw recipientsError;
            }

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

    // Abre el reporte con el motivo exacto por el que falló cada correo.
    const openFailureReport = async (campaign: any) => {
        setFailureReport({ campaign, rows: [], loading: true });
        try {
            const rows = await fetchAllPaginated<{ email: string; error_message: string | null; status: string }>(
                (f, t) => supabase
                    .from('email_recipients')
                    .select('email, error_message, status')
                    .eq('campaign_id', campaign.id)
                    .in('status', ['failed', 'bounced'])
                    .order('email', { ascending: true })
                    .range(f, t)
            );
            setFailureReport({ campaign, rows, loading: false });
        } catch (error: any) {
            console.error('Error cargando reporte de fallos:', error);
            toast.error('Error cargando el reporte de fallos.');
            setFailureReport(null);
        }
    };

    // Reintenta los correos fallidos: los vuelve a 'pending' y relanza el envío.
    const handleRetryFailed = async (campaign: any) => {
        if (!confirm(`¿Reintentar el envío de los ${campaign.failed_sends} correos fallidos de "${campaign.name}"?`)) return;
        setRetryingId(campaign.id);
        try {
            const { error: resetError } = await supabase
                .from('email_recipients')
                .update({ status: 'pending', error_message: null })
                .eq('campaign_id', campaign.id)
                .in('status', ['failed', 'bounced']);
            if (resetError) throw resetError;

            await reconcileCampaign(campaign.id);
            const { error } = await supabase.functions.invoke('send-campaign', {
                body: { campaignId: campaign.id }
            });
            if (error) throw error;

            toast.success('Reintentando los correos fallidos en segundo plano...');
            setFailureReport(null);
            await fetchCampaigns();
        } catch (error: any) {
            console.error('Error reintentando fallidos:', error);
            toast.error('Error al reintentar: ' + (error?.message || 'desconocido'));
        } finally {
            setRetryingId(null);
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
                                {invalidEmailCount > 0 && (
                                    <p className="text-xs text-amber-600 mt-0.5">
                                        ⚠️ {invalidEmailCount} excluido{invalidEmailCount > 1 ? 's' : ''} por correo mal escrito
                                    </p>
                                )}
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

                            // sent_at se actualiza al final de CADA lote, así que sirve como
                            // "última señal de vida". Si lleva >2 min sin avanzar y aún hay
                            // pendientes, el envío automático se cortó y hay que reanudar.
                            const lastActivity = campaign.sent_at || campaign.created_at;
                            const secondsSinceActivity = lastActivity
                                ? (Date.now() - new Date(lastActivity).getTime()) / 1000
                                : Infinity;
                            const stalled = pending > 0 && secondsSinceActivity > 120;

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
                                            {failed > 0 && (
                                                <button
                                                    onClick={() => openFailureReport(campaign)}
                                                    className="text-red-500 font-bold hover:underline"
                                                    title="Ver por qué fallaron estos correos"
                                                >
                                                    ❌ {failed}
                                                </button>
                                            )}
                                            {pending > 0 && <span className="text-amber-600 font-bold">⏳ {pending}</span>}
                                        </span>
                                    </div>

                                    {/* Estado del envío: automático vs detenido */}
                                    {pending > 0 && (
                                        stalled ? (
                                            <>
                                                <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                                    El envío parece detenido (sin avance {Math.round(secondsSinceActivity / 60)} min). Pulsa reanudar.
                                                </p>
                                                <button
                                                    onClick={() => handleResumeCampaign(campaign)}
                                                    disabled={resumingId === campaign.id}
                                                    className="mt-1.5 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50"
                                                >
                                                    <span className="material-symbols-outlined text-sm">play_arrow</span>
                                                    {resumingId === campaign.id ? 'Reanudando...' : `Reanudar (${pending} pendientes)`}
                                                </button>
                                            </>
                                        ) : (
                                            <p className="mt-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                                Enviando automáticamente... no necesitas hacer nada.
                                            </p>
                                        )
                                    )}

                                    {/* Reintentar fallidos cuando ya terminó */}
                                    {pending === 0 && failed > 0 && (
                                        <button
                                            onClick={() => handleRetryFailed(campaign)}
                                            disabled={retryingId === campaign.id}
                                            className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white border border-red-200 text-red-600 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                        >
                                            <span className="material-symbols-outlined text-sm">replay</span>
                                            {retryingId === campaign.id ? 'Reintentando...' : `Reintentar ${failed} fallidos`}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODAL: Reporte de correos fallidos */}
            {failureReport && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setFailureReport(null)}
                >
                    <div
                        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[88vh] flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-5 border-b border-slate-100 flex items-start justify-between">
                            <div>
                                <h3 className="text-lg font-black text-[#0d141c]">Correos no enviados</h3>
                                <p className="text-sm text-slate-500 mt-0.5">{failureReport.campaign.name}</p>
                            </div>
                            <button onClick={() => setFailureReport(null)} className="p-2 hover:bg-slate-100 rounded-full">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-5 overflow-y-auto flex-1">
                            {failureReport.loading ? (
                                <p className="text-slate-500 text-center py-8">Cargando reporte...</p>
                            ) : failureReport.rows.length === 0 ? (
                                <p className="text-slate-400 text-center py-8">No hay correos fallidos registrados.</p>
                            ) : (
                                <>
                                    {/* Resumen agrupado por motivo */}
                                    <div className="mb-4">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Resumen por motivo</h4>
                                        <div className="flex flex-col gap-1.5">
                                            {Object.entries(
                                                failureReport.rows.reduce((acc: Record<string, number>, r) => {
                                                    const key = (r.error_message || 'Sin detalle registrado').slice(0, 120);
                                                    acc[key] = (acc[key] || 0) + 1;
                                                    return acc;
                                                }, {})
                                            )
                                                .sort(([, a], [, b]) => b - a)
                                                .map(([msg, count]) => (
                                                    <div key={msg} className="flex items-start gap-2 text-xs bg-red-50 border border-red-100 rounded p-2">
                                                        <span className="font-black text-red-600 shrink-0">{count}×</span>
                                                        <span className="text-red-800 break-words">{msg}</span>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>

                                    {/* Detalle por destinatario */}
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">
                                        Detalle ({failureReport.rows.length})
                                    </h4>
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-slate-500 font-bold">
                                                <tr>
                                                    <th className="p-2.5">Correo</th>
                                                    <th className="p-2.5">Motivo</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {failureReport.rows.map((r, i) => (
                                                    <tr key={`${r.email}-${i}`} className="hover:bg-slate-50">
                                                        <td className="p-2.5 font-medium text-slate-700 break-all">{r.email}</td>
                                                        <td className="p-2.5 text-slate-500 break-words">
                                                            {r.error_message || 'Sin detalle registrado'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                onClick={() => setFailureReport(null)}
                                className="px-4 py-2 text-slate-600 font-bold text-sm rounded-lg hover:bg-slate-100"
                            >
                                Cerrar
                            </button>
                            {failureReport.rows.length > 0 && (
                                <button
                                    onClick={() => handleRetryFailed(failureReport.campaign)}
                                    disabled={retryingId === failureReport.campaign.id}
                                    className="px-4 py-2 bg-red-600 text-white font-bold text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-base">replay</span>
                                    Reintentar estos {failureReport.rows.length}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

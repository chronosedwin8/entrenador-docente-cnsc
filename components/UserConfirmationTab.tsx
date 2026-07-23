import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

interface UnconfirmedUser {
    id: string;
    email: string;
    name: string;
    role: string;
    created_at: string;
    last_sign_in_at: string | null;
}

export const UserConfirmationTab: React.FC = () => {
    const [users, setUsers] = useState<UnconfirmedUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());
    const [bulkConfirming, setBulkConfirming] = useState(false);

    const fetchUnconfirmed = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_unconfirmed_users', {
                search_email: null
            });
            if (error) throw error;
            setUsers((data as UnconfirmedUser[]) || []);
            setSelectedIds(new Set());
        } catch (error: any) {
            console.error('Error fetching unconfirmed users:', error);
            toast.error(error?.message?.includes('Unauthorized')
                ? 'No tienes permisos de administrador.'
                : 'Error cargando usuarios sin confirmar.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUnconfirmed();
    }, [fetchUnconfirmed]);

    // Client-side search filter (por correo o nombre)
    const filteredUsers = users.filter(u => {
        const term = searchTerm.trim().toLowerCase();
        if (!term) return true;
        return (
            u.email?.toLowerCase().includes(term) ||
            u.name?.toLowerCase().includes(term)
        );
    });

    const allVisibleSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));

    const toggleSelectAll = () => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                filteredUsers.forEach(u => next.delete(u.id));
            } else {
                filteredUsers.forEach(u => next.add(u.id));
            }
            return next;
        });
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const confirmUsers = async (ids: string[]) => {
        if (ids.length === 0) return;
        try {
            const { data, error } = await supabase.rpc('confirm_users_manually', {
                user_ids: ids
            });
            if (error) throw error;

            const confirmedCount = (data as { confirmed_id: string }[])?.length ?? ids.length;
            // Quitar de la lista los usuarios confirmados
            const idSet = new Set(ids);
            setUsers(prev => prev.filter(u => !idSet.has(u.id)));
            setSelectedIds(prev => {
                const next = new Set(prev);
                ids.forEach(id => next.delete(id));
                return next;
            });
            toast.success(
                confirmedCount === 1
                    ? 'Usuario confirmado correctamente.'
                    : `${confirmedCount} usuarios confirmados correctamente.`
            );
        } catch (error: any) {
            console.error('Error confirming users:', error);
            toast.error(error?.message?.includes('Unauthorized')
                ? 'No tienes permisos de administrador.'
                : 'Error confirmando usuarios.');
        }
    };

    const handleConfirmSingle = async (id: string) => {
        setConfirmingIds(prev => new Set(prev).add(id));
        await confirmUsers([id]);
        setConfirmingIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleConfirmSelected = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) {
            toast.error('Selecciona al menos un usuario.');
            return;
        }
        if (!confirm(`¿Confirmar manualmente ${ids.length} usuario(s)? Podrán iniciar sesión inmediatamente.`)) return;
        setBulkConfirming(true);
        await confirmUsers(ids);
        setBulkConfirming(false);
    };

    const handleConfirmAllFiltered = async () => {
        const ids = filteredUsers.map(u => u.id);
        if (ids.length === 0) return;
        if (!confirm(`¿Confirmar TODOS los ${ids.length} usuarios de la lista actual? Podrán iniciar sesión inmediatamente.`)) return;
        setBulkConfirming(true);
        await confirmUsers(ids);
        setBulkConfirming(false);
    };

    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header / Info */}
            <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <span className="material-symbols-outlined text-amber-600 mt-0.5">mark_email_unread</span>
                <div className="text-sm text-amber-800">
                    <p className="font-bold mb-0.5">Confirmación manual de correo</p>
                    <p className="text-amber-700">
                        Aquí aparecen los usuarios que se registraron pero <strong>no han confirmado su correo</strong>.
                        Confírmalos manualmente (uno a uno o de forma masiva) para que puedan iniciar sesión.
                        El proceso normal de verificación por email sigue activo.
                    </p>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white rounded-xl border border-border-light shadow-sm overflow-hidden flex-1 flex flex-col">
                <div className="p-4 border-b border-border-light flex gap-3 bg-slate-50 items-center flex-wrap">
                    <div className="relative flex-1 min-w-[220px]">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            type="text"
                            placeholder="Buscar por correo o nombre..."
                            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <button
                        onClick={fetchUnconfirmed}
                        disabled={loading}
                        className="px-3 py-2 rounded-lg border border-slate-300 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        title="Recargar lista"
                    >
                        <span className="material-symbols-outlined text-lg">refresh</span>
                        Recargar
                    </button>

                    <button
                        onClick={handleConfirmSelected}
                        disabled={bulkConfirming || selectedIds.size === 0}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-lg">how_to_reg</span>
                        Confirmar seleccionados ({selectedIds.size})
                    </button>

                    <button
                        onClick={handleConfirmAllFiltered}
                        disabled={bulkConfirming || filteredUsers.length === 0}
                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Confirma todos los usuarios que se muestran actualmente"
                    >
                        <span className="material-symbols-outlined text-lg">done_all</span>
                        Confirmar todos ({filteredUsers.length})
                    </button>

                    <span className="text-sm text-slate-500 whitespace-nowrap ml-auto">
                        {filteredUsers.length} sin confirmar
                    </span>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1">
                    {loading ? (
                        <div className="p-10 text-center text-slate-500">Cargando usuarios sin confirmar...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-16 text-center text-slate-400">
                            <span className="material-symbols-outlined text-5xl mb-2 text-green-400">verified</span>
                            <p className="font-bold text-slate-500">
                                {users.length === 0
                                    ? '¡No hay usuarios pendientes de confirmar!'
                                    : 'Ningún usuario coincide con la búsqueda.'}
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 w-10">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectAll}
                                            className="size-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                        />
                                    </th>
                                    <th className="p-4">Correo</th>
                                    <th className="p-4">Nombre</th>
                                    <th className="p-4">Rol</th>
                                    <th className="p-4">Registro</th>
                                    <th className="p-4 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(user.id)}
                                                onChange={() => toggleSelect(user.id)}
                                                className="size-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-[#0d141c] max-w-[260px] truncate" title={user.email}>
                                                {user.email || '-'}
                                            </div>
                                            <div className="text-xs text-slate-400">{user.id.substring(0, 8)}...</div>
                                        </td>
                                        <td className="p-4 text-slate-600">{user.name}</td>
                                        <td className="p-4 text-slate-600">{user.role}</td>
                                        <td className="p-4 text-slate-600">{formatDate(user.created_at)}</td>
                                        <td className="p-4 text-right">
                                            <button
                                                onClick={() => handleConfirmSingle(user.id)}
                                                disabled={confirmingIds.has(user.id) || bulkConfirming}
                                                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                                            >
                                                <span className="material-symbols-outlined text-sm">check</span>
                                                {confirmingIds.has(user.id) ? 'Confirmando...' : 'Confirmar'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

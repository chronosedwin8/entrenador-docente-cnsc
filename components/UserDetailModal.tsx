import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';
import { UserProfile, UserRole, SystemRole, SubscriptionTier, KnowledgeArea } from '../types';

interface Transaction {
    id: string;
    plan_name: 'basico' | 'intermedio' | 'avanzado';
    amount_in_cents: number;
    currency: string;
    status: string;
    payment_method_type: string | null;
    includes_interview: boolean;
    created_at: string;
    updated_at: string;
}

const PLAN_LABELS: Record<string, string> = {
    basico: 'Básico',
    intermedio: 'Intermedio',
    avanzado: 'Avanzado'
};

const formatCOP = (cents: number, currency = 'COP') =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: currency || 'COP',
        maximumFractionDigits: 0
    }).format((cents || 0) / 100);

interface UserDetailModalProps {
    user: UserProfile;
    simulationCount: number;
    onClose: () => void;
    onUpdate: (userId: string, updates: Partial<UserProfile>) => void;
    onDeleteHistory: (userId: string) => void;
    onResetInterview: (userId: string) => void;
    onDeleteUser: (userId: string) => void;
}

export const UserDetailModal: React.FC<UserDetailModalProps> = ({
    user,
    simulationCount,
    onClose,
    onUpdate,
    onDeleteHistory,
    onResetInterview,
    onDeleteUser
}) => {
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Historial de pagos (solo relevante para premium)
    const [payments, setPayments] = useState<Transaction[]>([]);
    const [loadingPayments, setLoadingPayments] = useState(false);

    useEffect(() => {
        if (user.subscription_tier !== 'premium') return;
        let active = true;
        (async () => {
            setLoadingPayments(true);
            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'APPROVED')
                .order('created_at', { ascending: false });
            if (!active) return;
            if (error) {
                console.error('Error fetching transactions:', error);
            } else {
                setPayments((data as Transaction[]) || []);
            }
            setLoadingPayments(false);
        })();
        return () => { active = false; };
    }, [user.id, user.subscription_tier]);

    const handleSetPassword = async () => {
        if (newPassword.trim().length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        if (!confirm(`¿Cambiar la contraseña de ${user.email || user.name}? El usuario deberá usar la nueva clave para iniciar sesión.`)) return;

        setSavingPassword(true);
        try {
            const { error } = await supabase.rpc('admin_set_user_password', {
                target_user_id: user.id,
                new_password: newPassword.trim()
            });
            if (error) throw error;
            toast.success('Contraseña actualizada correctamente.');
            setNewPassword('');
            setShowPassword(false);
        } catch (error: any) {
            console.error('Error setting password:', error);
            toast.error(
                error?.message?.includes('Unauthorized')
                    ? 'No tienes permisos de administrador.'
                    : (error?.message || 'Error al cambiar la contraseña.')
            );
        } finally {
            setSavingPassword(false);
        }
    };

    const generateRandomPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
        let pass = '';
        const values = new Uint32Array(10);
        crypto.getRandomValues(values);
        for (let i = 0; i < 10; i++) pass += chars[values[i] % chars.length];
        setNewPassword(pass);
        setShowPassword(true);
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return 'No registrada';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-black text-[#0d141c]">{user.name}</h2>
                        <p className="text-sm text-slate-500 mt-1">{user.email || 'Sin correo'}</p>
                        <p className="text-xs text-slate-400 mt-1 font-mono">ID: {user.id}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Stats Row */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 font-bold uppercase">Simulacros Realizados</p>
                            <p className="text-3xl font-black text-primary mt-1">{simulationCount}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-500 font-bold uppercase">Plan Actual</p>
                            <p className={`text-xl font-black mt-1 ${user.subscription_tier === 'premium' ? 'text-amber-600' : 'text-slate-600'}`}>
                                {user.subscription_tier === 'premium' ? '⭐ Premium' : 'Básico (Free)'}
                            </p>
                        </div>
                    </div>

                    {/* Dates Info */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-blue-800 text-sm mb-3 flex items-center gap-2">
                            <span className="material-symbols-outlined text-lg">calendar_month</span>
                            Información de Registro
                        </h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <p className="text-blue-600 text-xs">Fecha de Registro</p>
                                <p className="font-bold text-blue-900">{formatDate(user.created_at)}</p>
                            </div>
                            <div>
                                <p className="text-blue-600 text-xs">Vencimiento</p>
                                <p className="font-bold text-blue-900">{formatDate(user.expiration_date)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Información de Pago (solo Premium) */}
                    {user.subscription_tier === 'premium' && (
                        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                            <h3 className="font-bold text-amber-800 text-sm mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">payments</span>
                                Información de Pago
                            </h3>

                            {loadingPayments ? (
                                <p className="text-sm text-amber-700">Cargando pagos...</p>
                            ) : payments.length === 0 ? (
                                <div className="text-sm text-amber-700 bg-amber-100/60 rounded-lg p-3">
                                    <p className="font-bold">Sin registro de pago</p>
                                    <p className="text-xs text-amber-600 mt-0.5">
                                        Este usuario es Premium pero no tiene una transacción registrada
                                        (probablemente activado manualmente o antes del registro de pagos).
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {payments.map((tx, idx) => (
                                        <div
                                            key={tx.id}
                                            className={`rounded-lg p-3 border ${idx === 0 ? 'bg-white border-amber-200' : 'bg-amber-50/50 border-amber-100'}`}
                                        >
                                            {idx === 0 && payments.length > 1 && (
                                                <span className="text-[10px] font-bold text-amber-600 uppercase">Último pago</span>
                                            )}
                                            <div className="grid grid-cols-2 gap-3 text-sm mt-1">
                                                <div>
                                                    <p className="text-amber-600 text-xs">Plan pagado</p>
                                                    <p className="font-bold text-amber-900">
                                                        {PLAN_LABELS[tx.plan_name] || tx.plan_name}
                                                        {tx.includes_interview && (
                                                            <span className="ml-1 text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold align-middle">
                                                                + Entrevista
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-amber-600 text-xs">Monto pagado</p>
                                                    <p className="font-black text-green-700">{formatCOP(tx.amount_in_cents, tx.currency)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-amber-600 text-xs">Fecha de pago</p>
                                                    <p className="font-bold text-amber-900">{formatDate(tx.updated_at || tx.created_at)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-amber-600 text-xs">Método</p>
                                                    <p className="font-bold text-amber-900">{tx.payment_method_type || '—'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Editable Fields */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-[#0d141c] text-sm uppercase tracking-wide">Configuración del Usuario</h3>

                        {/* System Role */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <label className="text-sm font-medium text-slate-700">Rol del Sistema</label>
                            <select
                                value={user.system_role}
                                onChange={(e) => onUpdate(user.id, { system_role: e.target.value as SystemRole })}
                                className={`px-3 py-2 rounded-lg border text-sm font-bold ${user.system_role === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                            >
                                <option value="user">Usuario</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>

                        {/* Exam Role */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <label className="text-sm font-medium text-slate-700">Rol para Examen</label>
                            <select
                                value={user.role}
                                onChange={(e) => {
                                    const newRole = e.target.value as UserRole;
                                    const updates: Partial<UserProfile> = { role: newRole };
                                    if (newRole !== UserRole.DOCENTE_AULA) {
                                        updates.area = KnowledgeArea.NONE;
                                    }
                                    onUpdate(user.id, updates);
                                }}
                                className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white max-w-[200px]"
                            >
                                {Object.values(UserRole).map(r => (
                                    <option key={r} value={r}>{r}</option>
                                ))}
                            </select>
                        </div>

                        {/* Area (only for Docente de Aula) */}
                        {user.role === UserRole.DOCENTE_AULA && (
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <label className="text-sm font-medium text-slate-700">Área del Saber</label>
                                <select
                                    value={user.area}
                                    onChange={(e) => onUpdate(user.id, { area: e.target.value as KnowledgeArea })}
                                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white max-w-[200px]"
                                >
                                    {Object.values(KnowledgeArea)
                                        .filter(area => area !== KnowledgeArea.NONE)
                                        .map(area => (
                                            <option key={area} value={area}>{area}</option>
                                        ))}
                                </select>
                            </div>
                        )}

                        {/* Subscription Tier */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <label className="text-sm font-medium text-slate-700">Plan de Suscripción</label>
                            <select
                                value={user.subscription_tier}
                                onChange={(e) => onUpdate(user.id, { subscription_tier: e.target.value as SubscriptionTier })}
                                className={`px-3 py-2 rounded-lg border text-sm font-bold ${user.subscription_tier === 'premium' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}
                            >
                                <option value="free">Básico (Free)</option>
                                <option value="premium">Premium</option>
                            </select>
                        </div>

                        {/* Expiration Date */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <label className="text-sm font-medium text-slate-700">Fecha de Vencimiento</label>
                            <input
                                type="date"
                                className="px-3 py-2 rounded-lg border border-slate-200 text-sm w-40"
                                value={user.expiration_date ? new Date(user.expiration_date).toISOString().split('T')[0] : ''}
                                onChange={(e) => onUpdate(user.id, { expiration_date: new Date(e.target.value).toISOString() })}
                            />
                        </div>

                        {/* Interview Access Toggle */}
                        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <label className="text-sm font-medium text-slate-700 flex flex-col">
                                <span>Acceso a Entrevista</span>
                                <span className="text-[10px] text-slate-400 font-normal">Habilita el módulo para este usuario</span>
                            </label>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={user.has_interview_access || false}
                                    onChange={(e) => onUpdate(user.id, { has_interview_access: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                            </label>
                        </div>


                        {/* Custom Limits */}
                        <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                            <h4 className="font-bold text-indigo-800 text-sm mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">tune</span>
                                Límites Personalizados
                            </h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="text-xs text-indigo-600 font-bold block mb-1">Diario</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 text-center border rounded-lg text-sm font-bold"
                                        defaultValue={user.custom_daily_limit ?? 1}
                                        onBlur={(e) => onUpdate(user.id, { custom_daily_limit: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-indigo-600 font-bold block mb-1">Mensual</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 text-center border rounded-lg text-sm font-bold"
                                        defaultValue={user.custom_monthly_limit ?? 2}
                                        onBlur={(e) => onUpdate(user.id, { custom_monthly_limit: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-indigo-600 font-bold block mb-1">Preguntas</label>
                                    <input
                                        type="number"
                                        className="w-full p-2 text-center border rounded-lg text-sm font-bold bg-indigo-100 text-indigo-700"
                                        defaultValue={user.custom_question_limit ?? (user.subscription_tier === 'premium' ? 50 : 5)}
                                        onBlur={(e) => onUpdate(user.id, { custom_question_limit: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Cambiar Contraseña */}
                        <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
                            <h4 className="font-bold text-rose-800 text-sm mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">key</span>
                                Cambiar Contraseña
                            </h4>
                            <p className="text-[11px] text-rose-600/80 mb-3">
                                Establece una nueva contraseña para este usuario (soporte para quienes la olvidaron).
                                Deberás comunicársela para que inicie sesión.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Nueva contraseña (mín. 6 caracteres)"
                                        className="w-full p-2 pr-10 border border-rose-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                                        autoComplete="new-password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(v => !v)}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                                    >
                                        <span className="material-symbols-outlined text-lg">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                                <button
                                    type="button"
                                    onClick={generateRandomPassword}
                                    className="px-3 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100 transition-colors whitespace-nowrap"
                                    title="Generar una contraseña aleatoria"
                                >
                                    Generar
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSetPassword}
                                    disabled={savingPassword || newPassword.trim().length < 6}
                                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-bold hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {savingPassword ? 'Guardando...' : 'Cambiar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-3 justify-end">
                    <button
                        onClick={() => onDeleteHistory(user.id)}
                        className="px-4 py-2 bg-orange-50 text-orange-600 font-bold rounded-lg hover:bg-orange-100 transition-colors flex items-center gap-2 text-sm"
                    >
                        <span className="material-symbols-outlined text-lg">history_toggle_off</span>
                        Borrar Historial
                    </button>
                    <button
                        onClick={() => onResetInterview(user.id)}
                        className="px-4 py-2 bg-purple-50 text-purple-600 font-bold rounded-lg hover:bg-purple-100 transition-colors flex items-center gap-2 text-sm"
                        title="Borrar el registro de la última entrevista para permitir un nuevo intento"
                    >
                        <span className="material-symbols-outlined text-lg">replay</span>
                        Reset Entrevista
                    </button>
                    <button
                        onClick={() => onDeleteUser(user.id)}
                        className="px-4 py-2 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2 text-sm"
                    >
                        <span className="material-symbols-outlined text-lg">delete</span>
                        Eliminar Usuario
                    </button>
                </div>
            </div>
        </div>
    );
};

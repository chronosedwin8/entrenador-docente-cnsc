import React from 'react';
import { UserProfile, UserRole, SystemRole, SubscriptionTier, KnowledgeArea } from '../types';

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

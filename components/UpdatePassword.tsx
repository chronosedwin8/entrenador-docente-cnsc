import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';

interface UpdatePasswordProps {
    onSuccess: () => void;
}

export const UpdatePassword: React.FC<UpdatePasswordProps> = ({ onSuccess }) => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUpdate = async () => {
        setLoading(true);
        setError('');
        try {
            if (!password) throw new Error("Por favor ingresa tu nueva contraseña.");
            if (password.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres.");

            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;

            toast.success("Contraseña actualizada exitosamente.");
            onSuccess();
        } catch (e: any) {
            setError(e.message || "Error actualizando contraseña.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background-light p-6">
            <div className="bg-white p-8 rounded-2xl shadow-xl border border-border-light max-w-md w-full">
                <div className="flex flex-col gap-4 text-center mb-6">
                    <div className="size-12 rounded-full bg-blue-50 text-primary flex items-center justify-center mx-auto">
                        <span className="material-symbols-outlined text-2xl">lock_reset</span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-[#0d141c]">Nueva Contraseña</h2>
                        <p className="text-slate-500">Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.</p>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4 border border-red-100">
                        {error}
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm text-[#0d141c]">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nueva contraseña"
                            className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-primary focus:ring-primary outline-none transition-all"
                        />
                    </div>

                    <button
                        onClick={handleUpdate}
                        disabled={loading}
                        className="h-14 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
                    </button>
                </div>
            </div>
        </div>
    );
};

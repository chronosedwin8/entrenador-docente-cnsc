import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserRole, KnowledgeArea, UserProfile } from '../types';
import { supabase } from '../services/supabase';

interface OnboardingProps {
    onComplete: (profile: UserProfile) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
    const [isLogin, setIsLogin] = useState(false);
    const [isResetPassword, setIsResetPassword] = useState(false);
    const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
    const [showResend, setShowResend] = useState(false);

    // Form fields
    const [role, setRole] = useState<UserRole | ''>('');
    const [area, setArea] = useState<KnowledgeArea | ''>('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        checkCurrentSession();
    }, []);

    const checkCurrentSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            // User is authenticated but we are in Onboarding component
            // This means App.tsx couldn't find a profile for them.
            // We should engage "Complete Profile" mode.
            setNeedsProfileSetup(true);
            setIsLogin(false);
        }
    };

    const handleCompleteProfile = async () => {
        setLoading(true);
        setError('');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No se encontró sesión activa.");

            if (!name || !role) throw new Error("Nombre y Cargo son obligatorios.");
            if (role === UserRole.DOCENTE_AULA && !area) throw new Error("El área es obligatoria para docentes.");

            const { error: upsertError } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    name,
                    role,
                    area: area || KnowledgeArea.NONE
                }, { onConflict: 'id' });

            if (upsertError) throw upsertError;

            // Success
            onComplete({
                name,
                role: role as UserRole,
                area: (area || KnowledgeArea.NONE) as KnowledgeArea
            });

        } catch (e: any) {
            setError(e.message || "Error guardando perfil.");
        } finally {
            setLoading(false);
        }
    };

    const handleAuth = async () => {
        setLoading(true);
        setError('');
        try {
            if (isLogin) {
                // LOGIN FLOW
                const { data, error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                if (data.user) {
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    if (!profile) {
                        // Authenticated but no profile -> Switch to Setup Mode
                        setNeedsProfileSetup(true);
                        setIsLogin(false);
                        setLoading(false);
                        return;
                    }

                    onComplete({
                        name: profile.name,
                        role: profile.role as UserRole,
                        area: profile.area as KnowledgeArea
                    });
                }
            } else {
                // REGISTER FLOW
                if (!role || !name || !email || !password) {
                    throw new Error("Por favor completa todos los campos.");
                }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: window.location.origin,
                        data: {
                            name,
                            role,
                            area: area || KnowledgeArea.NONE
                        }
                    }
                });

                if (error) throw error;

                if (data.user) {
                    // Try manual upsert as fallback
                    if (data.session) {
                        await supabase.from('profiles').upsert({
                            id: data.user.id,
                            name,
                            role,
                            area: area || KnowledgeArea.NONE
                        }, { onConflict: 'id' });
                    }

                    if (!data.session) {
                        toast.success("Registro exitoso. Por favor verifica tu correo electrónico.");
                        setIsLogin(true);
                        return;
                    }

                    // Check profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', data.user.id)
                        .maybeSingle();

                    if (!profile) {
                        // Still no profile? Force setup mode
                        setNeedsProfileSetup(true);
                        setLoading(false);
                        return;
                    }

                    onComplete({
                        name: name,
                        role: role as UserRole,
                        area: (area || KnowledgeArea.NONE) as KnowledgeArea
                    });
                }
            }
        } catch (err: any) {
            const message = err.message || "Ocurrió un error inesperado.";
            setError(message);
            if (message.includes("Email not confirmed") || message.includes("not confirmed")) {
                setShowResend(true);
            } else {
                setShowResend(false);
            }
        } finally {
            if (!needsProfileSetup) setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        setLoading(true);
        setError('');
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email,
                options: {
                    emailRedirectTo: window.location.origin
                }
            });
            if (error) throw error;
            toast.success("Correo de verificación reenviado. Revisa tu bandeja.");
            setShowResend(false);
        } catch (err: any) {
            setError(err.message || "Error reenviando correo.");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        setLoading(true);
        setError('');
        try {
            if (!email) throw new Error("Por favor ingresa tu correo electrónico.");

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin,
            });

            if (error) throw error;

            toast.success("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.");
            setIsResetPassword(false);
            setIsLogin(true);
        } catch (err: any) {
            setError(err.message || "Error enviando correo de recuperación.");
        } finally {
            setLoading(false);
        }
    };

    const showAreaSelect = role === UserRole.DOCENTE_AULA;

    return (
        <div className="flex flex-col lg:flex-row h-full flex-1">
            {/* Form Section */}
            <div className="flex-1 flex flex-col justify-center px-6 lg:px-24 py-10 bg-background-light overflow-y-auto">
                <div className="max-w-md w-full mx-auto flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <span className="inline-block px-3 py-1 rounded-full bg-blue-100 text-primary text-xs font-bold w-fit">
                            {needsProfileSetup ? 'Completar Registro' : (isLogin ? 'Bienvenido de nuevo' : 'Paso 1 de 3')}
                        </span>
                        <h1 className="text-4xl font-black text-[#0d141c] tracking-tight">
                            {needsProfileSetup ? 'Finaliza tu Perfil' : (isResetPassword ? 'Recuperar Contraseña' : (isLogin ? 'Inicia Sesión' : 'Crea tu Cuenta'))}
                        </h1>
                        <p className="text-slate-500 text-lg">
                            {needsProfileSetup
                                ? 'Necesitamos unos datos extra para personalizar tus simulacros.'
                                : (isResetPassword
                                    ? 'Ingresa tu correo para recibir instrucciones.'
                                    : (isLogin ? 'Accede a tu historial y simulacros.' : 'Configura tu perfil para un entrenamiento personalizado.'))}
                        </p>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100 flex flex-col gap-2">
                            <span>{error}</span>
                            {showResend && (
                                <button
                                    onClick={handleResendEmail}
                                    className="text-primary font-bold hover:underline text-left"
                                >
                                    Reenviar correo de verificación
                                </button>
                            )}
                        </div>
                    )}

                    <form
                        className="flex flex-col gap-4 mt-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            if (needsProfileSetup) {
                                handleCompleteProfile();
                            } else if (isResetPassword) {
                                handlePasswordReset();
                            } else {
                                handleAuth();
                            }
                        }}
                    >
                        {/* Profile Fields: Show if Registering OR Needs Setup */}
                        {(!isLogin || needsProfileSetup) && !isResetPassword && (
                            <>
                                <div className="flex flex-col gap-2">
                                    <label className="font-bold text-sm text-[#0d141c]">Nombre del Aspirante</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Tu nombre completo"
                                        className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-primary focus:ring-primary outline-none transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="font-bold text-sm text-[#0d141c] flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-lg">badge</span>
                                        Cargo a Aspirar
                                    </label>
                                    <select
                                        value={role}
                                        onChange={(e) => {
                                            setRole(e.target.value as UserRole);
                                            if (e.target.value !== UserRole.DOCENTE_AULA) setArea(KnowledgeArea.NONE);
                                        }}
                                        className="w-full h-14 px-4 rounded-xl border border-slate-300 bg-white focus:border-primary focus:ring-primary outline-none appearance-none"
                                    >
                                        <option value="" disabled>Selecciona tu rol</option>
                                        {Object.values(UserRole).map((r) => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>

                                {showAreaSelect && (
                                    <div className="flex flex-col gap-2 animate-fade-in">
                                        <label className="font-bold text-sm text-[#0d141c] flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-lg">category</span>
                                            Área de Conocimiento
                                        </label>
                                        <select
                                            value={area}
                                            onChange={(e) => setArea(e.target.value as KnowledgeArea)}
                                            className="w-full h-14 px-4 rounded-xl border border-slate-300 bg-white focus:border-primary focus:ring-primary outline-none appearance-none"
                                        >
                                            <option value="" disabled>Selecciona el área</option>
                                            {Object.values(KnowledgeArea).filter(a => a !== KnowledgeArea.NONE).map((a) => (
                                                <option key={a} value={a}>{a}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Reset Password Field */}
                        {isResetPassword && (
                            <div className="flex flex-col gap-2">
                                <label className="font-bold text-sm text-[#0d141c]">Correo Electrónico</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ejemplo@correo.com"
                                    className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-primary focus:ring-primary outline-none transition-all"
                                />
                            </div>
                        )}

                        {/* Auth Fields: Show only if NOT Needs Setup AND NOT Reset Password */}
                        {!needsProfileSetup && !isResetPassword && (
                            <>
                                <div className="flex flex-col gap-2">
                                    <label className="font-bold text-sm text-[#0d141c]">Correo Electrónico</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="ejemplo@correo.com"
                                        className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-primary focus:ring-primary outline-none transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="font-bold text-sm text-[#0d141c]">Contraseña</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full h-12 px-4 pr-12 rounded-xl border border-slate-300 focus:border-primary focus:ring-primary outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            tabIndex={-1}
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? 'visibility_off' : 'visibility'}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-4 h-14 bg-primary text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <>
                                    <span>{needsProfileSetup ? 'Guardar Perfil' : (isResetPassword ? 'Enviar Enlace' : (isLogin ? 'Ingresar' : 'Configurar Cuenta'))}</span>
                                    <span className="material-symbols-outlined">{needsProfileSetup ? 'check_circle' : 'arrow_forward'}</span>
                                </>
                            )}
                        </button>

                        {!needsProfileSetup && (
                            <div className="flex flex-col items-center gap-2 mt-4">
                                {!isResetPassword && isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsResetPassword(true);
                                            setError('');
                                        }}
                                        className="text-sm font-medium text-slate-500 hover:text-primary transition-colors"
                                    >
                                        ¿Olvidaste tu contraseña?
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isResetPassword) {
                                            setIsResetPassword(false);
                                            setIsLogin(true);
                                        } else {
                                            setIsLogin(!isLogin);
                                        }
                                        setError('');
                                    }}
                                    className="text-sm text-slate-500 hover:text-primary underline"
                                >
                                    {isResetPassword
                                        ? 'Volver al inicio de sesión'
                                        : (isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión')}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Visual Section */}
            <div className="hidden lg:flex flex-1 bg-surface items-center justify-center p-10 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=2073&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
                <div className="relative z-10 max-w-lg">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-border-light">
                            <div className="size-12 rounded-lg bg-blue-50 text-primary flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-2xl">gavel</span>
                            </div>
                            <h3 className="font-bold text-lg mb-2">Motor Normativo</h3>
                            <p className="text-sm text-slate-500">Preguntas generadas basándose estrictamente en Ley 115, Decreto 1278 y 1075.</p>
                        </div>
                        <div className="bg-white p-6 rounded-2xl shadow-xl border border-border-light mt-8">
                            <div className="size-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-2xl">psychology</span>
                            </div>
                            <h3 className="font-bold text-lg mb-2">IA Situacional</h3>
                            <p className="text-sm text-slate-500">Casos pedagógicos realistas adaptados a tu cargo específico.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

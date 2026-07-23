import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

type ResultState = 'verifying' | 'activated' | 'pending' | 'failed' | 'not_found';

interface PaymentResultProps {
    // reference from our own redirectUrl query param
    paymentReference: string;
    // wompi_transaction_id from Wompi's redirect (id param)
    wompiTransactionId?: string;
    onDone: () => void;
}

export const PaymentResult: React.FC<PaymentResultProps> = ({
    paymentReference,
    wompiTransactionId,
    onDone
}) => {
    const [state, setState] = useState<ResultState>('verifying');
    const [planName, setPlanName] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string>('');

    useEffect(() => {
        verify();
    }, [paymentReference]);

    const verify = async () => {
        setState('verifying');
        try {
            const body: any = {};
            if (paymentReference) body.reference = paymentReference;
            else if (wompiTransactionId) body.wompi_transaction_id = wompiTransactionId;

            const { data, error } = await supabase.functions.invoke('verify-and-activate-payment', { body });

            if (error) {
                setState('failed');
                setErrorMsg('No se pudo conectar con el servidor de pagos.');
                return;
            }

            if (data?.activated || data?.alreadyActive) {
                setPlanName(data?.plan || '');
                setState('activated');
                return;
            }

            const wompiStatus = data?.wompiStatus;
            if (wompiStatus === 'PENDING') {
                setState('pending');
            } else if (!data?.activated) {
                setState('failed');
                setErrorMsg(data?.message || 'El pago no fue aprobado.');
            }
        } catch (err: any) {
            setState('failed');
            setErrorMsg('Error inesperado al verificar el pago.');
        }
    };

    const handleContinue = () => {
        sessionStorage.removeItem('wompi_pending_reference');
        window.history.replaceState({}, '', window.location.pathname);
        if (state === 'activated') {
            window.location.reload();
        } else {
            onDone();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 text-center">
                {state === 'verifying' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <svg className="animate-spin h-12 w-12 text-blue-500" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Verificando tu pago</h2>
                        <p className="text-slate-500 text-sm">Esto puede tomar unos segundos...</p>
                    </>
                )}

                {state === 'activated' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600 text-5xl">check_circle</span>
                            </div>
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 mb-2">¡Pago exitoso!</h2>
                        <p className="text-slate-600 mb-1">
                            Tu plan <span className="font-bold capitalize">{planName || 'Premium'}</span> ha sido activado.
                        </p>
                        <p className="text-slate-500 text-sm mb-8">Ya puedes acceder a todos tus simulacros y funciones premium.</p>
                        <button
                            onClick={handleContinue}
                            className="w-full bg-slate-800 text-white py-4 rounded-xl font-bold text-lg hover:bg-black transition-colors"
                        >
                            Comenzar a estudiar
                        </button>
                    </>
                )}

                {state === 'pending' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-amber-600 text-5xl">hourglass_top</span>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Pago en proceso</h2>
                        <p className="text-slate-600 mb-2">Tu transacción está siendo procesada por el banco.</p>
                        <p className="text-slate-500 text-sm mb-8">
                            Una vez confirmado, tu plan se activará automáticamente. Revisa tu correo para confirmación.
                        </p>
                        <button
                            onClick={handleContinue}
                            className="w-full bg-slate-100 text-slate-700 py-4 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                        >
                            Volver a la aplicación
                        </button>
                    </>
                )}

                {state === 'failed' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-500 text-5xl">cancel</span>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Pago no completado</h2>
                        <p className="text-slate-600 mb-2">{errorMsg || 'El pago no pudo ser procesado.'}</p>
                        <p className="text-slate-500 text-sm mb-8">
                            Si crees que es un error, contacta soporte con tu referencia de pago:
                            <br />
                            <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded mt-1 inline-block">{paymentReference}</span>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={verify}
                                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
                            >
                                Reintentar verificación
                            </button>
                            <button
                                onClick={handleContinue}
                                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                            >
                                Salir
                            </button>
                        </div>
                    </>
                )}

                {state === 'not_found' && (
                    <>
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                                <span className="material-symbols-outlined text-slate-400 text-5xl">help</span>
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Transacción no encontrada</h2>
                        <p className="text-slate-500 text-sm mb-8">
                            No encontramos la transacción en nuestros registros. Si realizaste el pago, contacta soporte.
                        </p>
                        <button onClick={handleContinue} className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-bold">
                            Volver
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

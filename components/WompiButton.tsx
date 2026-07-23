import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

declare global {
    interface Window {
        WidgetCheckout: any;
    }
}

interface WompiButtonProps {
    planName: 'basico' | 'intermedio' | 'avanzado';
    finalPriceCOP: number;
    userId: string;
    includesInterview?: boolean;
    className?: string;
    children?: React.ReactNode;
}

// Poll the local transactions table until status=APPROVED or max retries exhausted
async function pollTransactionApproved(
    reference: string,
    maxRetries: number,
    intervalMs: number
): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
        await new Promise(r => setTimeout(r, intervalMs));
        const { data } = await supabase
            .from('transactions')
            .select('status')
            .eq('reference', reference)
            .maybeSingle();
        if (data?.status === 'APPROVED') return true;
    }
    return false;
}

export const WompiButton: React.FC<WompiButtonProps> = ({
    planName,
    finalPriceCOP,
    userId,
    includesInterview = false,
    className = '',
    children
}) => {
    const [loading, setLoading] = useState(false);

    const activateAfterPayment = async (reference: string) => {
        const toastId = toast.loading('Verificando pago y activando tu plan...');

        try {
            // Primary path: call verify-and-activate-payment to confirm with Wompi API
            const { data, error } = await supabase.functions.invoke('verify-and-activate-payment', {
                body: { reference }
            });

            if (error) throw error;

            // activated=false + alreadyActive=true means idempotent — already premium
            if (data?.activated || data?.alreadyActive) {
                toast.success('¡Plan activado! Recargando tu cuenta...', { id: toastId, duration: 3000, icon: '🎉' });
                setTimeout(() => window.location.reload(), 1500);
                return;
            }

            // Wompi returned non-APPROVED status
            const wompiStatus = data?.wompiStatus;
            if (wompiStatus && wompiStatus !== 'APPROVED') {
                toast.dismiss(toastId);
                if (wompiStatus === 'PENDING') {
                    toast.loading('Pago pendiente. Te notificaremos cuando se confirme.', { duration: 6000 });
                } else {
                    toast.error(`El pago fue ${wompiStatus}. Si crees que es un error, contacta soporte.`);
                }
                setLoading(false);
                return;
            }

            throw new Error('Respuesta inesperada del servidor');

        } catch (primaryErr: any) {
            console.warn('verify-and-activate-payment failed, falling back to polling:', primaryErr?.message);

            // Fallback: poll the transactions table (webhook may still arrive)
            toast.loading('Esperando confirmación del pago...', { id: toastId });
            const approved = await pollTransactionApproved(reference, 8, 3000);

            if (approved) {
                toast.success('¡Plan activado! Recargando...', { id: toastId, duration: 3000, icon: '🎉' });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toast.dismiss(toastId);
                toast.error(
                    'Pago recibido pero la activación está pendiente. Recarga la página en unos minutos o contacta soporte.',
                    { duration: 10000 }
                );
                setLoading(false);
            }
        }
    };

    const handlePayment = async () => {
        if (!window.WidgetCheckout) {
            toast.error('El sistema de pagos no está disponible. Recarga la página.');
            return;
        }

        setLoading(true);

        try {
            // 1. Create payment intent and save pending transaction
            const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    planName,
                    userId,
                    includesInterview,
                    finalAmountCents: finalPriceCOP * 100
                }
            });

            if (error) throw new Error(error.message || 'Error al crear la intención de pago');
            if (data?.error) throw new Error(data.error);

            const { reference, amountInCents, integrity } = data;

            // 2. Get public key
            // @ts-ignore
            const publicKey = (import.meta as any).env?.VITE_WOMPI_PUBLIC_KEY || '';
            if (!publicKey) throw new Error('Llave pública de Wompi no configurada');

            // 3. Store reference in sessionStorage so PSE redirect can pick it up
            // redirectUrl must match exactly what's whitelisted in Wompi — keep it as origin only
            sessionStorage.setItem('wompi_pending_reference', reference);

            const checkout = new window.WidgetCheckout({
                currency: 'COP',
                amountInCents,
                reference,
                publicKey,
                signature: { integrity },
                redirectUrl: window.location.origin,
            });

            // 4. Handle widget result (card payments close widget and fire this callback)
            checkout.open(async (result: any) => {
                console.log('Wompi widget result:', result);

                if (!result?.transaction) {
                    setLoading(false);
                    return;
                }

                const status = result.transaction.status;

                if (status === 'APPROVED') {
                    await activateAfterPayment(reference);
                } else if (status === 'PENDING') {
                    toast.loading('Pago pendiente. Te notificaremos cuando se confirme.', { duration: 6000 });
                    setLoading(false);
                } else if (status === 'DECLINED') {
                    toast.error('El pago fue rechazado. Verifica los datos de tu tarjeta.');
                    setLoading(false);
                } else {
                    toast.error(`Estado del pago: ${status}`);
                    setLoading(false);
                }
            });

            // Release loading after widget opens
            setLoading(false);

        } catch (err: any) {
            console.error('Payment error:', err);
            toast.error(err.message || 'Error al procesar el pago. Intenta de nuevo.');
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handlePayment}
            disabled={loading}
            className={`${className} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
            {loading ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Procesando...
                </span>
            ) : (
                children || 'Suscribirse'
            )}
        </button>
    );
};

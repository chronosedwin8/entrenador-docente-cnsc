import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import toast from 'react-hot-toast';

// Declare Wompi's WidgetCheckout as global
declare global {
    interface Window {
        WidgetCheckout: any;
    }
}

interface WompiButtonProps {
    planName: 'basico' | 'intermedio' | 'avanzado';
    finalPriceCOP: number; // Final price in COP (not cents)
    userId: string;
    includesInterview?: boolean;
    className?: string;
    children?: React.ReactNode;
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

    const handlePayment = async () => {
        // Check if Wompi Widget is loaded
        if (!window.WidgetCheckout) {
            toast.error('El sistema de pagos no está disponible. Recarga la página.');
            console.error('WidgetCheckout not loaded');
            return;
        }

        setLoading(true);

        try {
            // 1. Create payment intent via Edge Function
            const { data, error } = await supabase.functions.invoke('create-payment-intent', {
                body: {
                    planName,
                    userId,
                    includesInterview,
                    finalAmountCents: finalPriceCOP * 100 // Convert COP to cents
                }
            });

            if (error) {
                console.error('Payment intent error:', error);
                throw new Error(error.message || 'Error al crear la intención de pago');
            }

            if (data.error) {
                throw new Error(data.error);
            }

            const { reference, amountInCents, integrity } = data;

            console.log('Payment intent created:', { reference, amountInCents });

            // 2. Get public key from environment
            // @ts-ignore - Vite injects env vars at build time
            const publicKey = (import.meta as any).env?.VITE_WOMPI_PUBLIC_KEY || '';

            if (!publicKey) {
                throw new Error('Llave pública de Wompi no configurada');
            }

            // 3. Open Wompi Widget
            const checkout = new window.WidgetCheckout({
                currency: 'COP',
                amountInCents: amountInCents,
                reference: reference,
                publicKey: publicKey,
                signature: { integrity },
                redirectUrl: window.location.origin, // Redirect to same page on success
            });

            // 4. Handle widget result
            checkout.open((result: any) => {
                console.log('Wompi result:', result);

                if (result.transaction) {
                    const status = result.transaction.status;

                    if (status === 'APPROVED') {
                        toast.success('¡Pago exitoso! Tu cuenta Premium será activada en breve.', {
                            duration: 5000,
                            icon: '🎉'
                        });
                        setTimeout(() => window.location.reload(), 2000);
                    } else if (status === 'PENDING') {
                        toast.loading('Pago pendiente. Te notificaremos cuando se complete.', {
                            duration: 5000
                        });
                    } else if (status === 'DECLINED') {
                        toast.error('El pago fue rechazado.');
                    } else {
                        toast.error(`Estado del pago: ${status}`);
                    }
                }
            });

            // Release loading state immediately
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

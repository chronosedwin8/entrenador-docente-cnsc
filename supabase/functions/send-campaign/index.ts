import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lote por invocación. Al reutilizar una sola conexión SMTP cada correo tarda
// ~100ms en vez de ~1-2s (antes se abría una conexión TLS nueva por correo),
// así que podemos procesar más por invocación sin acercarnos al límite de tiempo.
const BATCH_SIZE = 150;

// Pausa entre correos (SES admite ~14/seg). 80ms => ~12/seg, con margen.
const SEND_DELAY_MS = 80;

// Si fallan muchos correos seguidos es un problema sistémico (credenciales,
// SES caído, límite excedido). Abortamos el lote y dejamos el resto PENDIENTE
// en vez de marcarlos como fallidos, para poder reintentar después.
const MAX_CONSECUTIVE_FAILURES = 10;

const SMTP_FROM = "Simulador Concurso Docente - Fundales <concursodocente@fundales.com>";

// Reintentos por correo ante errores TRANSITORIOS (rate limit, timeouts...).
const MAX_ATTEMPTS = 3;

// Formato mínimo válido: algo@algo.tld  (descarta casos como "user@hotmailcom").
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

// Errores que vale la pena reintentar (el problema es temporal, no el destinatario).
const TRANSIENT_RE = /rate ?limit|throttl|too many|timeout|timed out|econnreset|epipe|connection closed|temporarily|try again|service unavailable|\b4\.[0-9]\.[0-9]\b|\b421\b|\b451\b|\b452\b/i;

/** Convierte un error (a veces JSON con stack) en un mensaje corto y legible. */
function cleanErrorMessage(err: unknown): string {
    let msg = err instanceof Error ? err.message : String(err);
    const jsonStart = msg.indexOf('{');
    if (jsonStart !== -1) {
        try {
            const parsed = JSON.parse(msg.slice(jsonStart));
            if (parsed?.error) msg = String(parsed.error);
        } catch { /* no era JSON, seguimos con el texto original */ }
    }
    // Cortar el stack trace
    msg = msg.split('\n    at ')[0].split('\n at ')[0].split('\\n at ')[0].trim();
    return msg.slice(0, 300);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

Deno.serve(async (req) => {
    // Debug log to confirm execution start
    console.log("Edge Function 'send-campaign' started");

    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { campaignId } = await req.json();
        console.log("Processing campaign:", campaignId);

        // 1. Obtener campaña
        const { data: campaign, error: campaignError } = await supabase
            .from('email_campaigns')
            .select('*')
            .eq('id', campaignId)
            .single();

        if (campaignError || !campaign) {
            console.error("Campaign fetch error:", campaignError);
            throw new Error('Campaign not found');
        }

        // 2. Obtener destinatarios pendientes
        const { data: recipients, error: recipientsError } = await supabase
            .from('email_recipients')
            .select('*')
            .eq('campaign_id', campaignId)
            .eq('status', 'pending')
            .limit(BATCH_SIZE);

        if (recipientsError) throw recipientsError;
        console.log(`Found ${recipients?.length || 0} pending recipients`);

        // 3. Enviar los correos reutilizando UNA sola conexión SMTP para todo el lote.
        let successCount = 0;
        let failCount = 0;
        let consecutiveFailures = 0;
        let abortedReason: string | null = null;

        const username = Deno.env.get('AWS_SES_USERNAME');
        const password = Deno.env.get('AWS_SES_PASSWORD');
        if (!username || !password) {
            throw new Error('Credenciales AWS SES no configuradas (AWS_SES_USERNAME / AWS_SES_PASSWORD)');
        }

        let smtp: SMTPClient | null = null;
        if ((recipients || []).length > 0) {
            // NOTA: sin la opción `pool`. denomailer ya mantiene viva la conexión
            // entre llamadas a send(), que es justo la reutilización que buscamos.
            // Activar `pool` rompía TODOS los envíos en el edge runtime.
            // Esta es exactamente la misma configuración que usa send-email-ses,
            // que está probada y funciona.
            smtp = new SMTPClient({
                connection: {
                    hostname: "email-smtp.us-east-1.amazonaws.com",
                    port: 465,
                    tls: true,
                    auth: { username, password },
                },
            });
        }

        // Fallback obligatorio: denomailer rechaza el correo si `content` va vacío.
        const plainText =
            (campaign.plain_text_content || '').trim() ||
            stripHtml(campaign.html_content || '').trim() ||
            'Contenido del correo';

        try {
            for (const recipient of recipients || []) {
                // (a) Validar el formato ANTES de gastar un envío. Un correo mal
                //     escrito (ej. "user@hotmailcom") nunca se podrá entregar.
                if (!recipient.email || !EMAIL_RE.test(recipient.email.trim())) {
                    await supabase
                        .from('email_recipients')
                        .update({
                            status: 'failed',
                            error_message: `Formato de correo inválido: "${recipient.email}". Corrige el dato del usuario.`
                        })
                        .eq('id', recipient.id);
                    failCount++;
                    continue; // No es un fallo del sistema: no toca el cortacircuitos.
                }

                // (b) Enviar, reintentando si el error es transitorio.
                let delivered = false;
                let lastError = '';

                for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
                    try {
                        await smtp!.send({
                            from: SMTP_FROM,
                            to: recipient.email.trim(),
                            subject: campaign.subject,
                            content: plainText,
                            html: addUnsubscribeFooter(campaign.html_content, recipient.user_id),
                        });
                        delivered = true;
                        break;
                    } catch (emailError) {
                        lastError = cleanErrorMessage(emailError);
                        const transient = TRANSIENT_RE.test(lastError);
                        console.error(`Intento ${attempt}/${MAX_ATTEMPTS} falló para ${recipient.email}: ${lastError}`);
                        if (!transient || attempt === MAX_ATTEMPTS) break;
                        // Espera creciente: 2s, 5s
                        await sleep(attempt === 1 ? 2000 : 5000);
                    }
                }

                if (delivered) {
                    await supabase
                        .from('email_recipients')
                        .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
                        .eq('id', recipient.id);
                    successCount++;
                    consecutiveFailures = 0;
                    await sleep(SEND_DELAY_MS);
                } else {
                    await supabase
                        .from('email_recipients')
                        .update({ status: 'failed', error_message: lastError })
                        .eq('id', recipient.id);
                    failCount++;
                    consecutiveFailures++;

                    // Cortacircuitos: ante un fallo sistémico dejamos el resto PENDIENTE.
                    // Si TODAVÍA no se ha enviado ninguno con éxito, el problema es
                    // de configuración/conexión: cortamos a los 3 para no quemar
                    // destinatarios marcándolos como fallidos sin motivo real.
                    const threshold = successCount === 0 ? 3 : MAX_CONSECUTIVE_FAILURES;
                    if (consecutiveFailures >= threshold) {
                        abortedReason = `Abortado tras ${consecutiveFailures} fallos consecutivos${successCount === 0 ? ' sin ningún envío exitoso' : ''}: ${lastError.slice(0, 200)}`;
                        console.error(abortedReason);
                        break;
                    }
                }
            }
        } finally {
            try { await smtp?.close(); } catch (e) { console.warn('Error cerrando SMTP:', e); }
        }

        // 4. Actualizar estadísticas de campaña desde la FUENTE DE VERDAD (email_recipients)
        //    en lugar de incrementar contadores (que pueden desfasarse). Esto hace la
        //    función idempotente y auto-reparable: si un lote se re-ejecuta, los números
        //    siempre reflejan el estado real de la tabla de destinatarios.
        const countByStatus = async (status: string | string[]): Promise<number> => {
            let q = supabase
                .from('email_recipients')
                .select('id', { count: 'exact', head: true })
                .eq('campaign_id', campaignId);
            q = Array.isArray(status) ? q.in('status', status) : q.eq('status', status);
            const { count } = await q;
            return count || 0;
        };

        const sentTotal = await countByStatus('sent');
        const failedTotal = await countByStatus(['failed', 'bounced']);
        const pendingTotal = await countByStatus('pending');

        // Estado real: si no quedan pendientes -> 'sent'; si quedan y ya hubo envíos -> 'sending'.
        const newStatus = pendingTotal === 0 ? 'sent' : 'sending';

        await supabase
            .from('email_campaigns')
            .update({
                successful_sends: sentTotal,
                failed_sends: failedTotal,
                status: newStatus,
                sent_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        console.log(`Campaign ${campaignId} reconciled: sent=${sentTotal}, failed=${failedTotal}, pending=${pendingTotal}, status=${newStatus}`);

        // 5. RECURSIVIDAD: si aún quedan pendientes (y no abortamos por fallo
        //    sistémico), invocar automáticamente el siguiente lote.
        if (pendingTotal > 0 && !abortedReason) {
            console.log(`Lote de ${BATCH_SIZE} completado. Invocando siguiente lote para campaña ${campaignId}...`);

            const cleanUrl = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
            const recursiveUrl = `${cleanUrl}/functions/v1/send-campaign`;

            console.log(`Recursion URL: ${recursiveUrl}`);

            // Crear la promesa de la llamada recursiva
            const recursiveCall = fetch(recursiveUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                },
                body: JSON.stringify({ campaignId })
            })
                .then(async (res) => {
                    const text = await res.text();
                    console.log(`Recursion response: ${res.status} - ${text}`);
                })
                .catch(e => console.error("Error crítico invocando siguiente lote:", e));

            // CRÍTICO: Usar EdgeRuntime.waitUntil para evitar que el runtime mate el proceso
            // cuando retornamos la respuesta al cliente.
            if ((globalThis as any).EdgeRuntime && (globalThis as any).EdgeRuntime.waitUntil) {
                console.log("Using EdgeRuntime.waitUntil for recursion");
                (globalThis as any).EdgeRuntime.waitUntil(recursiveCall);
            } else {
                // Fallback: Si no existe waitUntil, esperamos un poco (no ideal pero mejor que nada)
                console.warn("EdgeRuntime.waitUntil not found. Awaiting recursion (risk of timeout).");
                await recursiveCall;
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                sent_this_batch: successCount,
                failed_this_batch: failCount,
                successful_total: sentTotal,
                failed_total: failedTotal,
                pending_total: pendingTotal,
                status: newStatus,
                more_pending: pendingTotal > 0,
                aborted: abortedReason
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
}

function addUnsubscribeFooter(html: string, userId: string): string {
    const footer = `
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e0e0e0;" />
    <div style="text-align: center; color: #666; font-size: 12px; padding: 20px; background-color: #f9f9f9;">
      <p style="margin: 0 0 10px 0;"><strong>Fundales - Entrenador Docente CNSC</strong></p>
      <p style="margin: 0 0 15px 0;">Si no deseas recibir más correos, puedes:</p>
      <div style="margin: 15px 0;">
        <a href="https://fundales.com/unsubscribe?user=${userId}&action=emails" 
           style="display: inline-block; padding: 10px 20px; background-color: #f0f0f0; color: #333; text-decoration: none; border-radius: 5px; margin: 0 10px;">
          📧 Darme de baja solo de correos
        </a>
        <a href="https://fundales.com/unsubscribe?user=${userId}&action=delete" 
           style="display: inline-block; padding: 10px 20px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 5px; margin: 0 10px;">
          🗑️ Eliminar mi cuenta completamente
        </a>
      </div>
      <p style="margin: 15px 0 0 0; font-size: 10px; color: #999;">
        La opción "Eliminar mi cuenta" borrará permanentemente todos tus datos, incluyendo historial de simulacros.
      </p>
    </div>
  `;
    return html + footer;
}

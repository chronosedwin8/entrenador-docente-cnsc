import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
            .limit(50); // Lotes de 50 para no saturar SES

        if (recipientsError) throw recipientsError;
        console.log(`Found ${recipients?.length || 0} pending recipients`);

        // 3. Enviar emails usando Edge Function helper
        let successCount = 0;
        let failCount = 0;

        for (const recipient of recipients || []) {
            try {
                // Llamar a send-email-ses helper function
                // USAMOS SERVICE_ROLE_KEY para asegurar que la llamada interna tenga permisos
                const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-email-ses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
                    },
                    body: JSON.stringify({
                        to: recipient.email,
                        subject: campaign.subject,
                        html: addUnsubscribeFooter(campaign.html_content, recipient.user_id),
                        text: campaign.plain_text_content || stripHtml(campaign.html_content)
                    })
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(error);
                }

                // Actualizar estado
                await supabase
                    .from('email_recipients')
                    .update({
                        status: 'sent',
                        sent_at: new Date().toISOString()
                    })
                    .eq('id', recipient.id);

                successCount++;

                // Rate limiting: ~14 emails/segundo máximo en SES
                await new Promise(resolve => setTimeout(resolve, 80));

            } catch (emailError) {
                await supabase
                    .from('email_recipients')
                    .update({
                        status: 'failed',
                        error_message: String(emailError)
                    })
                    .eq('id', recipient.id);

                failCount++;
            }
        }

        // 4. Actualizar estadísticas de campaña
        await supabase
            .from('email_campaigns')
            .update({
                successful_sends: campaign.successful_sends + successCount,
                failed_sends: campaign.failed_sends + failCount,
                status: (recipients || []).length < 50 ? 'sent' : 'sending',
                sent_at: new Date().toISOString()
            })
            .eq('id', campaignId);

        // 5. RECURSIVIDAD: Si procesamos un lote completo (50), invocar el siguiente lote automáticamente
        if ((recipients || []).length === 50) {
            console.log(`Lote de 50 completado. Invocando siguiente lote para campaña ${campaignId}...`);

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
                sent: successCount,
                failed: failCount,
                more_pending: (recipients || []).length === 50
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

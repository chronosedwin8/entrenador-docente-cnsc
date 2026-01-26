import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Parse request body
        const { to, subject, html, text } = await req.json();

        // Check credentials
        const username = Deno.env.get('AWS_SES_USERNAME');
        const password = Deno.env.get('AWS_SES_PASSWORD');

        if (!username || !password) {
            throw new Error('Credenciales AWS SES no encontradas en environment variables');
        }

        console.log(`Intentando conectar a Amazon SES (Puerto 465) para enviar a: ${to}`);

        // Create client using Port 465 (Implicit SSL/TLS) - Most reliable for SES
        const client = new SMTPClient({
            connection: {
                hostname: "email-smtp.us-east-1.amazonaws.com",
                port: 465,
                tls: true, // Required for port 465
                auth: {
                    username: username,
                    password: password,
                },
            },
        });

        // Send email
        await client.send({
            from: "Simulador Concurso Docente - Fundales <concursodocente@fundales.com>",
            to: to,
            subject: subject,
            content: text || "Contenido del correo",
            html: html,
        });

        // Close connection
        await client.close();

        console.log('Email enviado correctamente');

        return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Error SMTP:", error);
        return new Response(
            JSON.stringify({
                error: error.message,
                stack: error.stack
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});

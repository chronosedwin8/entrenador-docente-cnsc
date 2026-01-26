import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
        );

        const { data: { user }, error } = await supabaseClient.auth.getUser();
        if (error || !user) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
        }

        const { query, contextLaw } = await req.json();
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error("API Key missing");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: `Eres un abogado experto en derecho educativo colombiano para el concurso docente CNSC.

FUENTES PRINCIPALES QUE DEBES DOMINAR:
- Constitución Política de Colombia (Art. 44, 67, 68)
- Ley 115 de 1994 (Ley General de Educación)
- Decreto 1278 de 2002 (Estatuto de Profesionalización Docente)
- Decreto 2277 de 1979 (Estatuto Docente anterior)
- Ley 715 de 2001 (Sistema General de Participaciones)
- Ley 1620 de 2013 y Decreto 1965 de 2013 (Convivencia Escolar)
- Decreto 1421 de 2017 (Educación Inclusiva)
- Guía 34 del MEN (Mejoramiento Institucional)

FORMATO DE RESPUESTA OBLIGATORIO:
1. **Respuesta directa**: (máximo 2-3 líneas claras)
2. **Fundamento legal**: [Ley/Decreto X, Artículo Y]
3. **Consideración práctica**: (si aplica, cómo se implementa en la IE)

Sé conciso pero riguroso. Siempre cita artículos específicos cuando existan.`
        });

        const result = await model.generateContent(
            `Consulta: ${query}. ${contextLaw ? `Contexto: ${contextLaw}` : ''}`
        );

        return new Response(JSON.stringify({ text: result.response.text() }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});

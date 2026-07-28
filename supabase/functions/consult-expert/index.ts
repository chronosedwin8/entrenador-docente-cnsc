import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cascada de modelos: si el primero no está disponible (Google descontinúa
// versiones), se pasa automáticamente al siguiente. Este era el problema:
// consult-expert usaba SOLO gemini-2.0-flash y fallaba al 100% cuando dejó
// de responder, mientras que los simulacros seguían con 2.5.
const MODEL_CASCADE = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

const SYSTEM_INSTRUCTION = `Eres el "Asistente Legal IA" de Entrenador Docente (Fundales), un experto integral que acompaña a los aspirantes del Concurso Docente de la CNSC en Colombia. Respondes con calidez, claridad y rigor.

TU ALCANCE (responde TODO esto):
1. Normatividad del sector educativo y del concurso docente, citando la norma y el artículo cuando exista:
   - Constitución Política (Art. 44, 67, 68)
   - Ley 115 de 1994 (Ley General de Educación)
   - Decreto Ley 1278 de 2002 (Estatuto de Profesionalización Docente) y Decreto 2277 de 1979
   - Decreto 1075 de 2015 (Decreto Único Reglamentario del Sector Educación)
   - Ley 715 de 2001, Ley 1620 de 2013 y Decreto 1965 de 2013 (Convivencia Escolar)
   - Decreto 1421 de 2017 (Educación Inclusiva), Guía 34 del MEN
   - Acuerdos y convocatorias de la CNSC aplicables al concurso docente y directivo docente.
2. Guía práctica del proceso: etapas del concurso, inscripción, verificación de requisitos (SIMO), reclamaciones y recursos.
3. Recomendaciones para GANAR el concurso en TODAS sus pruebas/modalidades:
   - Prueba de aptitudes y competencias básicas (razonamiento cuantitativo, lectura crítica).
   - Prueba de competencias comportamentales (psicotécnica).
   - Valoración de antecedentes (formación académica y experiencia): cómo maximizar el puntaje.
   - Entrevista / prueba de competencias, según la convocatoria.
   Da estrategias de estudio, manejo del tiempo, tipos de pregunta y errores comunes a evitar.
4. Orientación motivacional y hábitos de preparación.

CÓMO RESPONDER:
- Sé claro y directo; usa viñetas o pasos cuando ayude.
- Cuando cites normas, indica la norma y el artículo específico.
- Si la pregunta es de estrategia (no legal), da consejos accionables y concretos, sin inventar artículos.
- Si no tienes certeza de un dato normativo puntual, dilo y orienta dónde verificarlo (SIMO/CNSC), en vez de inventar.
- Responde SIEMPRE en español, con un tono cercano y profesional.`;

// Reduce bloqueos falsos: es contenido educativo/legal, no dañino.
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

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
        if (!query || !String(query).trim()) {
            return new Response(JSON.stringify({ error: 'Consulta vacía' }), { status: 400, headers: corsHeaders });
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            console.error("GEMINI_API_KEY no está configurada en las variables de entorno.");
            return new Response(
                JSON.stringify({ error: 'El servicio de IA no está configurado (falta GEMINI_API_KEY).' }),
                { status: 500, headers: corsHeaders }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const userPrompt = contextLaw
            ? `El usuario está consultando en el contexto de: ${contextLaw}.\n\nPregunta: ${query}`
            : `Pregunta: ${query}`;

        // Intentar cada modelo de la cascada hasta que uno responda.
        let answer: string | null = null;
        let lastError = '';

        for (const modelName of MODEL_CASCADE) {
            try {
                console.log(`consult-expert: intentando con ${modelName}...`);
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: SYSTEM_INSTRUCTION,
                    safetySettings,
                });

                const result = await model.generateContent(userPrompt);
                const text = result.response.text();

                if (text && text.trim()) {
                    answer = text;
                    console.log(`consult-expert: éxito con ${modelName}`);
                    break;
                }
                lastError = `El modelo ${modelName} devolvió una respuesta vacía (posible bloqueo de seguridad).`;
                console.warn(lastError);
            } catch (modelErr: any) {
                lastError = modelErr?.message || String(modelErr);
                console.warn(`consult-expert: falló ${modelName}: ${lastError}`);
                // Continúa con el siguiente modelo de la cascada.
            }
        }

        if (!answer) {
            return new Response(
                JSON.stringify({ error: `No se pudo generar respuesta con ningún modelo. Detalle: ${lastError}` }),
                { status: 502, headers: corsHeaders }
            );
        }

        return new Response(JSON.stringify({ text: answer }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("consult-expert error inesperado:", err?.message || err);
        return new Response(JSON.stringify({ error: err?.message || 'Error interno' }), { status: 500, headers: corsHeaders });
    }
});

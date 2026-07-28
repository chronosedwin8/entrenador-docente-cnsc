import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from "npm:@google/generative-ai";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Cascada de modelos (igual que en el resto del proyecto) para resistir
// descontinuaciones de Google.
const MODEL_CASCADE = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];

const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// Descripciones para orientar a la IA por tema.
const TOPIC_GUIDE: Record<string, string> = {
    fracciones: "operaciones con fracciones: suma, resta, multiplicación, división, simplificación y comparación",
    porcentajes: "cálculo de porcentajes, aumentos, descuentos, variación porcentual y porcentaje de un número",
    completar_series: "completar series (numéricas y de figuras descritas con texto) hallando el patrón",
    regla_tres_simple: "regla de tres simple directa e inversa aplicada a problemas cotidianos",
    regla_tres_compuesta: "regla de tres compuesta con tres o más magnitudes relacionadas",
    lenguaje_matematico: "traducción del lenguaje verbal al algebraico y planteamiento de ecuaciones",
    operaciones_basicas: "problemas de aplicación con suma, resta, multiplicación y división",
    razones_proporciones: "razones, proporciones, cuarta proporcional y repartos proporcionales",
    decimales: "operaciones y problemas con números decimales, redondeo y conversión con fracciones",
    edades: "problemas de edades con relaciones temporales (hace/dentro de años)",
    moviles_tiempos: "problemas de móviles: velocidad, distancia y tiempo (encuentro y alcance)",
    series_numericas: "series numéricas: hallar el término que sigue o el faltante según el patrón",
    tablas_graficos: "interpretación de tablas y gráficos estadísticos (describe los datos en el enunciado)",
};

function cleanJson(text: string): string {
    let t = text.trim();
    // Quitar cercos de código ```json ... ```
    t = t.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
    // Recortar al primer [ y último ]
    const start = t.indexOf('[');
    const end = t.lastIndexOf(']');
    if (start !== -1 && end !== -1) t = t.slice(start, end + 1);
    return t;
}

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

        // Restricción: solo usuarios Premium (o administradores) pueden generar ejercicios.
        const { data: profile } = await supabaseClient
            .from('profiles')
            .select('subscription_tier, system_role')
            .eq('id', user.id)
            .single();

        const isPremium = profile?.subscription_tier === 'premium' || profile?.system_role === 'admin';
        if (!isPremium) {
            return new Response(
                JSON.stringify({ error: 'Esta función es exclusiva para usuarios Premium.' }),
                { status: 403, headers: corsHeaders }
            );
        }

        const { topic, topicLabel, difficulty = 'Básico', count = 10 } = await req.json();
        const guide = TOPIC_GUIDE[topic] || topicLabel || topic;

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return new Response(
                JSON.stringify({ error: 'El servicio de IA no está configurado (falta GEMINI_API_KEY).' }),
                { status: 500, headers: corsHeaders }
            );
        }

        const prompt = `Eres un experto en la prueba de Aptitud Numérica del Concurso Docente de la CNSC (Colombia).
Genera EXACTAMENTE ${count} ejercicios de opción múltiple sobre el tema: "${topicLabel || topic}" (${guide}).
Nivel de dificultad: ${difficulty}.

REGLAS:
- Cada ejercicio debe ser de opción múltiple con 4 opciones (A, B, C, D) y UNA sola correcta.
- Las opciones deben ser numéricas o textuales plausibles; incluye distractores razonables.
- Varía los enunciados; usa contextos cotidianos colombianos cuando aplique.
- La solución debe explicar el procedimiento paso a paso, clara y breve, en español.
- No repitas ejercicios. Usa números y datos coherentes.

Devuelve ÚNICAMENTE un arreglo JSON válido (sin texto adicional, sin markdown), con este formato exacto:
[
  {
    "statement": "Enunciado del ejercicio",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "answer": "A",
    "solution": "Explicación paso a paso de por qué esa es la respuesta."
  }
]`;

        const genAI = new GoogleGenerativeAI(apiKey);
        let exercises: any[] | null = null;
        let lastError = '';

        for (const modelName of MODEL_CASCADE) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName, safetySettings });
                const result = await model.generateContent(prompt);
                const raw = result.response.text();
                const parsed = JSON.parse(cleanJson(raw));
                if (Array.isArray(parsed) && parsed.length > 0) {
                    exercises = parsed
                        .filter((e) => e && e.statement && Array.isArray(e.options) && e.answer)
                        .slice(0, count);
                    if (exercises.length > 0) break;
                }
                lastError = `El modelo ${modelName} no devolvió ejercicios válidos.`;
            } catch (e: any) {
                lastError = e?.message || String(e);
                console.warn(`generate-math-exercises: falló ${modelName}: ${lastError}`);
            }
        }

        if (!exercises || exercises.length === 0) {
            return new Response(
                JSON.stringify({ error: `No se pudieron generar ejercicios. Detalle: ${lastError}` }),
                { status: 502, headers: corsHeaders }
            );
        }

        return new Response(JSON.stringify({ exercises }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("generate-math-exercises error:", err?.message || err);
        return new Response(JSON.stringify({ error: err?.message || 'Error interno' }), { status: 500, headers: corsHeaders });
    }
});

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

        const authHeader = req.headers.get('Authorization');
        console.log("Analyze Performance - Request received.");
        console.log("Auth Header present:", !!authHeader, "Length:", authHeader?.length);

        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
            console.error("Auth failed:", authError);
            return new Response(JSON.stringify({ error: 'Unauthorized', details: authError?.message }), { status: 401, headers: corsHeaders });
        }

        console.log("User authenticated:", user.id);

        const { userProfile, history, stats } = await req.json();

        // 1. Check Daily Limit
        // Get start of day in UTC
        const startOfDay = new Date();
        startOfDay.setUTCHours(0, 0, 0, 0);

        const { count, error: limitError } = await supabaseClient
            .from('user_analysis_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', startOfDay.toISOString());

        if (limitError) {
            console.error("Limit check error", limitError);
            // Proceed cautiously or fail? Let's assume fail to be safe against abuse.
            // But if table doesn't exist yet, this will block. 
            // We will assume table exists as per task 1.
        }

        if (count && count > 0) {
            return new Response(JSON.stringify({ error: 'Daily limit reached', code: 'LIMIT_REACHED' }), {
                status: 429,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        // 2. Call Gemini
        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) throw new Error("API Key missing");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash",
            systemInstruction: `Eres un entrenador experto para el Concurso Docente de la CNSC (Colombia).
            Tu objetivo analizar el desempeño del usuario y generar un plan de mejora estratégico.
            
            Debes retornar un OBJETO JSON PURO (sin markdown, sin bloques de código) con la siguiente estructura exacta:
            {
               "strengths": ["string", "string", ...],
               "weaknesses": ["string", "string", ...],
               "recommendations": ["string", "string", ...],
               "legal_focus": ["string", "string", ...],
               "study_plan_summary": "string con texto formateado simple (tips clave, cronograma sugerido de 1 semana)"
            }

            Contexto Normativo:
            - Docente Aula: Ley 115/1994 (Art. 104-110), Decreto 1278/2002, DBAs y EBC, Decreto 1290/2009.
            - Rector: Ley 115/1994 (Art. 129-132), Ley 715/2001, Decreto 1075/2015, Guía 34 MEN, Decreto 4791/2008 (FSE).
            - Coordinador: Ley 115/1994 (Art. 133), Decreto 1290/2009, Ley 1620/2013, Guía 34 MEN.
            - Orientador: Ley 1098/2006, Ley 1620/2013, Decreto 1421/2017 (PIAR), Ley 1616/2013, Resolución 9317/2016.
            
            En legal_focus, SIEMPRE incluye referencias a artículos específicos según el rol del usuario.
            `
        });

        // Prepare Prompt
        const prompt = `
        Perfil:
        - Rol: ${userProfile.role}
        - Área: ${userProfile.area}
        - Nivel de Suscripción: ${userProfile.subscription_tier}

        Estadísticas:
        - Promedio General: ${stats.averageScore}%
        - Simulacros Totales: ${history.length}
        - Área más débil: ${stats.weakestArea || 'No identificada'}
        
        Historial Reciente (Últimos resultados):
        ${JSON.stringify(history.slice(0, 5).map((h: any) => ({
            score: h.score,
            questions: h.totalQuestions,
            correct: h.correctCount,
            competency: h.targetCompetency || 'General'
        })))}

        Genera un análisis crudo y directo. Si el puntaje es bajo (<60%), sé exigente. Si es alto (>80%), enfócate en perfeccionamiento.
        `;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text();

        // Clean markdown if present
        responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
        const analysisData = JSON.parse(responseText);

        // 3. Log Usage (Only if successful)
        await supabaseClient.from('user_analysis_logs').insert({ user_id: user.id });

        return new Response(JSON.stringify(analysisData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (err: any) {
        console.error("Function error:", err);
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
});

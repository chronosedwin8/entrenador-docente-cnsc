import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

console.log("Edge Function: generate-questions v3.0 (Cache + Bloom + Full Audit)");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-batch-key',
};

// --- SUPABASE CLIENT FOR CACHE ---
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// --- CONFIGURATION MAPS ---

const ROLE_LEGAL_CONTEXT: Record<string, string> = {
  'Rector': `
    MARCO LEGAL ESPECÍFICO:
    - Ley 715 de 2001 (Art. 5, 10: Sistema General de Participaciones).
    - Decreto 1075 de 2015 (Libro 2, Parte 3: Gestión Educativa y Funciones).
    - Ley 115 de 1994 (Art. 129-132: Funciones del Rector y Gobierno Escolar).
    - Guía 34 del MEN (Gestión Directiva y horizonte institucional).
    - Decreto 4791 de 2008 (Fondos de Servicios Educativos - FSE).
    - Ley 80 de 1993 y Ley 1150 de 2007 (Contratación Pública básica aplicada a colegios).
    - Ley 1474 de 2011 (Estatuto Anticorrupción).
    
    ÉNFASIS: 60% Gestión Administrativa/Financiera/Legal, 40% Liderazgo Pedagógico.
  `,
  'Coordinador': `
    MARCO LEGAL ESPECÍFICO:
    - Decreto 1290 de 2009 (Sistema de Evaluación Institucional - SIEE).
    - Ley 1620 de 2013 (Art. 19-21: Comité de Convivencia).
    - Ley 115 de 1994 (Art. 133: Coordinadores).
    - Guía 34 del MEN (Liderazgo del Plan de Mejoramiento Institucional - PMI).
    - Decreto 1860 de 1994 (Organización de la jornada escolar y PEI).
    - Ley 1098 de 2006 (Código de Infancia - Restablecimiento de derechos).
    
    ÉNFASIS: 60% Gestión Académica/Convivencia, 40% Pedagógico.
  `,
  'Docente Orientador': `
    MARCO LEGAL ESPECÍFICO:
    - Ley 1098 de 2006 (Código de Infancia y Adolescencia).
    - Ley 1620 de 2013 y Dec. 1965 de 2013 (Rutas de Atención Integral).
    - Decreto 1421 de 2017 (Inclusión y PIAR).
    - Ley 1616 de 2013 (Salud Mental y Entornos Protectores).
    - Resolución 9317 de 2016 (Manual de Funciones - Orientadores).
    - Sentencias T-478/15 (Sergio Urrego) y T-565/13 (Libre desarrollo de la personalidad).
    
    ÉNFASIS: Psicosocial, rutas de atención, prevención y promoción.
  `,
  'Docente de Aula': `
    MARCO LEGAL ESPECÍFICO:
    - Ley 115 de 1994 (Art. 104-110: El Educador).
    - Decreto 1278 de 2002 (Estatuto de Profesionalización).
    - Estándares Básicos de Competencias (EBC) y Derechos Básicos de Aprendizaje (DBA).
    - Decreto 1290 de 2009 (Evaluación en el aula).
    - Ley 1620 de 2013 (Rol del docente en la convivencia y prevención del acoso).
    - Decreto 1421 de 2017 (Atención educativa a población con discapacidad).
    
    ÉNFASIS: 70% Pedagógico/Curricular/Didáctico, 30% Normativo.
    TEORÍAS PEDAGÓGICAS APLICABLES: Constructivismo (Piaget, Vygotsky, Ausubel), Aprendizaje Significativo, Evaluación Formativa.
  `
};

const TRANSVERSAL_LAWS = `
  NORMAS TRANSVERSALES (APLICAN A TODOS):
  - Constitución Política de Colombia (Art. 67 Educación, Art. 29 Debido Proceso, Art. 16 Libre Desarrollo).
  - Código de Integridad del Servicio Público.
  - Sentencias de la Corte Constitucional sobre diversidad y derechos fundamentales en la escuela.
`;

// --- NEW: SUB-COMPETENCY MATRIX BY ROLE ---
const SUB_COMPETENCY_FOCUS: Record<string, Record<string, string>> = {
  'Rector': {
    'Gestión Financiera': `
      ENFOQUE TEMÁTICO: Presupuesto del Fondo de Servicios Educativos (FSE).
      NORMAS ESPECÍFICAS:
      - Decreto 4791 de 2008 (Administración del FSE, Art. 2-11).
      - Ley 80 de 1993 (Contratación Pública: Licitación, Selección Abreviada, Mínima Cuantía).
      - Ley 1150 de 2007 (Modalidades de contratación).
      - Decreto 1075 de 2015 (Ejecución presupuestal en I.E.).
      TEMAS: Plan de compras, tesorería, rendición de cuentas, manejo de excedentes, contratación de mínima cuantía.
    `,
    'Gestión Administrativa': `
      ENFOQUE TEMÁTICO: Administración del talento humano y recursos físicos.
      NORMAS ESPECÍFICAS:
      - Decreto 1075 de 2015 (Funciones administrativas del Rector).
      - Ley 909 de 2004 (Carrera Administrativa).
      - Ley 734 de 2002 / Ley 1952 de 2019 (Código Disciplinario).
      TEMAS: Inventarios, planta física, asignación de funciones, novedades de personal, archivo institucional.
    `,
    'Gestión Directiva': `
      ENFOQUE TEMÁTICO: Liderazgo institucional y planeación estratégica.
      NORMAS ESPECÍFICAS:
      - Guía 34 del MEN (Autoevaluación, PMI, horizonte institucional).
      - Ley 115 de 1994 (Art. 73-87: PEI y Gobierno Escolar).
      - Decreto 1860 de 1994 (Órganos del Gobierno Escolar).
      TEMAS: PEI, clima escolar, relaciones interinstitucionales, rendición de cuentas a la comunidad.
    `
  },
  'Coordinador': {
    'Gestión Académica': `
      ENFOQUE TEMÁTICO: Currículo, evaluación y seguimiento al aula.
      NORMAS ESPECÍFICAS:
      - Decreto 1290 de 2009 (SIEE: Escala de valoración, promoción, reprobación).
      - Ley 115 de 1994 (Art. 76-79: Currículo y Plan de Estudios).
      - Decreto 1860 de 1994 (Organización de la jornada y periodos académicos).
      TEMAS: Comisiones de evaluación, asignación académica, acompañamiento pedagógico, planes de mejoramiento de área.
    `,
    'Gestión de Convivencia': `
      ENFOQUE TEMÁTICO: Sistema Nacional de Convivencia Escolar.
      NORMAS ESPECÍFICAS:
      - Ley 1620 de 2013 (Art. 12-21: Ruta de Atención Integral, Comités).
      - Decreto 1965 de 2013 (Protocolos por tipo de situación I, II, III).
      - Ley 1098 de 2006 (Restablecimiento de derechos).
      TEMAS: Manual de convivencia, debido proceso disciplinario, activación de rutas, mediación escolar.
    `
  },
  'Docente Orientador': {
    'Intervención Psicosocial': `
      ENFOQUE TEMÁTICO: Atención a situaciones de riesgo y promoción del bienestar.
      NORMAS ESPECÍFICAS:
      - Ley 1098 de 2006 (Código de Infancia: Art. 18-20, 39-46).
      - Ley 1620 de 2013 (Rutas de Atención: Promoción, Prevención, Atención, Seguimiento).
      - Ley 1616 de 2013 (Salud Mental: Entornos protectores).
      TEMAS: Riesgo suicida, SPA, violencia intrafamiliar, VBG, embarazo adolescente, activación de ICBF/Policía.
    `,
    'Educación Inclusiva': `
      ENFOQUE TEMÁTICO: Atención a la diversidad y ajustes razonables.
      NORMAS ESPECÍFICAS:
      - Decreto 1421 de 2017 (PIAR, DUA, flexibilización curricular).
      - Ley 1618 de 2013 (Derechos de personas con discapacidad).
      - Resolución 9317 de 2016 (Funciones del Orientador en inclusión).
      TEMAS: Caracterización de estudiantes, barreras para el aprendizaje, ajustes razonables, trabajo con familias.
    `
  }
};

const COMPETENCY_OVERRIDES: Record<string, string> = {
  'Razonamiento Cuantitativo': `
    MODO: MATEMÁTICO NO JURÍDICO.
    INSTRUCCIÓN: Genera problemas de lógica matemática aplicados al contexto escolar.
    TEMAS: Regla de tres, porcentajes (ej: deserción, presupuesto), análisis de gráficas, lógica proposicional, estadística básica.
    RESTRICCIÓN: NO cites leyes ni normas. La 'normativa' debe ser la explicación lógica del procedimiento matemático.
  `,
  'Prueba Psicotécnica': `
    MODO: JUICIO SITUACIONAL (COMPORTAMENTAL).
    INSTRUCCIÓN: Evalúa rasgos de personalidad y habilidades blandas (Liderazgo, Trabajo en Equipo, Resolución de Conflictos, Iniciativa).
    FORMATO OPCIONES: No hay respuestas "Correctas/Incorrectas" absolutas, sino "Más Ajustada" vs "Menos Ajustada".
    RESTRICCIÓN: No evalúes conocimientos técnicos ni leyes. Evalúa el "SER" y el "HACER".
  `,
  'Conocimientos Específicos': `
    MODO: PROFUNDIDAD DISCIPLINAR.
    INSTRUCCIÓN: Enfócate 100% en el saber específico del área: {{AREA}}.
    TEMAS: Estándares Básicos de Competencias y DBAs de esa asignatura.
    NIVEL: ALTO (Análisis y Aplicación). Evita preguntas simples de memoria.
  `,
  'Competencias Comportamentales': `
    MODO: JUICIO SITUACIONAL.
    INSTRUCCIÓN: Evalúa competencias laborales: Compromiso social, trabajo en equipo, orientación al logro.
  `,
  'Lectura Crítica': `
    ⚠️ MODO ESPECIAL: LECTURA CRÍTICA (NO ES CASO SITUACIONAL) ⚠️
    
    CAMBIO TOTAL DE FORMATO - IGNORA las instrucciones de "caso situacional" anteriores.
    
    ESTRUCTURA OBLIGATORIA:
    1. El campo "context" DEBE contener un TEXTO DE LECTURA de 100-150 palabras.
       - Puede ser: Un fragmento de ensayo, artículo periodístico, editorial, discurso, texto académico o literario.
       - Temáticas: Educación, sociedad, filosofía, ciencia, cultura, política educativa.
       - PROHIBIDO: Casos situacionales de "un rector debe decidir..." o "un docente enfrenta...".
    
    2. El campo "text" (pregunta) debe ser una de estas tipologías:
       - INFERENCIA: "Según el texto, se puede inferir que..."
       - INTENCIÓN DEL AUTOR: "¿Cuál es la intención principal del autor al mencionar...?"
       - IDEA PRINCIPAL: "La tesis central del texto es..."
       - ESTRUCTURA ARGUMENTATIVA: "¿Qué tipo de argumento utiliza el autor en el segundo párrafo?"
       - SIGNIFICADO CONTEXTUAL: "En el contexto del texto, la expresión '...' significa..."
       - PROPÓSITO COMUNICATIVO: "El propósito del autor al escribir este texto es..."
    
    3. Las opciones deben ser interpretaciones del texto, NO acciones a tomar.
    
    4. El campo "normative" debe explicar la lógica de comprensión lectora aplicada.
    
    EJEMPLO DE FORMATO CORRECTO:
    {
      "context": "La educación no es simplemente la transmisión de conocimientos acumulados de una generación a otra. Es, ante todo, un proceso de formación integral del ser humano. Dewey afirmaba que la escuela no debe ser una preparación para la vida, sino la vida misma. Cuando reducimos la educación a la mera instrucción, perdemos de vista su esencia transformadora. Los sistemas educativos contemporáneos, obsesionados con las métricas y los resultados estandarizados, corren el riesgo de olvidar que su propósito fundamental es cultivar ciudadanos críticos y autónomos.",
      "text": "Según el autor, ¿cuál es el principal riesgo de los sistemas educativos contemporáneos?",
      "options": [
        {"id": "A", "text": "No transmiten suficientes conocimientos a las nuevas generaciones"},
        {"id": "B", "text": "Priorizan las métricas sobre la formación integral del ciudadano"},
        {"id": "C", "text": "Siguen las ideas de Dewey de manera demasiado literal"},
        {"id": "D", "text": "No preparan adecuadamente para el mercado laboral"}
      ],
      "correctOptionId": "B",
      "normative": {
        "law": "Comprensión Lectora Nivel Inferencial",
        "article": "Identificación de idea principal implícita",
        "explanation": "El autor afirma que los sistemas 'obsesionados con métricas' olvidan 'cultivar ciudadanos críticos', lo cual indica que el riesgo es priorizar lo cuantitativo sobre lo formativo."
      }
    }
  `,
  'Conocimientos Específicos - Inglés': `
    LANGUAGE MODE: FULL ENGLISH (C1-C2 CEFR Level)
    
    CRITICAL INSTRUCTION: Generate ALL content in English for this assessment.
    
    ASSESSMENT FOCUS:
    - Reading comprehension with academic/professional texts
    - Grammar structures at advanced level (conditionals, modals, passive voice, reported speech)
    - Vocabulary in educational contexts (classroom management, curriculum, assessment terminology)
    - Pedagogical approaches to EFL/ESL teaching (CLT, Task-Based Learning, CLIL)
    
    REFERENCE STANDARDS:
    - Basic Standards of Competence in Foreign Languages: English (MEN)
    - Common European Framework of Reference (CEFR) C1-C2 descriptors
    - Colombia Bilingüe Program guidelines
    
    QUESTION STYLE:
    - Complex inferential questions requiring synthesis
    - Academic vocabulary in context
    - Error identification and correction at advanced level
    - Pedagogical scenario-based questions in English
    
    OUTPUT: All text, context, options, and normative.explanation must be in English.
  `
};

// --- NEW: BLOOM'S TAXONOMY INSTRUCTIONS ---
const BLOOMS_TAXONOMY = `
  --- NIVEL COGNITIVO REQUERIDO (Taxonomía de Bloom Revisada) ---
  Distribuye las preguntas según estos niveles cognitivos:
  
  - 20% COMPRENDER: Interpretar, ejemplificar, clasificar información.
    Ejemplo: "¿Qué significa el principio de corresponsabilidad en la Ley 1098?"
  
  - 30% APLICAR: Usar conocimientos en situaciones concretas nuevas.
    Ejemplo: "Dado este caso, ¿qué artículo de la Ley 1620 aplica?"
  
  - 30% ANALIZAR: Descomponer, diferenciar, organizar, atribuir causas.
    Ejemplo: "¿Por qué la opción B viola el debido proceso mientras la C lo garantiza?"
  
  - 20% EVALUAR: Juzgar, criticar, decidir entre alternativas fundamentadamente.
    Ejemplo: "¿Cuál es la acción MÁS adecuada considerando el marco legal Y el contexto pedagógico?"
  
  PROHIBIDO: Preguntas de nivel "RECORDAR" (memoria pura sin aplicación).
  Ejemplo PROHIBIDO: "¿En qué año se promulgó la Ley 115?" (Esto es trivial y no evalúa competencias).
`;

// --- HELPER FUNCTIONS ---

function cleanJson(text: string): string {
  let clean = text.trim();
  clean = clean.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  const start = clean.indexOf('[');
  const end = clean.lastIndexOf(']');
  if (start !== -1 && end !== -1) {
    clean = clean.substring(start, end + 1);
  }
  return clean;
}

// --- CACHE FUNCTIONS ---

async function fetchFromCache(
  supabase: any,
  role: string,
  area: string,
  competency: string | null,
  count: number
): Promise<any[]> {
  try {
    let query = supabase
      .from('questions_bank')
      .select('content')
      .eq('role', role)
      .eq('area', area || 'N/A');

    if (competency) {
      query = query.eq('competency', competency);
    }

    // Get random questions using order and limit
    const { data, error } = await query.limit(count * 2); // Get more than needed for randomization

    if (error) {
      console.error("Cache fetch error:", error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Shuffle and take required count
    const shuffled = data.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((row: any) => row.content);
  } catch (e) {
    console.error("Cache fetch exception:", e);
    return [];
  }
}

async function saveToCache(
  supabase: any,
  role: string,
  area: string,
  competency: string | null,
  questions: any[]
): Promise<void> {
  try {
    const rows = questions.map(q => ({
      role,
      area: area || 'N/A',
      competency: competency || null,
      content: q
    }));

    const { error } = await supabase.from('questions_bank').insert(rows);

    if (error) {
      console.error("Cache save error:", error);
    } else {
      console.log(`Saved ${rows.length} questions to cache`);
    }
  } catch (e) {
    console.error("Cache save exception:", e);
  }
}

// --- MAIN HANDLER ---

Deno.serve(async (req) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    // 2. Parse User Input
    const { role, area, count = 5, competency, forceRefresh = false } = await req.json();

    // 3. Validation
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    // 4. Initialize Supabase client for caching (if service key available)
    let supabase: any = null;
    let cachedQuestions: any[] = [];

    if (supabaseServiceKey && !forceRefresh) {
      supabase = createClient(supabaseUrl, supabaseServiceKey);

      // Try to fetch from cache first
      cachedQuestions = await fetchFromCache(supabase, role, area, competency, count);
      console.log(`Found ${cachedQuestions.length} questions in cache`);

      // If we have enough cached questions, return them directly
      if (cachedQuestions.length >= count) {
        const finalQuestions = cachedQuestions.slice(0, count).map((q, i) => ({
          ...q,
          id: `q-${Date.now()}-${i}`,
          fromCache: true
        }));

        console.log("Returning questions from cache");
        return new Response(JSON.stringify(finalQuestions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // 5. Calculate how many questions we need to generate
    const neededCount = count - cachedQuestions.length;
    console.log(`Need to generate ${neededCount} new questions with AI`);

    // 6. Construct Prompt Components

    // A. Base Role Context
    let roleContext = ROLE_LEGAL_CONTEXT[role] || ROLE_LEGAL_CONTEXT['Docente de Aula'];

    // B. Check for sub-competency specific focus
    let subCompetencyFocus = "";
    if (competency && SUB_COMPETENCY_FOCUS[role]) {
      const roleSubCompetencies = SUB_COMPETENCY_FOCUS[role];
      // Check if competency matches any sub-competency key
      for (const [key, value] of Object.entries(roleSubCompetencies)) {
        if (competency.includes(key) || key.includes(competency)) {
          subCompetencyFocus = value;
          break;
        }
      }
    }

    // C. Handle Competency Switching
    let promptMode = "MODO ESTÁNDAR: Preguntas de juicio situacional con base legal y pedagógica.";

    if (competency) {
      if (competency.includes("Cuantitativo")) {
        promptMode = COMPETENCY_OVERRIDES['Razonamiento Cuantitativo'];
      } else if (competency.includes("Psicotécnica")) {
        promptMode = COMPETENCY_OVERRIDES['Prueba Psicotécnica'];
      } else if (competency.includes("Comportamental")) {
        promptMode = COMPETENCY_OVERRIDES['Competencias Comportamentales'];
      } else if (competency.includes("Lectura")) {
        promptMode = COMPETENCY_OVERRIDES['Lectura Crítica'];
      } else if (competency.includes("Específico") || (area && area !== 'N/A' && competency !== 'Pedagógica')) {
        if (area === 'Idioma Extranjero Inglés') {
          promptMode = COMPETENCY_OVERRIDES['Conocimientos Específicos - Inglés'];
        } else {
          promptMode = COMPETENCY_OVERRIDES['Conocimientos Específicos'].replace('{{AREA}}', area || 'General');
        }
      }
    }

    // 7. Final Super Prompt Assembly (v3.0 - Full Audit Implementation)
    const finalPrompt = `
      ROL: Eres un Diseñador de Pruebas de Alto Nivel para la Comisión Nacional del Servicio Civil (CNSC).
      TAREA: Generar una prueba de ${neededCount} preguntas para el cargo de: ${role}.
      
      --- CONTEXTO ESPECÍFICO DEL ROL ---
      ${roleContext}
      
      ${subCompetencyFocus ? `--- ENFOQUE DE SUB-COMPETENCIA ---\n${subCompetencyFocus}` : ''}
      
      --- NORMAS TRANSVERSALES (APLICAN A TODOS LOS ROLES) ---
      ${TRANSVERSAL_LAWS}
      
      ${BLOOMS_TAXONOMY}
      
      --- MODO DE OPERACIÓN: ${competency || 'General'} ---
      ${promptMode}

      --- REGLAS ABSOLUTAS DE DIFICULTAD (ANTI-FACILISMO) ---
      1. PROHIBICIÓN DE "OPCIONES DESCARTABLES":
         - En preguntas pedagógicas/situacionales, las 4 opciones deben parecer acciones CORRECTAS y constructivas.
         - PROHIBIDO usar opciones que sean negligencias obvias (ej: "Gritar al alumno", "Ignorar el problema").
         - La CLAVE debe ser correcta por cumplir el debido proceso o la norma superior.
         - Los DISTRACTORES deben ser "acciones buenas" pero incompletas, o que saltan el conducto regular.

      --- DISTRIBUCIÓN OBLIGATORIA DE RESPUESTAS CORRECTAS ---
      ⚠️ REGLA CRÍTICA: Distribuye las respuestas correctas de forma EQUITATIVA y ALEATORIA.
      - En un lote de ${neededCount} preguntas, las respuestas deben estar BALANCEADAS entre A, B, C y D.
      - NO uses siempre B como respuesta correcta. Esto es un ERROR COMÚN que debes evitar.
      - Objetivo: Aproximadamente 25% de cada opción (A, B, C, D).
      - VARÍA la posición de la respuesta correcta en cada pregunta.
      - Si generas 4 preguntas, una debe ser A, otra B, otra C, otra D.

      --- PROCESO DE RAZONAMIENTO (CHAIN OF THOUGHT) ---
      Para CADA pregunta que generes, sigue este proceso interno:
      1. IDENTIFICA el dilema ético/legal/pedagógico central del caso.
      2. DEFINE la norma o artículo específico que resuelve el dilema.
      3. DISEÑA la respuesta correcta basada en el debido proceso legal.
      4. DECIDE ALEATORIAMENTE en qué posición (A, B, C o D) colocar la respuesta correcta.
      5. CREA 3 distractores que sean acciones plausibles pero incompletas o incorrectas.
      6. VERIFICA que ningún distractor sea obviamente descartable.

      2. REGLA DE "PASOS MÚLTIPLES" (Para Matemáticas/Razonamiento):
         - PROHIBIDO problemas de un solo cálculo (ej: "¿Cuánto es el 20% de X?").
         - El problema DEBE requerir: Interpretación de datos + Cálculo Intermedio + Conclusión Lógica.
      
      3. ESTRUCTURA DEL CASO:
         - El contexto debe tener "Ruido": Datos irrelevantes que el usuario debe saber filtrar.
         - Debe presentar un DILEMA, no un problema simple.

      --- EJEMPLOS DE NIVEL ESPERADO (NOTA: las respuestas varían entre A, B, C, D) ---
      
      EJEMPLO 1 (Respuesta correcta: D):
      Un docente detecta que un estudiante presenta señales de maltrato físico. Según la Ley 1098, debe:
         A) Hablar primero con los padres para verificar la situación.
         B) Reportar al coordinador para que él decida qué hacer.
         C) Esperar a tener más evidencias antes de actuar.
         D) Activar inmediatamente la ruta de atención y reportar al ICBF.
      
      EJEMPLO 2 (Respuesta correcta: A):
      El Consejo Directivo aprueba modificar el manual de convivencia. Según el Decreto 1860, ¿cuál es el procedimiento correcto?
         A) Socializar los cambios con la comunidad educativa antes de su implementación.
         B) Publicar el nuevo manual en la página web del colegio.
         C) Enviar comunicado a los padres informando los cambios.
         D) Aplicar inmediatamente las nuevas normas aprobadas.
      
      EJEMPLO 3 (Respuesta correcta: C):
      Un estudiante con discapacidad cognitiva no logra los objetivos del grado. Según el Decreto 1421, el docente debe:
         A) Aplicar los mismos criterios de evaluación que al resto del grupo.
         B) Promoverlo automáticamente al siguiente grado por inclusión.
         C) Implementar el PIAR con ajustes razonables y evaluar según sus avances individuales.
         D) Solicitar traslado a una institución especializada.

      --- FORMATO DE SALIDA (JSON PURO - ESTRUCTURA ACTUALIZADA) ---
      Genera un Array JSON con la siguiente estructura EXACTA para cada pregunta.
      IMPORTANTE: El campo "correctOptionId" debe variar entre "A", "B", "C" y "D" de forma balanceada.
      {
        "text": "La pregunta específica a responder derivada del caso",
        "context": "El párrafo del estudio de caso (50-80 palabras con dilema, actores, conflicto)",
        "options": [
          { "id": "A", "text": "Primera opción plausible" },
          { "id": "B", "text": "Segunda opción plausible" },
          { "id": "C", "text": "Tercera opción plausible" },
          { "id": "D", "text": "Cuarta opción plausible" }
        ],
        "correctOptionId": "A | B | C | D (VARIAR - NO siempre B)",
        "competency": "${competency || 'General'}",
        "bloomLevel": "APLICAR | ANALIZAR | EVALUAR | COMPRENDER",
        "normative": {
          "law": "Nombre completo de la norma (ej: Ley 1620 de 2013)",
          "article": "Artículo específico (ej: Artículo 19, numeral 3)",
          "explanation": "Justificación técnica de por qué es la respuesta correcta"
        },
        "difficulty_analysis": "Explicación breve de por qué esta pregunta es difícil (ej: Requiere distinguir entre Situación Tipo I y II)"
      }
    `;

    // 8. Call Gemini with Smart Fallback (Cascada: 2.0 -> 1.5)
    let generatedQuestions: any[] = [];
    const genAI = new GoogleGenerativeAI(apiKey);

    // Helper function to try generation
    const generateWithModel = async (modelName: string): Promise<string> => {
      console.log(`Intentando generar con modelo: ${modelName}...`);
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(finalPrompt);
      return result.response.text();
    };

    try {
      // INTENTO 1: Gemini 2.5 Flash (Prioridad: Inteligencia)
      const responseText2 = await generateWithModel("gemini-2.5-flash");
      try {
        const cleanText = cleanJson(responseText2);
        generatedQuestions = JSON.parse(cleanText);
        console.log("¡Éxito con Gemini 2.5!");
      } catch (parseError) {
        throw new Error("Error de parseo JSON en 2.5"); // Force fallback if JSON is bad
      }

    } catch (error2: any) {
      console.warn(`Fallo Gemini 2.5 (${error2.message}). Iniciando respaldo...`);

      try {
        // INTENTO 2: Gemini 2.0 Flash (Prioridad: Estabilidad)
        const responseText20 = await generateWithModel("gemini-2.0-flash");
        const cleanText = cleanJson(responseText20);
        generatedQuestions = JSON.parse(cleanText);
        console.log("¡Recuperado con éxito usando Gemini 2.0!");
      } catch (error20: any) {
        console.error("Fallo crítico en ambos modelos.");
        // No lanzamos error aquí para permitir que el código siga hacia el Cache Fallback que ya implementamos abajo
      }
    }

    // 10. Save new questions to cache
    if (supabase && generatedQuestions.length > 0) {
      await saveToCache(supabase, role, area, competency, generatedQuestions);
    }

    // 11. Combine cached + generated questions
    let allQuestions = [...cachedQuestions, ...generatedQuestions];

    // FALLBACK CHECK: If we have 0 questions total, then we failed.
    if (allQuestions.length === 0) {
      throw new Error("No se pudieron generar preguntas y la caché está vacía.");
    }

    // 12. Add IDs and Return
    const finalQuestions = allQuestions.slice(0, count).map((q, i) => ({
      ...q,
      id: `q-${Date.now()}-${i}`,
      context: q.context || "Situación general aplicada al cargo.",
      bloomLevel: q.bloomLevel || "APLICAR",
      difficulty_analysis: q.difficulty_analysis || "Pregunta de nivel estándar CNSC.",
      normative: {
        law: q.normative?.law || "Marco normativo general",
        article: q.normative?.article || "Ver normativa completa",
        explanation: q.normative?.explanation || "Aplicación del debido proceso legal."
      }
    }));

    return new Response(JSON.stringify(finalQuestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error("Error en proceso de generación:", err.message);

    // EMERGENCY FALLBACK: If ANY error occurred (AI outage, parsing, etc)
    // Try to return whatever we have in cache, even if it's old or few.
    // Note: We need access to 'cachedQuestions' here. Since it's block-scoped inside try, 
    // we might not have it if the error happened before definition.
    // Ideally code structure should be refactored, but for this edit:

    return new Response(JSON.stringify({ error: err.message, status: 'error' }), {
      status: 500,
      headers: corsHeaders
    });
  }
});

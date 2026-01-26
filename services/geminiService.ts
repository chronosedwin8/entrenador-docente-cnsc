import { supabase } from "./supabase";
import {
  UserRole,
  KnowledgeArea,
  Question,
  CompetencyType,
  UserProfile,
  SimulationResult
} from "../types";



// Helper to get a valid session with retries (handles race condition during auth)
const getValidSession = async (retries = 3): Promise<{ access_token: string }> => {
  for (let i = 0; i < retries; i++) {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (session && !error && session.access_token) {
      return session;
    }
    // Wait with exponential backoff if session is still being established
    console.log(`Session not ready, retry ${i + 1}/${retries}...`);
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error("No hay sesión activa. Por favor recarga la página o inicia sesión nuevamente.");
};

export const fetchQuestionBatch = async (
  role: UserRole,
  area: KnowledgeArea,
  count: number,
  competencyFilter?: CompetencyType,
  forceRefresh?: boolean
): Promise<Question[]> => {
  const MAX_RETRIES = 2;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. Get valid session with retry logic
      const session = await getValidSession();

      // 2. Invoke Edge Function with explicit headers
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          role,
          area,
          count,
          competency: competencyFilter,
          forceRefresh
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error("Edge Function Invocation Error:", error);
        console.error("Error context:", error.context);
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);

        // Try to get more details from the response
        if (error.context?.body) {
          try {
            const errorBody = await error.context.body.json();
            console.error("Server error body:", errorBody);
          } catch (e) {
            console.error("Could not parse error body");
          }
        }

        // Handle 401 with retry (session might have been refreshed)
        if (error.context?.status === 401 && attempt < MAX_RETRIES) {
          console.log(`Got 401, retrying (attempt ${attempt + 1}/${MAX_RETRIES})...`);
          await new Promise(r => setTimeout(r, 1000));
          continue; // Retry the loop
        }

        if (error.context?.status === 401) {
          throw new Error("Sesión expirada. Por favor cierra sesión y vuelve a ingresar.");
        }

        throw new Error(`Error generando preguntas: ${error.message || 'Error desconocido'}`);
      }

      if (!data || !Array.isArray(data)) {
        throw new Error("Respuesta inválida del servicio de generación.");
      }

      return data;
    } catch (err: any) {
      // If it's not a retryable error or we've exhausted retries, throw
      if (attempt >= MAX_RETRIES || !err.message?.includes('401')) {
        console.error("fetchQuestionBatch failed:", err);
        throw err;
      }
    }
  }

  throw new Error("No se pudo conectar con el servicio después de varios intentos.");
};

export const consultNormativeExpert = async (query: string, contextLaw?: string): Promise<string> => {
  try {
    // Get current session token for authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    console.log("consultNormativeExpert - Session check:", {
      hasSession: !!session,
      sessionError: sessionError?.message,
      tokenLength: session?.access_token?.length
    });

    if (sessionError || !session) {
      console.error("No active session found when calling consult-expert", sessionError);
      return "No hay sesión activa. Por favor recarga la página.";
    }

    console.log("Calling consult-expert with token...");

    const { data, error } = await supabase.functions.invoke('consult-expert', {
      body: { query, contextLaw },
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    console.log("consult-expert response:", { data, error, errorStatus: error?.context?.status });

    if (error) {
      console.error("consult-expert error details:", {
        message: error.message,
        name: error.name,
        status: error.context?.status,
        context: error.context
      });

      if (error.context?.status === 401) {
        return "Error de autenticación. Intenta cerrar sesión y volver a ingresar.";
      }
      throw error;
    }

    return data?.text || "No se pudo obtener respuesta.";
  } catch (err) {
    console.error("consultNormativeExpert failed:", err);
    return "Servicio no disponible momentáneamente.";
  }
};

export interface PerformanceAnalysis {
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  legal_focus: string[];
  study_plan_summary: string;
}

export const generatePerformanceAnalysis = async (
  userProfile: UserProfile,
  history: SimulationResult[],
  stats: { averageScore: number; weakestArea?: string }
): Promise<PerformanceAnalysis> => {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) throw new Error("Sesión requerida.");

    const { data, error } = await supabase.functions.invoke('analyze-performance', {
      body: { userProfile, history, stats },
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    if (error) {
      // Check for 429 Limit Reached
      if (error.context?.status === 429) {
        throw new Error("LIMIT_REACHED");
      }
      throw error;
    }

    return data as PerformanceAnalysis;
  } catch (err: any) {
    console.error("Analysis generation failed:", err);
    throw err; // Propagate error to handle in UI
  }
};
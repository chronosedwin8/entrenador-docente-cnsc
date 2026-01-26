export enum UserRole {
  DOCENTE_AULA = 'Docente de Aula',
  RECTOR = 'Rector',
  COORDINADOR = 'Coordinador',
  ORIENTADOR = 'Docente Orientador',
}

export type SystemRole = 'admin' | 'user';
export type SubscriptionTier = 'free' | 'premium';

export enum KnowledgeArea {
  PREESCOLAR = 'Preescolar',
  PRIMARIA = 'Primaria',
  MATEMATICAS = 'Matemáticas',
  CIENCIAS_NATURALES = 'Ciencias Naturales',
  QUIMICA = 'Ciencias Naturales - Química',
  FISICA = 'Ciencias Naturales - Física',
  CIENCIAS_SOCIALES = 'Ciencias Sociales',
  FILOSOFIA = 'Filosofía',
  HUMANIDADES = 'Humanidades y Lengua Castellana',
  INGLES = 'Idioma Extranjero Inglés',
  TECNOLOGIA = 'Tecnología e Informática',
  EDUCACION_FISICA = 'Educación Física, Recreación y Deportes',
  ETICA = 'Educación Ética y Valores Humanos',
  ARTISTICA_ESCENICAS = 'Educación Artística - Artes Escénicas',
  ARTISTICA_PLASTICAS = 'Educación Artística - Artes Plásticas',
  ARTISTICA_DANZAS = 'Educación Artística - Danzas',
  ARTISTICA_MUSICA = 'Educación Artística - Música',
  NONE = 'N/A' // For Directivos/Orientadores
}

export enum CompetencyType {
  // Common
  LECTURA_CRITICA = 'Lectura Crítica',
  RAZONAMIENTO_CUANTITATIVO = 'Razonamiento Cuantitativo',
  COMPORTAMENTAL = 'Competencias Comportamentales',

  // Docente Aula
  PEDAGOGICA = 'Competencias Pedagógicas',
  DISCIPLINAR = 'Conocimientos Específicos',
  PSICOTECNICA = 'Prueba Psicotécnica',

  // Directivos (Rector/Coordinador)
  GESTION_DIRECTIVA = 'Gestión Directiva',
  GESTION_ACADEMICA = 'Gestión Académica',
  GESTION_ADMINISTRATIVA = 'Gestión Administrativa',
  GESTION_FINANCIERA = 'Gestión Financiera',

  // Orientador / Coordinador
  ORIENTACION_ESCOLAR = 'Orientación Escolar',
  CONVIVENCIA_ESCOLAR = 'Convivencia Escolar',
  EDUCACION_INCLUSIVA = 'Educación Inclusiva',
  INTERVENCION_PSICOSOCIAL = 'Intervención Psicosocial',
}

export enum SimulationMode {
  DIAGNOSTICO = 'Diagnóstico Inicial',
  SIMULACRO_COMPLETO = 'Simulacro Completo',
  PRACTICA_COMPONENTE = 'Práctica por Componente',
}

export interface NormativeReference {
  law: string; // e.g., "Ley 115 de 1994"
  article: string; // e.g., "Artículo 78"
  explanation: string; // Technical justification
}

export interface Question {
  id: string;
  text: string;
  context?: string; // Situational case text
  options: {
    id: string; // 'A', 'B', 'C', 'D'
    text: string;
  }[];
  correctOptionId: string;
  competency: CompetencyType;
  difficulty: 'Baja' | 'Media' | 'Alta';
  normative: NormativeReference;
}

export interface UserProfile {
  id: string; // Added ID for admin purposes
  role: UserRole;
  area: KnowledgeArea;
  name: string;
  system_role: SystemRole;
  subscription_tier: SubscriptionTier;
  // Custom limits overrides (if null, use global defaults)
  custom_daily_limit?: number;
  custom_monthly_limit?: number;
  custom_question_limit?: number;
  email?: string; // Helpful for admin
  created_at?: string;
  expiration_date?: string;
  terms_accepted_at?: string;
  has_interview_access?: boolean;
}

export interface ExamConfig {
  mode: SimulationMode;
  questionCount: number;
  isTimed: boolean;
  selectedCompetency?: CompetencyType; // If mode is component practice
  forceRefresh?: boolean; // Premium: Generate new questions instead of using cache
}

export interface AnswerRecord {
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
  timeSpentSeconds: number;
}

export interface SimulationResult {
  totalQuestions: number;
  correctCount: number;
  score: number; // 0-100
  answers: AnswerRecord[];
  questions: Question[]; // Saved snapshot of questions for history/PDF
  date: Date;
  // New fields for better statistics
  mode?: SimulationMode;
  targetCompetency?: CompetencyType;
}

export interface LearningVideo {
  id: string;
  youtube_id: string;
  title: string;
  level: 'Básico' | 'Intermedio' | 'Avanzado' | 'Todos';
  created_at: string;
  display_order?: number; // For manual ordering like YouTube playlists
}

export interface HelpVideo {
  id: string;
  youtube_id: string;
  title: string;
  category: 'tutorial' | 'faq' | 'feature';
  created_at: string;
  display_order: number; // For manual ordering
}
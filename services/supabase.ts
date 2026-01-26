
import { createClient } from '@supabase/supabase-js';
import { UserRole, KnowledgeArea } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  name: string;
  role: UserRole;
  area: KnowledgeArea;
  created_at: string;
};

export type SimulationRecord = {
  id: string;
  user_id: string;
  mode: string;
  target_competency: string;
  total_questions: number;
  correct_count: number;
  score: number;
  created_at: string;
  questions: any;
  answers: any;
};

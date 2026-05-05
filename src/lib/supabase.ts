import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session, type User } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Missing Supabase environment variables for RAMonitorMobile.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type AuthSession = Session;
export type AuthUser = User;

export type Profile = {
  id: string;
  full_name: string | null;
  date_of_birth: string | null;
  diagnosis_year: number | null;
  created_at?: string;
  updated_at?: string;
};

export type AppleHealthDaily = {
  id?: string;
  user_id: string;
  date: string;
  steps: number | null;
  avg_heart_rate: number | null;
  avg_walking_speed: number | null;
  avg_walking_asymmetry: number | null;
  active_calories: number | null;
  gait_score: number | null;
  synced_at?: string;
};

export type DailyLog = {
  id?: string;
  user_id: string;
  log_date: string;
  pain_score: number;
  stiffness_minutes: number;
  fatigue_score: number;
  sleep_hours: number;
  medication_taken: boolean;
  notes: string | null;
  created_at?: string;
};

export type FoodLog = {
  id?: string;
  user_id: string;
  log_date: string;
  meal_type: string;
  image_url: string | null;
  foods_detected: string[];
  estimated_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  inflammatory_score: number | null;
  ra_note: string | null;
  analysis?: Record<string, unknown>;
  created_at?: string;
};

export type VoiceLog = {
  id?: string;
  user_id: string;
  log_date: string;
  transcript: string;
  extracted_log: Record<string, unknown>;
  created_at?: string;
};

export type AiInsight = {
  id?: string;
  user_id: string;
  period_days: number;
  insight_text: string;
  generated_at?: string;
};

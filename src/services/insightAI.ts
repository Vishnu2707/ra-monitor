import { GROQ_TEXT_MODEL, groqText } from '../lib/groq';
import type { AppleHealthDaily, DailyLog, FoodLog } from '../lib/supabase';

export async function generateInsight({
  periodDays,
  healthRows,
  dailyLogs,
  foodLogs,
}: {
  periodDays: number;
  healthRows: AppleHealthDaily[];
  dailyLogs: DailyLog[];
  foodLogs: FoodLog[];
}) {
  const summary = {
    period_days: periodDays,
    health: healthRows.map((row) => ({
      date: row.date,
      steps: row.steps,
      gait_score: row.gait_score,
      avg_walking_asymmetry: row.avg_walking_asymmetry,
      avg_walking_speed: row.avg_walking_speed,
    })),
    daily_logs: dailyLogs.map((row) => ({
      date: row.log_date,
      pain_score: row.pain_score,
      stiffness_minutes: row.stiffness_minutes,
      fatigue_score: row.fatigue_score,
      sleep_hours: row.sleep_hours,
      medication_taken: row.medication_taken,
    })),
    food_logs: foodLogs.map((row) => ({
      date: row.log_date,
      meal_type: row.meal_type,
      inflammatory_score: row.inflammatory_score,
      foods_detected: row.foods_detected,
    })),
  };

  return groqText({
    model: GROQ_TEXT_MODEL,
    maxTokens: 180,
    messages: [
      {
        role: 'system',
        content:
          'You write 3-4 simple warm sentences for a rheumatoid arthritis self-tracking app. No diagnosis. No medical advice. Do not suggest treatment changes. If data is sparse, gently say what is missing.',
      },
      {
        role: 'user',
        content: `Write a short insight from this real app data:\n${JSON.stringify(summary)}`,
      },
    ],
  });
}

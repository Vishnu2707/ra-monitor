import { GROQ_TEXT_MODEL, groqJson } from '../lib/groq';

export type VoiceDailyLogExtraction = {
  pain_score: number;
  stiffness_minutes: number;
  fatigue_score: number;
  sleep_hours: number;
  medication_taken: boolean;
  notes: string;
};

export async function extractDailyLogFromVoiceText(
  transcript: string,
): Promise<VoiceDailyLogExtraction> {
  return groqJson<VoiceDailyLogExtraction>({
    model: GROQ_TEXT_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content:
          'Extract rheumatoid arthritis daily tracking fields from patient symptom text. Return only JSON. Use numbers in range where possible. Do not diagnose or give advice.',
      },
      {
        role: 'user',
        content: `Return JSON with pain_score, stiffness_minutes, fatigue_score, sleep_hours, medication_taken, notes from this text:\n\n${transcript}`,
      },
    ],
  });
}

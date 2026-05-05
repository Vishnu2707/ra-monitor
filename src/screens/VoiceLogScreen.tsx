import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/Input';
import { friendlyDate, toDateKey } from '../lib/dates';
import { supabase, type DailyLog, type VoiceLog } from '../lib/supabase';
import {
  extractDailyLogFromVoiceText,
  type VoiceDailyLogExtraction,
} from '../services/voiceAI';
import { useAuthStore } from '../store/authStore';

async function fetchRecentVoiceLogs(userId: string) {
  const { data, error } = await supabase
    .from('voice_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(7);

  if (error) {
    throw error;
  }

  return (data ?? []) as VoiceLog[];
}

function normalizeExtraction(
  extraction: VoiceDailyLogExtraction,
): VoiceDailyLogExtraction {
  return {
    pain_score: Math.max(1, Math.min(10, Number(extraction.pain_score || 1))),
    stiffness_minutes: Math.max(0, Number(extraction.stiffness_minutes || 0)),
    fatigue_score: Math.max(
      1,
      Math.min(10, Number(extraction.fatigue_score || 1)),
    ),
    sleep_hours: Math.max(0, Number(extraction.sleep_hours || 0)),
    medication_taken: Boolean(extraction.medication_taken),
    notes: extraction.notes ? String(extraction.notes) : '',
  };
}

function ReviewScore({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View className="rounded-2xl bg-[#F8FAFB] p-4">
      <Text className="text-sm font-bold text-[#6B7280]">{label}</Text>
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(Math.max(1, value - 1))}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-xl font-bold text-[#2563EB]">‹</Text>
        </Pressable>
        <Text className="text-4xl font-bold text-[#111827]">{value}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(Math.min(10, value + 1))}
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-xl font-bold text-[#2563EB]">›</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function VoiceLogScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [transcript, setTranscript] = useState('');
  const [review, setReview] = useState<VoiceDailyLogExtraction | null>(null);

  const voiceLogsQuery = useQuery({
    queryKey: ['voice-logs', userId],
    queryFn: () => fetchRecentVoiceLogs(userId as string),
    enabled: Boolean(userId),
  });

  const extractMutation = useMutation({
    mutationFn: async () =>
      normalizeExtraction(await extractDailyLogFromVoiceText(transcript)),
    onSuccess: setReview,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('You must be logged in to save voice logs.');
      }

      if (!review) {
        throw new Error('Extract and review the symptom text first.');
      }

      const logDate = toDateKey();
      const dailyLog: DailyLog = {
        user_id: userId,
        log_date: logDate,
        pain_score: review.pain_score,
        stiffness_minutes: review.stiffness_minutes,
        fatigue_score: review.fatigue_score,
        sleep_hours: review.sleep_hours,
        medication_taken: review.medication_taken,
        notes: review.notes.trim() || null,
      };

      const voiceLog: VoiceLog = {
        user_id: userId,
        log_date: logDate,
        transcript,
        extracted_log: review,
      };

      const { error: dailyError } = await supabase
        .from('daily_logs')
        .upsert(dailyLog, { onConflict: 'user_id,log_date' });

      if (dailyError) {
        throw dailyError;
      }

      const { error: voiceError } = await supabase
        .from('voice_logs')
        .insert(voiceLog);

      if (voiceError) {
        throw voiceError;
      }
    },
    onSuccess: async () => {
      setTranscript('');
      setReview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['voice-logs', userId] }),
        queryClient.invalidateQueries({ queryKey: ['daily-logs', userId] }),
        queryClient.invalidateQueries({ queryKey: ['home-daily-log', userId] }),
      ]);
    },
  });

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-5 px-5 pb-8 pt-5"
    >
      <View>
        <Text className="text-3xl font-bold text-[#111827]">Voice</Text>
        <Text className="mt-2 text-base leading-6 text-[#6B7280]">
          Turn free text into an editable daily log.
        </Text>
      </View>

      <Card className="gap-4">
        <Input
          label="Describe how you feel today..."
          value={transcript}
          onChangeText={setTranscript}
          multiline
          textAlignVertical="top"
          placeholder="e.g. My hands are stiff this morning, pain about 6/10..."
        />
        <Button
          title="Extract & Review"
          loading={extractMutation.isPending}
          disabled={!transcript.trim()}
          onPress={() => extractMutation.mutate()}
        />
        {extractMutation.error ? (
          <Text className="text-sm leading-6 text-rose-700">
            {(extractMutation.error as Error).message}
          </Text>
        ) : null}
      </Card>

      {review ? (
        <Card className="gap-4">
          <Text className="text-xl font-bold text-[#111827]">
            Review extracted data
          </Text>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <ReviewScore
                label="Pain"
                value={review.pain_score}
                onChange={(pain_score) =>
                  setReview((current) =>
                    current ? { ...current, pain_score } : current,
                  )
                }
              />
            </View>
            <View className="flex-1">
              <ReviewScore
                label="Fatigue"
                value={review.fatigue_score}
                onChange={(fatigue_score) =>
                  setReview((current) =>
                    current ? { ...current, fatigue_score } : current,
                  )
                }
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <Input
              label="Stiffness"
              value={String(review.stiffness_minutes)}
              keyboardType="number-pad"
              suffix="min"
              className="flex-1"
              onChangeText={(value) =>
                setReview((current) =>
                  current
                    ? { ...current, stiffness_minutes: Number(value || 0) }
                    : current,
                )
              }
            />
            <Input
              label="Sleep"
              value={String(review.sleep_hours)}
              keyboardType="decimal-pad"
              suffix="h"
              className="flex-1"
              onChangeText={(value) =>
                setReview((current) =>
                  current ? { ...current, sleep_hours: Number(value || 0) } : current,
                )
              }
            />
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: review.medication_taken }}
            onPress={() =>
              setReview((current) =>
                current
                  ? {
                      ...current,
                      medication_taken: !current.medication_taken,
                    }
                  : current,
              )
            }
            className="flex-row items-center justify-between rounded-2xl bg-[#F8FAFB] p-4"
          >
            <Text className="text-base font-bold text-[#111827]">
              Medication taken
            </Text>
            <Text className="text-base font-bold text-[#2563EB]">
              {review.medication_taken ? 'Yes' : 'No'}
            </Text>
          </Pressable>

          <Input
            label="Notes"
            value={review.notes}
            multiline
            textAlignVertical="top"
            onChangeText={(notes) =>
              setReview((current) => (current ? { ...current, notes } : current))
            }
          />

          <Button
            title="Save"
            loading={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
          {saveMutation.error ? (
            <Text className="text-sm leading-6 text-rose-700">
              {(saveMutation.error as Error).message}
            </Text>
          ) : null}
        </Card>
      ) : null}

      <View className="gap-3">
        <Text className="text-xl font-bold text-[#111827]">Recent voice logs</Text>
        {voiceLogsQuery.data?.length ? (
          voiceLogsQuery.data.map((log) => (
            <Card key={log.id} className="p-4">
              <Text className="text-sm font-bold text-[#2563EB]">
                {friendlyDate(log.log_date)}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-[#6B7280]">
                {log.transcript}
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No voice logs"
            message="Saved voice extractions will appear here."
          />
        )}
      </View>
    </ScrollView>
  );
}

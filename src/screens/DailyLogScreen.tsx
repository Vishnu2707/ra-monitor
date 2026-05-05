import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Input } from '../components/Input';
import { daysAgoKey, friendlyDate, toDateKey } from '../lib/dates';
import { supabase, type DailyLog } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

async function fetchLast7DailyLogs(userId: string) {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', daysAgoKey(6))
    .order('log_date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as DailyLog[];
}

type DailyLogForm = {
  pain_score: number;
  stiffness_minutes: string;
  fatigue_score: number;
  sleep_hours: string;
  medication_taken: boolean;
  notes: string;
};

const initialForm: DailyLogForm = {
  pain_score: 1,
  stiffness_minutes: '',
  fatigue_score: 1,
  sleep_hours: '',
  medication_taken: false,
  notes: '',
};

function clampScore(value: number) {
  return Math.max(1, Math.min(10, value));
}

function ScoreStepper({
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
          onPress={() => onChange(clampScore(value - 1))}
          className="h-12 w-12 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-2xl font-bold text-[#2563EB]">‹</Text>
        </Pressable>
        <View className="items-center">
          <Text className="text-5xl font-bold text-[#111827]">{value}</Text>
          <Text className="text-sm font-semibold text-[#6B7280]">out of 10</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(clampScore(value + 1))}
          className="h-12 w-12 items-center justify-center rounded-full bg-white"
        >
          <Text className="text-2xl font-bold text-[#2563EB]">›</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function DailyLogScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [form, setForm] = useState<DailyLogForm>(initialForm);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const today = toDateKey();
  const userId = user?.id;

  const logsQuery = useQuery({
    queryKey: ['daily-logs', userId],
    queryFn: () => fetchLast7DailyLogs(userId as string),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    const todayLog = logsQuery.data?.find((log) => log.log_date === today);
    if (!todayLog) {
      return;
    }

    setForm({
      pain_score: clampScore(todayLog.pain_score),
      stiffness_minutes: String(todayLog.stiffness_minutes),
      fatigue_score: clampScore(todayLog.fatigue_score),
      sleep_hours: String(todayLog.sleep_hours),
      medication_taken: todayLog.medication_taken,
      notes: todayLog.notes ?? '',
    });
  }, [logsQuery.data, today]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('You must be logged in to save a daily log.');
      }

      const payload: DailyLog = {
        user_id: userId,
        log_date: today,
        pain_score: form.pain_score,
        stiffness_minutes: Number(form.stiffness_minutes || 0),
        fatigue_score: form.fatigue_score,
        sleep_hours: Number(form.sleep_hours || 0),
        medication_taken: form.medication_taken,
        notes: form.notes.trim() || null,
      };

      const { error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'user_id,log_date' });

      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      setSavedMessage('Daily log saved.');
      await Promise.all([
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
        <Text className="text-3xl font-bold text-[#111827]">Daily Log</Text>
        <Text className="mt-2 text-base leading-6 text-[#6B7280]">
          Save today&apos;s symptoms with a clean, quick check-in.
        </Text>
      </View>

      <Card className="gap-5">
        <ScoreStepper
          label="Pain"
          value={form.pain_score}
          onChange={(pain_score) => setForm((current) => ({ ...current, pain_score }))}
        />

        <Input
          label="Stiffness"
          value={form.stiffness_minutes}
          onChangeText={(stiffness_minutes) =>
            setForm((current) => ({ ...current, stiffness_minutes }))
          }
          keyboardType="number-pad"
          suffix="minutes"
        />

        <ScoreStepper
          label="Fatigue"
          value={form.fatigue_score}
          onChange={(fatigue_score) =>
            setForm((current) => ({ ...current, fatigue_score }))
          }
        />

        <Input
          label="Sleep"
          value={form.sleep_hours}
          onChangeText={(sleep_hours) =>
            setForm((current) => ({ ...current, sleep_hours }))
          }
          keyboardType="decimal-pad"
          suffix="hours"
        />

        <Pressable
          accessibilityRole="switch"
          accessibilityState={{ checked: form.medication_taken }}
          onPress={() =>
            setForm((current) => ({
              ...current,
              medication_taken: !current.medication_taken,
            }))
          }
          className="min-h-16 flex-row items-center justify-between rounded-2xl bg-[#F8FAFB] p-4"
        >
          <View>
            <Text className="text-base font-bold text-[#111827]">
              Medication
            </Text>
            <Text className="mt-1 text-sm text-[#6B7280]">
              {form.medication_taken ? 'Marked as taken' : 'Not marked yet'}
            </Text>
          </View>
          <View
            className={`h-8 w-14 justify-center rounded-full px-1 ${
              form.medication_taken ? 'bg-[#10B981]' : 'bg-slate-300'
            }`}
          >
            <View
              className={`h-6 w-6 rounded-full bg-white ${
                form.medication_taken ? 'self-end' : 'self-start'
              }`}
            />
          </View>
        </Pressable>

        <Input
          label="Notes"
          value={form.notes}
          onChangeText={(notes) => setForm((current) => ({ ...current, notes }))}
          multiline
          textAlignVertical="top"
          placeholder="Anything that changed today?"
        />

        {mutation.error ? (
          <Text className="text-sm text-rose-700">
            {(mutation.error as Error).message}
          </Text>
        ) : null}
        {savedMessage ? (
          <Text className="text-sm font-bold text-[#10B981]">{savedMessage}</Text>
        ) : null}

        <Button
          title="Save Today's Log"
          loading={mutation.isPending}
          onPress={() => mutation.mutate()}
        />
      </Card>

      <View className="gap-3">
        <Text className="text-xl font-bold text-[#111827]">Last 7 logs</Text>
        {logsQuery.data?.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-3 pr-5"
          >
            {logsQuery.data.map((log) => (
              <Card key={log.id ?? log.log_date} className="w-64 p-4">
                <Text className="text-base font-bold text-[#111827]">
                  {friendlyDate(log.log_date)}
                </Text>
                <Text className="mt-3 text-3xl font-bold text-[#2563EB]">
                  {log.pain_score}/10
                </Text>
                <Text className="mt-2 text-sm leading-6 text-[#6B7280]">
                  Fatigue {log.fatigue_score}/10, stiffness{' '}
                  {log.stiffness_minutes} min, sleep {log.sleep_hours} h
                </Text>
              </Card>
            ))}
          </ScrollView>
        ) : (
          <EmptyState
            title="No daily logs"
            message="Your saved symptom cards will appear here."
          />
        )}
      </View>
    </ScrollView>
  );
}

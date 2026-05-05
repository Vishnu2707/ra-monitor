import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { InsightCard } from '../components/InsightCard';
import { MetricCard } from '../components/MetricCard';
import { daysAgoKey, friendlyDate } from '../lib/dates';
import {
  supabase,
  type AiInsight,
  type AppleHealthDaily,
  type DailyLog,
  type FoodLog,
} from '../lib/supabase';
import { getFlareRisk } from '../services/flareRisk';
import { generateInsight } from '../services/insightAI';
import { useAuthStore } from '../store/authStore';

type ReportData = {
  healthRows: AppleHealthDaily[];
  dailyLogs: DailyLog[];
  foodLogs: FoodLog[];
  insights: AiInsight[];
};

async function fetchReportData(userId: string): Promise<ReportData> {
  const fromDate = daysAgoKey(29);
  const [health, daily, food, insights] = await Promise.all([
    supabase
      .from('apple_health_daily')
      .select('*')
      .eq('user_id', userId)
      .gte('date', fromDate)
      .order('date', { ascending: false }),
    supabase
      .from('daily_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', fromDate)
      .order('log_date', { ascending: false }),
    supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', fromDate)
      .order('created_at', { ascending: false }),
    supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .order('generated_at', { ascending: false })
      .limit(5),
  ]);

  const error =
    health.error ?? daily.error ?? food.error ?? insights.error ?? null;
  if (error) {
    throw error;
  }

  return {
    healthRows: (health.data ?? []) as AppleHealthDaily[],
    dailyLogs: (daily.data ?? []) as DailyLog[],
    foodLogs: (food.data ?? []) as FoodLog[],
    insights: (insights.data ?? []) as AiInsight[],
  };
}

function average(values: Array<number | null | undefined>, decimals = 1) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (!valid.length) {
    return null;
  }

  const raw = valid.reduce((total, value) => total + value, 0) / valid.length;
  const multiplier = 10 ** decimals;
  return Math.round(raw * multiplier) / multiplier;
}

function filterByPeriod<T extends { date?: string; log_date?: string }>(
  rows: T[],
  periodDays: number,
) {
  const start = daysAgoKey(periodDays - 1);
  return rows.filter((row) => (row.date ?? row.log_date ?? '') >= start);
}

function format(value: number | null, suffix = '') {
  return typeof value === 'number' ? `${value.toLocaleString()}${suffix}` : null;
}

function PainTrend({ logs }: { logs: DailyLog[] }) {
  const rows = [...logs]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .slice(-7);

  if (!rows.length) {
    return (
      <EmptyState
        title="No pain trend"
        message="Pain bars will appear after daily logs are saved."
      />
    );
  }

  return (
    <Card>
      <Text className="text-base font-bold text-[#111827]">Pain trend</Text>
      <View className="mt-5 h-36 flex-row items-end gap-2">
        {rows.map((log) => {
          const height = Math.max(8, (log.pain_score / 10) * 120);
          return (
            <View key={log.id ?? log.log_date} className="flex-1 items-center">
              <View
                className="w-full rounded-t-2xl bg-[#2563EB]"
                style={{ height }}
              />
              <Text className="mt-2 text-[10px] font-semibold text-[#6B7280]">
                {log.log_date.slice(5)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

export function ReportsScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [periodDays, setPeriodDays] = useState<7 | 30>(7);

  const reportQuery = useQuery({
    queryKey: ['reports', userId],
    queryFn: () => fetchReportData(userId as string),
    enabled: Boolean(userId),
  });

  const periodData = useMemo(() => {
    const data = reportQuery.data;
    return {
      healthRows: filterByPeriod(data?.healthRows ?? [], periodDays),
      dailyLogs: filterByPeriod(data?.dailyLogs ?? [], periodDays),
      foodLogs: filterByPeriod(data?.foodLogs ?? [], periodDays),
      insights: data?.insights ?? [],
    };
  }, [periodDays, reportQuery.data]);

  const summary = useMemo(
    () => ({
      avgSteps: average(periodData.healthRows.map((row) => row.steps), 0),
      avgGait: average(periodData.healthRows.map((row) => row.gait_score), 0),
      avgPain: average(periodData.dailyLogs.map((row) => row.pain_score), 1),
      avgSleep: average(periodData.dailyLogs.map((row) => row.sleep_hours), 1),
    }),
    [periodData],
  );

  const flareEvents = useMemo(() => {
    const dates = new Set<string>();
    periodData.healthRows.forEach((row) => dates.add(row.date));
    periodData.dailyLogs.forEach((row) => dates.add(row.log_date));
    periodData.foodLogs.forEach((row) => dates.add(row.log_date));

    return [...dates]
      .sort()
      .reverse()
      .map((date) => {
        const health = periodData.healthRows.find((row) => row.date === date);
        const daily = periodData.dailyLogs.find((row) => row.log_date === date);
        const food = periodData.foodLogs.find((row) => row.log_date === date);
        const risk = getFlareRisk({
          gait_score: health?.gait_score,
          pain_score: daily?.pain_score,
          walking_asymmetry: health?.avg_walking_asymmetry,
          sleep_hours: daily?.sleep_hours,
          inflammatory_score: food?.inflammatory_score,
          steps: health?.steps,
        });

        return { date, risk };
      })
      .filter((event) => event.risk.level === 'high');
  }, [periodData]);

  const insightMutation = useMutation({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('You must be logged in to generate insights.');
      }

      const insightText = await generateInsight({
        periodDays,
        healthRows: periodData.healthRows,
        dailyLogs: periodData.dailyLogs,
        foodLogs: periodData.foodLogs,
      });

      const { error } = await supabase.from('ai_insights').insert({
        user_id: userId,
        period_days: periodDays,
        insight_text: insightText,
        generated_at: new Date().toISOString(),
      });

      if (error) {
        throw error;
      }

      return insightText;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reports', userId] }),
        queryClient.invalidateQueries({ queryKey: ['latest-insight', userId] }),
      ]);
    },
  });

  const hasAnyData =
    periodData.healthRows.length ||
    periodData.dailyLogs.length ||
    periodData.foodLogs.length;
  const insightText =
    insightMutation.data ?? periodData.insights[0]?.insight_text ?? null;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-5 px-5 pb-8 pt-5"
    >
      <View>
        <Text className="text-3xl font-bold text-[#111827]">Reports</Text>
        <Text className="mt-2 text-base leading-6 text-[#6B7280]">
          Medical-grade summaries from saved Supabase rows.
        </Text>
      </View>

      <View className="flex-row rounded-2xl bg-white p-1 shadow-sm">
        {[7, 30].map((period) => {
          const selected = periodDays === period;
          return (
            <Pressable
              key={period}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setPeriodDays(period as 7 | 30)}
              className={`min-h-12 flex-1 items-center justify-center rounded-xl ${
                selected ? 'bg-[#2563EB]' : 'bg-white'
              }`}
            >
              <Text
                className={`font-bold ${
                  selected ? 'text-white' : 'text-[#6B7280]'
                }`}
              >
                {period} days
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-3">
        <View className="flex-row gap-3">
          <MetricCard title="Avg pain" value={format(summary.avgPain)} unit="/10" icon="PN" />
          <MetricCard title="Avg steps" value={format(summary.avgSteps)} icon="ST" />
        </View>
        <View className="flex-row gap-3">
          <MetricCard title="Avg gait" value={format(summary.avgGait)} unit="/100" icon="GT" />
          <MetricCard title="Avg sleep" value={format(summary.avgSleep)} unit="h" icon="SL" />
        </View>
      </View>

      <PainTrend logs={periodData.dailyLogs} />

      <Card className="gap-4">
        <Text className="text-base font-bold text-[#111827]">
          AI Insight
        </Text>
        <Button
          title="Generate AI Insight"
          loading={insightMutation.isPending}
          disabled={!hasAnyData}
          onPress={() => insightMutation.mutate()}
        />
        {insightMutation.error ? (
          <Text className="text-sm leading-6 text-rose-700">
            {(insightMutation.error as Error).message}
          </Text>
        ) : null}
      </Card>

      <InsightCard text={insightText} loading={insightMutation.isPending} />

      <View className="gap-3">
        <Text className="text-xl font-bold text-[#111827]">Flare events</Text>
        {flareEvents.length ? (
          flareEvents.map((event) => (
            <Card key={event.date} className="p-4">
              <Text className="text-base font-bold text-[#111827]">
                {friendlyDate(event.date)}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-[#6B7280]">
                {event.risk.reasons.join(' | ')}
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No high-risk days"
            message="High-risk flare days from the selected period will appear here."
          />
        )}
      </View>
    </ScrollView>
  );
}

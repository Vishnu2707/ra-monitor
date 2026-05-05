import { useQuery } from '@tanstack/react-query';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { CircularGauge } from '../components/CircularGauge';
import { FlareRiskBanner } from '../components/FlareRiskBanner';
import { InsightCard } from '../components/InsightCard';
import { MetricCard } from '../components/MetricCard';
import { toDateKey } from '../lib/dates';
import {
  supabase,
  type AiInsight,
  type AppleHealthDaily,
  type DailyLog,
  type FoodLog,
} from '../lib/supabase';
import type { AppTab } from '../navigation/AppNavigator';
import { getFlareRisk } from '../services/flareRisk';
import { useAuthStore } from '../store/authStore';

type HomeScreenProps = {
  onNavigate: (tab: AppTab) => void;
};

async function fetchTodayHealth(userId: string, today: string) {
  const { data, error } = await supabase
    .from('apple_health_daily')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AppleHealthDaily | null;
}

async function fetchTodayDailyLog(userId: string, today: string) {
  const { data, error } = await supabase
    .from('daily_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as DailyLog | null;
}

async function fetchTodayFood(userId: string, today: string) {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('log_date', today)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as FoodLog | null;
}

async function fetchLatestInsight(userId: string) {
  const { data, error } = await supabase
    .from('ai_insights')
    .select('*')
    .eq('user_id', userId)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as AiInsight | null;
}

function firstNameFrom({
  fullName,
  metadataName,
}: {
  fullName?: string | null;
  metadataName?: unknown;
}) {
  if (fullName?.trim()) {
    return fullName.trim().split(' ')[0];
  }

  if (typeof metadataName === 'string' && metadataName.trim()) {
    return metadataName.trim().split(' ')[0];
  }

  return 'Vishnu';
}

function displayDate() {
  const date = new Date();
  const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ];
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return `${weekdays[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
}

function average(values: number[]) {
  if (!values.length) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function healthScore(health?: AppleHealthDaily | null, dailyLog?: DailyLog | null) {
  const parts: number[] = [];

  if (typeof health?.gait_score === 'number') {
    parts.push(health.gait_score);
  }

  if (typeof dailyLog?.pain_score === 'number') {
    parts.push((10 - dailyLog.pain_score) * 10);
  }

  if (typeof dailyLog?.sleep_hours === 'number') {
    parts.push(Math.min(dailyLog.sleep_hours / 8, 1) * 100);
  }

  return average(parts);
}

function scoreStatus(score: number | null) {
  if (score === null) {
    return { label: '--', status: 'Waiting', color: '#9CA3AF' };
  }

  if (score > 75) {
    return { label: String(score), status: 'Good', color: '#10B981' };
  }

  if (score >= 50) {
    return { label: String(score), status: 'Monitor', color: '#F59E0B' };
  }

  return { label: String(score), status: 'Rest Today', color: '#EF4444' };
}

function formatNumber(value?: number | null) {
  return typeof value === 'number' ? Math.round(value).toLocaleString() : null;
}

function EmptyMetricCard({ title }: { title: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>--</Text>
    </View>
  );
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const today = toDateKey();
  const userId = user?.id;
  const name = firstNameFrom({
    fullName: profile?.full_name,
    metadataName: user?.user_metadata?.full_name,
  });

  const healthQuery = useQuery({
    queryKey: ['home-health', userId, today],
    queryFn: () => fetchTodayHealth(userId as string, today),
    enabled: Boolean(userId),
  });

  const dailyLogQuery = useQuery({
    queryKey: ['home-daily-log', userId, today],
    queryFn: () => fetchTodayDailyLog(userId as string, today),
    enabled: Boolean(userId),
  });

  const foodQuery = useQuery({
    queryKey: ['home-food', userId, today],
    queryFn: () => fetchTodayFood(userId as string, today),
    enabled: Boolean(userId),
  });

  const insightQuery = useQuery({
    queryKey: ['latest-insight', userId],
    queryFn: () => fetchLatestInsight(userId as string),
    enabled: Boolean(userId),
  });

  const health = healthQuery.data;
  const dailyLog = dailyLogQuery.data;
  const foodLog = foodQuery.data;
  const hasData = Boolean(health || dailyLog || foodLog);
  const score = healthScore(health, dailyLog);
  const scoreInfo = scoreStatus(score);
  const risk = getFlareRisk({
    gait_score: health?.gait_score,
    pain_score: dailyLog?.pain_score,
    walking_asymmetry: health?.avg_walking_asymmetry,
    sleep_hours: dailyLog?.sleep_hours,
    inflammatory_score: foodLog?.inflammatory_score,
    steps: health?.steps,
  });

  if (!hasData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View>
            <Text style={styles.header}>Good morning, {name}</Text>
            <Text style={styles.dateText}>{displayDate()}</Text>
          </View>

          <View style={styles.gaugeWrap}>
            <CircularGauge
              value={0}
              size={224}
              color="#D1D5DB"
              label="--"
              sublabel="RA Score"
            />
          </View>

          <View style={styles.metricGrid}>
            <View style={styles.metricRow}>
              <EmptyMetricCard title="Steps" />
              <EmptyMetricCard title="Gait Score" />
            </View>
            <View style={styles.metricRow}>
              <EmptyMetricCard title="Pain" />
              <EmptyMetricCard title="Heart Rate" />
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              title="Sync Apple Watch"
              onPress={() => onNavigate('Sync')}
            />
            <Button
              title="Log Today's Symptoms"
              variant="ghost"
              className="border-[#2563EB]"
              textClassName="text-[#2563EB]"
              onPress={() => onNavigate('Daily')}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.header}>Good morning, {name}</Text>
          <Text style={styles.dateText}>{displayDate()}</Text>
        </View>

        <>
          <Card className="items-center">
            <Text className="mb-2 text-base font-bold text-[#111827]">
              Today&apos;s RA Health Score
            </Text>
            <CircularGauge
              value={score ?? 0}
              size={228}
              color={scoreInfo.color}
              label={scoreInfo.label}
              sublabel={scoreInfo.status}
            />
          </Card>

          <View className="gap-3">
            <View className="flex-row gap-3">
              <MetricCard
                title="Steps"
                value={formatNumber(health?.steps)}
                icon="ST"
              />
              <MetricCard
                title="Gait Score"
                value={formatNumber(health?.gait_score)}
                unit="/100"
                icon="GT"
              />
            </View>
            <View className="flex-row gap-3">
              <MetricCard
                title="Pain Level"
                value={formatNumber(dailyLog?.pain_score)}
                unit="/10"
                icon="PN"
              />
              <MetricCard
                title="Heart Rate"
                value={formatNumber(health?.avg_heart_rate)}
                unit="bpm"
                icon="HR"
              />
            </View>
          </View>

          <FlareRiskBanner risk={risk.level} factors={risk.reasons} />
        </>

        <InsightCard text={insightQuery.data?.insight_text} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 112,
    gap: 24,
    backgroundColor: '#FFFFFF',
  },
  header: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
  },
  dateText: {
    marginTop: 8,
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '500',
  },
  gaugeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  metricGrid: {
    gap: 12,
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minHeight: 118,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    padding: 18,
    justifyContent: 'space-between',
  },
  metricTitle: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  metricValue: {
    color: '#111827',
    fontSize: 34,
    fontWeight: '700',
  },
  actions: {
    gap: 12,
  },
});

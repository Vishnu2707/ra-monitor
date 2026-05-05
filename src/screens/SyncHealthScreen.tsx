import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { friendlyDate, daysAgoKey } from '../lib/dates';
import { supabase, type AppleHealthDaily } from '../lib/supabase';
import { requestHealthPermissions } from '../services/healthkit';
import { syncLast7Days, type HealthSyncSummary } from '../services/healthSync';
import { useAuthStore } from '../store/authStore';

async function fetchSyncedHealth(userId: string) {
  const { data, error } = await supabase
    .from('apple_health_daily')
    .select('*')
    .eq('user_id', userId)
    .gte('date', daysAgoKey(6))
    .order('date', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as AppleHealthDaily[];
}

function WatchIllustration() {
  return (
    <View className="items-center">
      <View className="h-10 w-20 rounded-t-3xl bg-slate-200" />
      <View className="h-40 w-32 items-center justify-center rounded-[36px] border-8 border-slate-200 bg-white shadow-sm">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-blue-50">
          <Text className="text-2xl font-bold text-[#2563EB]">AW</Text>
        </View>
      </View>
      <View className="h-10 w-20 rounded-b-3xl bg-slate-200" />
    </View>
  );
}

export function SyncHealthScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [connected, setConnected] = useState(false);

  const healthQuery = useQuery({
    queryKey: ['health-daily', userId],
    queryFn: () => fetchSyncedHealth(userId as string),
    enabled: Boolean(userId),
  });

  const permissionMutation = useMutation({
    mutationFn: requestHealthPermissions,
    onSuccess: () => setConnected(true),
  });

  const syncMutation = useMutation<HealthSyncSummary, Error>({
    mutationFn: async () => {
      if (!userId) {
        throw new Error('You must be logged in to sync HealthKit.');
      }

      return syncLast7Days(userId);
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['health-daily', userId] }),
        queryClient.invalidateQueries({ queryKey: ['home-health', userId] }),
      ]);
    },
  });

  const canSync = connected || Boolean(healthQuery.data?.length);

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-5 px-5 pb-8 pt-5"
    >
      <View>
        <Text className="text-3xl font-bold text-[#111827]">Apple Health</Text>
        <Text className="mt-2 text-base leading-6 text-[#6B7280]">
          Connect Apple Health to sync real steps, gait, heart rate, and active
          energy.
        </Text>
      </View>

      <Card className="items-center gap-5">
        <WatchIllustration />
        <View className="w-full gap-3">
          <Button
            title="Connect Apple Health"
            loading={permissionMutation.isPending}
            onPress={() => permissionMutation.mutate()}
          />
          {canSync ? (
            <Button
              title="Sync Last 7 Days"
              variant="secondary"
              loading={syncMutation.isPending}
              onPress={() => syncMutation.mutate()}
            />
          ) : null}
        </View>
        <Text className="text-center text-sm leading-6 text-[#6B7280]">
          HealthKit requires custom build for real device.
        </Text>
      </Card>

      {syncMutation.data ? (
        <Card className="border-green-100 bg-[#ECFDF5]">
          <Text className="text-base font-bold text-[#047857]">
            Synced {syncMutation.data.synced} days of data
          </Text>
          <Text className="mt-2 text-sm text-[#6B7280]">
            {syncMutation.data.from} to {syncMutation.data.to}
          </Text>
        </Card>
      ) : null}

      {permissionMutation.error || syncMutation.error ? (
        <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <Text className="text-sm leading-6 text-rose-700">
            {(permissionMutation.error as Error | null)?.message ??
              (syncMutation.error as Error | null)?.message}
          </Text>
        </View>
      ) : null}

      <View className="gap-3">
        <Text className="text-xl font-bold text-[#111827]">Synced summary</Text>
        {healthQuery.data?.length ? (
          healthQuery.data.map((day) => (
            <Card key={day.id ?? day.date} className="p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-bold text-[#111827]">
                  {friendlyDate(day.date)}
                </Text>
                <Text className="text-sm font-bold text-[#2563EB]">
                  Gait {day.gait_score ?? '--'}
                </Text>
              </View>
              <Text className="mt-2 text-sm leading-6 text-[#6B7280]">
                {day.steps?.toLocaleString() ?? '--'} steps ·{' '}
                {day.avg_heart_rate ?? '--'} bpm ·{' '}
                {day.avg_walking_asymmetry ?? '--'}% asymmetry
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No synced data"
            message="After a real device sync, Apple Health rows will appear here."
          />
        )}
      </View>
    </ScrollView>
  );
}

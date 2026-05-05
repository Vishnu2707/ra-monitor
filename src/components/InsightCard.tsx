import { ActivityIndicator, Text, View } from 'react-native';

type InsightCardProps = {
  text?: string | null;
  loading?: boolean;
};

export function InsightCard({ text, loading = false }: InsightCardProps) {
  return (
    <View className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
      <Text className="text-base font-bold text-[#111827]">Weekly Insight</Text>
      {loading ? (
        <View className="mt-4 flex-row items-center gap-3">
          <ActivityIndicator color="#2563EB" />
          <Text className="text-sm font-semibold text-[#6B7280]">
            Writing insight...
          </Text>
        </View>
      ) : (
        <Text className="mt-3 text-base italic leading-7 text-[#374151]">
          {text || 'Generate an insight once you have real synced or logged data.'}
        </Text>
      )}
    </View>
  );
}

import { Text, View } from 'react-native';

import { Card } from './Card';

type MetricCardProps = {
  title: string;
  value: string | number | null | undefined;
  unit?: string;
  icon?: string;
  trend?: 'up' | 'down' | 'neutral';
};

const trendCopy = {
  up: { text: 'Up', color: 'text-[#10B981]' },
  down: { text: 'Down', color: 'text-rose-600' },
  neutral: { text: 'Stable', color: 'text-[#6B7280]' },
};

export function MetricCard({
  title,
  value,
  unit,
  icon = '',
  trend = 'neutral',
}: MetricCardProps) {
  const displayValue =
    value === null || value === undefined || value === '' ? 'No data' : String(value);
  const trendState = trendCopy[trend];

  return (
    <Card className="min-h-[150px] flex-1 justify-between">
      <View className="flex-row items-start justify-between">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-blue-50">
          <Text className="text-base font-bold text-[#2563EB]">{icon}</Text>
        </View>
        <Text className={`text-xs font-bold ${trendState.color}`}>
          {trendState.text}
        </Text>
      </View>
      <View>
        <Text className="text-sm font-semibold text-[#6B7280]">{title}</Text>
        <View className="mt-2 flex-row items-end">
          <Text
            className="max-w-[120px] text-2xl font-bold text-[#111827]"
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {displayValue}
          </Text>
          {unit && displayValue !== 'No data' ? (
            <Text className="mb-1 ml-1 text-sm font-semibold text-[#6B7280]">
              {unit}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

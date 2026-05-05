import { Pressable, Text, View } from 'react-native';

import { CircularGauge } from './CircularGauge';

type MealAnalysis = {
  foods_detected?: string[] | null;
  inflammatory_score?: number | null;
  ra_note?: string | null;
};

type MealCardProps = {
  mealType: string;
  onAddPhoto: () => void;
  analysis?: MealAnalysis | null;
  loading?: boolean;
};

const mealInitials: Record<string, string> = {
  Breakfast: 'B',
  Lunch: 'L',
  Dinner: 'D',
  Snack: 'S',
};

export function MealCard({
  mealType,
  onAddPhoto,
  analysis,
  loading = false,
}: MealCardProps) {
  const score =
    typeof analysis?.inflammatory_score === 'number'
      ? Math.max(0, Math.min(10, analysis.inflammatory_score))
      : null;

  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#ECFDF5]">
            <Text className="text-lg font-bold text-[#10B981]">
              {mealInitials[mealType] ?? mealType.slice(0, 1)}
            </Text>
          </View>
          <View>
            <Text className="text-base font-bold text-[#111827]">{mealType}</Text>
            <Text className="text-sm text-[#6B7280]">
              {analysis ? 'Analysis saved' : 'No photo yet'}
            </Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={loading}
          onPress={onAddPhoto}
          className="min-h-11 justify-center rounded-full bg-[#2563EB] px-4 active:opacity-90 disabled:opacity-60"
        >
          <Text className="text-sm font-bold text-white">
            {loading ? 'Adding...' : 'Add Photo'}
          </Text>
        </Pressable>
      </View>

      {analysis ? (
        <View className="mt-5 rounded-2xl bg-[#F8FAFB] p-4">
          <View className="flex-row gap-4">
            <CircularGauge
              value={(score ?? 0) * 10}
              size={104}
              color={score !== null && score > 6 ? '#F59E0B' : '#10B981'}
              label={score === null ? '--' : score.toFixed(1)}
              sublabel="Inflamm."
            />
            <View className="flex-1 justify-center">
              <View className="flex-row flex-wrap gap-2">
                {(analysis.foods_detected ?? []).length ? (
                  (analysis.foods_detected ?? []).map((food) => (
                    <View
                      key={food}
                      className="rounded-full bg-white px-3 py-1"
                    >
                      <Text className="text-xs font-semibold text-[#374151]">
                        {food}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-sm text-[#6B7280]">
                    No foods confidently detected.
                  </Text>
                )}
              </View>
            </View>
          </View>
          {analysis.ra_note ? (
            <Text className="mt-4 text-sm italic leading-6 text-[#6B7280]">
              {analysis.ra_note}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

import { Text, View } from 'react-native';

type FlareRiskBannerProps = {
  risk: 'low' | 'medium' | 'high';
  factors: string[];
};

export function FlareRiskBanner({ risk, factors }: FlareRiskBannerProps) {
  if (risk === 'low') {
    return null;
  }

  const high = risk === 'high';

  return (
    <View
      className={`rounded-2xl border p-5 ${
        high ? 'border-rose-200 bg-rose-50' : 'border-amber-200 bg-amber-50'
      }`}
    >
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-bold text-[#111827]">Flare risk</Text>
        <View
          className={`rounded-full px-3 py-1 ${
            high ? 'bg-rose-600' : 'bg-amber-500'
          }`}
        >
          <Text className="text-xs font-bold uppercase text-white">{risk}</Text>
        </View>
      </View>
      <Text className="mt-3 text-sm leading-6 text-[#6B7280]">
        {factors.length
          ? factors.join(' | ')
          : 'A few signals need a little attention today.'}
      </Text>
    </View>
  );
}

import { Pressable, ScrollView, Text, View } from 'react-native';

type ScorePickerProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
};

export function ScorePicker({
  label,
  value,
  onChange,
  min = 0,
  max = 10,
}: ScorePickerProps) {
  const values = Array.from({ length: max - min + 1 }, (_, index) => min + index);

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-[#111827]">{label}</Text>
        <Text className="text-sm font-semibold text-[#2563EB]">{value}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {values.map((item) => {
          const selected = item === value;

          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(item)}
              className={`h-11 w-11 items-center justify-center rounded-full border ${
                selected
                  ? 'border-[#2563EB] bg-[#2563EB]'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  selected ? 'text-white' : 'text-[#111827]'
                }`}
              >
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

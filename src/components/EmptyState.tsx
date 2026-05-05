import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <View className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-5">
      <Text className="text-base font-bold text-[#111827]">{title}</Text>
      <Text className="mt-2 text-sm leading-6 text-[#6B7280]">{message}</Text>
    </View>
  );
}

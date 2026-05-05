import {
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

type InputProps = TextInputProps & {
  label: string;
  error?: string | null;
  className?: string;
  inputClassName?: string;
  suffix?: string;
};

export function Input({
  label,
  error,
  className = '',
  inputClassName = '',
  suffix,
  ...props
}: InputProps) {
  return (
    <View className={`gap-2 ${className}`}>
      <Text className="text-sm font-bold text-[#111827]">{label}</Text>
      <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
        <TextInput
          placeholderTextColor="#9CA3AF"
          className={`min-h-14 flex-1 text-base text-[#111827] ${
            props.multiline ? 'min-h-32 py-4' : ''
          } ${inputClassName}`}
          {...props}
        />
        {suffix ? (
          <Text className="ml-3 text-sm font-semibold text-[#6B7280]">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? <Text className="text-sm text-rose-700">{error}</Text> : null}
    </View>
  );
}

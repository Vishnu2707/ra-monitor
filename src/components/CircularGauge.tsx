import { Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

type CircularGaugeProps = {
  value: number;
  size?: number;
  color?: string;
  label: string;
  sublabel?: string;
};

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

export function CircularGauge({
  value,
  size = 220,
  color = '#2563EB',
  label,
  sublabel,
}: CircularGaugeProps) {
  const strokeWidth = Math.max(12, size * 0.07);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = clamp(value);
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const center = size / 2;

  return (
    <View className="items-center justify-center" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
          />
        </G>
      </Svg>
      <View className="absolute inset-0 items-center justify-center px-6">
        <Text
          className="text-center text-5xl font-bold text-[#111827]"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>
        {sublabel ? (
          <Text className="mt-1 text-center text-base font-semibold text-[#6B7280]">
            {sublabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

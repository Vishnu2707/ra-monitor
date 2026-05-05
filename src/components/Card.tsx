import { View, type ViewProps } from 'react-native';

type CardProps = ViewProps & {
  className?: string;
};

export function Card({ className = '', ...props }: CardProps) {
  return (
    <View
      className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${className}`}
      {...props}
    />
  );
}

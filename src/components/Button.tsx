import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
} from 'react-native';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = PressableProps & {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
  textClassName?: string;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-[#2563EB]',
  secondary: 'bg-[#ECFDF5]',
  ghost: 'border border-[#2563EB] bg-white',
  danger: 'bg-rose-600',
};

const textClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-[#047857]',
  ghost: 'text-[#2563EB]',
  danger: 'text-white',
};

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  textClassName = '',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`min-h-14 items-center justify-center rounded-2xl px-5 ${
        variantClasses[variant]
      } ${isDisabled ? 'opacity-60' : 'active:opacity-90'} ${className}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? '#fff' : '#2563EB'} />
      ) : (
        <Text
          className={`text-center text-base font-bold ${
            textClasses[variant]
          } ${textClassName}`}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

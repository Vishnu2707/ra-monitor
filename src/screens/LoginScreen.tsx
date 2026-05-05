import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useAuthStore } from '../store/authStore';

type LoginScreenProps = {
  onShowRegister: () => void;
};

export function LoginScreen({ onShowRegister }: LoginScreenProps) {
  const { login, loading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    clearError();
    await login(email, password);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-white px-5"
    >
      <View className="mb-8">
        <Text className="text-4xl font-bold text-[#111827]">
          RAMonitor
        </Text>
        <Text className="mt-3 text-lg leading-7 text-[#6B7280]">
          Track rheumatoid arthritis patterns with HealthKit, daily logs, and
          gentle AI summaries.
        </Text>
      </View>

      <Card className="gap-4">
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="password"
        />
        {error ? <Text className="text-sm text-rose-700">{error}</Text> : null}
        <Button
          title="Log in"
          loading={loading}
          disabled={!email || !password}
          onPress={submit}
        />
        <Button
          title="Create account"
          variant="secondary"
          onPress={onShowRegister}
        />
      </Card>
    </KeyboardAvoidingView>
  );
}

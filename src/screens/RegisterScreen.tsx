import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { useAuthStore } from '../store/authStore';

type RegisterScreenProps = {
  onShowLogin: () => void;
};

export function RegisterScreen({ onShowLogin }: RegisterScreenProps) {
  const { register, loading, error, clearError } = useAuthStore();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = async () => {
    clearError();
    await register(email, password, fullName);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 justify-center bg-white px-5"
    >
      <View className="mb-8">
        <Text className="text-4xl font-bold text-[#111827]">
          Create Account
        </Text>
        <Text className="mt-3 text-lg leading-7 text-[#6B7280]">
          Keep your RA tracking private in your own Supabase account.
        </Text>
      </View>

      <Card className="gap-4">
        <Input
          label="Full name"
          value={fullName}
          onChangeText={setFullName}
          autoComplete="name"
        />
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
          autoComplete="new-password"
        />
        {error ? <Text className="text-sm text-rose-700">{error}</Text> : null}
        <Button
          title="Register"
          loading={loading}
          disabled={!email || !password}
          onPress={submit}
        />
        <Button title="I have an account" variant="secondary" onPress={onShowLogin} />
      </Card>
    </KeyboardAvoidingView>
  );
}

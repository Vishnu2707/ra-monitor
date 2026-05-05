import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

function initials(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    return name
      .trim()
      .split(' ')
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  return email?.slice(0, 2).toUpperCase() ?? 'RA';
}

function metadataMedications(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function SettingsScreen() {
  const { user, profile, loading, error, updateProfile, logout, clearError } =
    useAuthStore();
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [diagnosisYear, setDiagnosisYear] = useState('');
  const [medications, setMedications] = useState('');
  const [saved, setSaved] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setDateOfBirth(profile?.date_of_birth ?? '');
    setDiagnosisYear(profile?.diagnosis_year ? String(profile.diagnosis_year) : '');
    setMedications(metadataMedications(user?.user_metadata?.medications));
  }, [profile, user?.user_metadata?.medications]);

  const submit = async () => {
    clearError();
    setLocalError(null);
    setSaved(false);
    await updateProfile({
      full_name: fullName.trim() || null,
      date_of_birth: dateOfBirth.trim() || null,
      diagnosis_year: diagnosisYear ? Number(diagnosisYear) : null,
    });

    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        medications: medications.trim() || null,
      },
    });

    if (metadataError) {
      setLocalError(metadataError.message);
      return;
    }

    setSaved(true);
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-5 px-5 pb-8 pt-5"
    >
      <View>
        <Text className="text-3xl font-bold text-[#111827]">Settings</Text>
        <Text className="mt-2 text-base leading-6 text-[#6B7280]">
          Profile, medication notes, and account access.
        </Text>
      </View>

      <Card>
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-[#2563EB]">
            <Text className="text-xl font-bold text-white">
              {initials(profile?.full_name, user?.email)}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-xl font-bold text-[#111827]">
              {profile?.full_name || 'RAMonitor user'}
            </Text>
            <Text className="mt-1 text-sm text-[#6B7280]">{user?.email}</Text>
          </View>
        </View>
      </Card>

      <Card className="gap-4">
        <Text className="text-lg font-bold text-[#111827]">Edit profile</Text>
        <Input label="Full name" value={fullName} onChangeText={setFullName} />
        <Input
          label="DOB"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
        />
        <Input
          label="Diagnosis year"
          value={diagnosisYear}
          onChangeText={setDiagnosisYear}
          keyboardType="number-pad"
          placeholder="YYYY"
        />
        <Input
          label="Medications"
          value={medications}
          onChangeText={setMedications}
          placeholder="Medication names"
        />
        {error || localError ? (
          <Text className="text-sm text-rose-700">{error ?? localError}</Text>
        ) : null}
        {saved && !error && !localError ? (
          <Text className="text-sm font-bold text-[#10B981]">Profile saved.</Text>
        ) : null}
        <Button title="Save" loading={loading} onPress={submit} />
      </Card>

      <View className="mt-4">
        <Button
          title="Logout"
          variant="danger"
          loading={loading}
          onPress={logout}
        />
      </View>
    </ScrollView>
  );
}

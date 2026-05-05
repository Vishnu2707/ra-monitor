import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { MealCard } from '../components/MealCard';
import { daysAgoKey, friendlyDate, toDateKey } from '../lib/dates';
import { supabase, type FoodLog } from '../lib/supabase';
import {
  analyzeFoodImage,
  uploadFoodImage,
  type FoodAnalysis,
} from '../services/foodAI';
import { useAuthStore } from '../store/authStore';

const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

async function fetchRecentFoodLogs(userId: string) {
  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', daysAgoKey(13))
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as FoodLog[];
}

function normalizeAnalysis(analysis: FoodAnalysis): FoodAnalysis {
  const foods = Array.isArray(analysis.foods_detected)
    ? analysis.foods_detected.map(String)
    : [];

  return {
    foods_detected: foods,
    estimated_calories:
      typeof analysis.estimated_calories === 'number'
        ? analysis.estimated_calories
        : null,
    protein_g: typeof analysis.protein_g === 'number' ? analysis.protein_g : null,
    carbs_g: typeof analysis.carbs_g === 'number' ? analysis.carbs_g : null,
    fat_g: typeof analysis.fat_g === 'number' ? analysis.fat_g : null,
    inflammatory_score:
      typeof analysis.inflammatory_score === 'number'
        ? analysis.inflammatory_score
        : null,
    ra_note: analysis.ra_note ? String(analysis.ra_note) : null,
  };
}

function average(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number');
  if (!valid.length) {
    return null;
  }

  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

export function FoodLogScreen() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [analysisByMeal, setAnalysisByMeal] = useState<Record<string, FoodAnalysis>>({});
  const [pendingMeal, setPendingMeal] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const foodQuery = useQuery({
    queryKey: ['food-logs', userId],
    queryFn: () => fetchRecentFoodLogs(userId as string),
    enabled: Boolean(userId),
  });

  const today = toDateKey();
  const todayLogs = useMemo(
    () => (foodQuery.data ?? []).filter((log) => log.log_date === today),
    [foodQuery.data, today],
  );
  const todayAverage = average(todayLogs.map((log) => log.inflammatory_score));

  const saveMutation = useMutation({
    mutationFn: async ({
      imageUri,
      mealType,
    }: {
      imageUri: string;
      mealType: string;
    }) => {
      if (!userId) {
        throw new Error('You must be logged in to save food logs.');
      }

      const aiResult = normalizeAnalysis(await analyzeFoodImage(imageUri));
      const imageUrl = await uploadFoodImage({ userId, uri: imageUri });
      const payload: FoodLog = {
        user_id: userId,
        log_date: today,
        meal_type: mealType,
        image_url: imageUrl,
        ...aiResult,
        analysis: aiResult,
      };

      const { error: saveError } = await supabase.from('food_logs').insert(payload);
      if (saveError) {
        throw saveError;
      }

      return { mealType, aiResult };
    },
    onSuccess: async ({ mealType, aiResult }) => {
      setAnalysisByMeal((current) => ({ ...current, [mealType]: aiResult }));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['food-logs', userId] }),
        queryClient.invalidateQueries({ queryKey: ['home-food', userId] }),
      ]);
    },
  });

  const pickImageForMeal = async (mealType: string) => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to upload a meal.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: false,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return;
    }

    setPendingMeal(mealType);
    try {
      await saveMutation.mutateAsync({
        mealType,
        imageUri: result.assets[0].uri,
      });
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setPendingMeal(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-5 px-5 pb-8 pt-5"
    >
      <View>
        <Text className="text-3xl font-bold text-[#111827]">Food</Text>
        <Text className="mt-2 text-base leading-6 text-[#6B7280]">
          Add real meal photos for Groq vision analysis.
        </Text>
      </View>

      <Card className="bg-blue-50">
        <Text className="text-sm font-bold uppercase text-[#2563EB]">
          Today&apos;s average inflammatory score
        </Text>
        <Text className="mt-2 text-4xl font-bold text-[#111827]">
          {todayAverage === null ? '--' : todayAverage.toFixed(1)}
          <Text className="text-lg text-[#6B7280]"> /10</Text>
        </Text>
      </Card>

      {error ? (
        <View className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <Text className="text-sm leading-6 text-rose-700">{error}</Text>
        </View>
      ) : null}

      <View className="gap-4">
        {mealTypes.map((mealType) => {
          const savedToday = todayLogs.find((log) => log.meal_type === mealType);
          const analysis = analysisByMeal[mealType] ?? savedToday ?? null;

          return (
            <MealCard
              key={mealType}
              mealType={mealType}
              analysis={analysis}
              loading={pendingMeal === mealType}
              onAddPhoto={() => void pickImageForMeal(mealType)}
            />
          );
        })}
      </View>

      <View className="gap-3">
        <Text className="text-xl font-bold text-[#111827]">Recent meals</Text>
        {foodQuery.data?.length ? (
          foodQuery.data.slice(0, 6).map((log) => (
            <Card key={log.id} className="p-4">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="text-base font-bold text-[#111827]">
                  {log.meal_type}
                </Text>
                <Text className="text-sm font-semibold text-[#6B7280]">
                  {friendlyDate(log.log_date)}
                </Text>
              </View>
              <Text className="mt-2 text-sm leading-6 text-[#6B7280]">
                {log.foods_detected?.join(', ') || 'No foods listed'} · Score{' '}
                {log.inflammatory_score ?? '--'}/10
              </Text>
            </Card>
          ))
        ) : (
          <EmptyState
            title="No food logs"
            message="Food analysis cards will appear after you add meal photos."
          />
        )}
      </View>
    </ScrollView>
  );
}

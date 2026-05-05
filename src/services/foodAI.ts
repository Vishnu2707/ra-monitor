import * as FileSystem from 'expo-file-system/legacy';

import { GROQ_VISION_MODEL, groqJson } from '../lib/groq';
import { supabase } from '../lib/supabase';

export type FoodAnalysis = {
  foods_detected: string[];
  estimated_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  inflammatory_score: number | null;
  ra_note: string | null;
};

function extensionFromUri(uri: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? 'jpg';
}

function mimeFromExtension(extension: string) {
  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  return 'image/jpeg';
}

export async function readImageAsBase64(uri: string) {
  const extension = extensionFromUri(uri);
  const mimeType = mimeFromExtension(extension);
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { base64, mimeType, extension };
}

export async function uploadFoodImage({
  userId,
  uri,
}: {
  userId: string;
  uri: string;
}) {
  const { base64, mimeType, extension } = await readImageAsBase64(uri);
  const response = await fetch(`data:${mimeType};base64,${base64}`);
  const body = await response.arrayBuffer();
  const path = `${userId}/${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('food-logs')
    .upload(path, body, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from('food-logs').getPublicUrl(path);
  return data.publicUrl;
}

export async function analyzeFoodImage(uri: string): Promise<FoodAnalysis> {
  const { base64, mimeType } = await readImageAsBase64(uri);

  return groqJson<FoodAnalysis>({
    model: GROQ_VISION_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You estimate meal contents for a rheumatoid arthritis tracking app. Return only JSON with the requested keys. Use null for values that cannot be estimated. Keep ra_note supportive, simple, non-diagnostic, and not medical advice.',
      },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Analyze this food image. Return JSON with foods_detected, estimated_calories, protein_g, carbs_g, fat_g, inflammatory_score from 0 to 10, and ra_note.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
            },
          },
        ],
      },
    ],
  });
}

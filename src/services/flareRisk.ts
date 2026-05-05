export type FlareRiskLevel = 'low' | 'medium' | 'high';

export type FlareRiskInput = {
  gait_score?: number | null;
  pain_score?: number | null;
  walking_asymmetry?: number | null;
  sleep_hours?: number | null;
  inflammatory_score?: number | null;
  steps?: number | null;
};

export type FlareRiskResult = {
  level: FlareRiskLevel;
  reasons: string[];
};

export function calculateGaitScore({
  walking_asymmetry,
  walking_speed,
}: {
  walking_asymmetry?: number | null;
  walking_speed?: number | null;
}) {
  let base = 100;

  if (typeof walking_asymmetry === 'number' && walking_asymmetry > 3) {
    base -= Math.min((walking_asymmetry - 3) * 5, 30);
  }

  if (typeof walking_speed === 'number' && walking_speed < 1.2) {
    base -= Math.min((1.2 - walking_speed) * 40, 25);
  }

  return Math.max(0, Math.round(base));
}

export function getFlareRisk(input: FlareRiskInput): FlareRiskResult {
  const highReasons: string[] = [];
  const mediumReasons: string[] = [];

  if (typeof input.gait_score === 'number' && input.gait_score < 70) {
    highReasons.push('Gait score below 70');
  }

  if (typeof input.pain_score === 'number' && input.pain_score > 6) {
    highReasons.push('Pain score above 6');
  }

  if (
    typeof input.walking_asymmetry === 'number' &&
    input.walking_asymmetry > 5
  ) {
    highReasons.push('Walking asymmetry above 5%');
  }

  if (typeof input.sleep_hours === 'number' && input.sleep_hours < 6) {
    mediumReasons.push('Sleep under 6 hours');
  }

  if (
    typeof input.inflammatory_score === 'number' &&
    input.inflammatory_score > 7
  ) {
    mediumReasons.push('Inflammatory food score above 7');
  }

  if (typeof input.steps === 'number' && input.steps < 3000) {
    mediumReasons.push('Steps below 3000');
  }

  if (highReasons.length > 0) {
    return { level: 'high', reasons: highReasons };
  }

  if (mediumReasons.length > 0) {
    return { level: 'medium', reasons: mediumReasons };
  }

  return { level: 'low', reasons: [] };
}

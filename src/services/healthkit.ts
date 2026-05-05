import { Platform } from 'react-native';
import AppleHealthKit, {
  type HealthInputOptions,
  type HealthKitPermissions,
  type HealthValue,
} from 'react-native-health';

import { calculateGaitScore } from './flareRisk';

export type HealthDailyAggregate = {
  date: string;
  steps: number | null;
  avg_heart_rate: number | null;
  avg_walking_speed: number | null;
  avg_walking_asymmetry: number | null;
  active_calories: number | null;
  gait_score: number | null;
};

const readPermissions = [
  AppleHealthKit.Constants.Permissions.StepCount,
  AppleHealthKit.Constants.Permissions.Steps,
  AppleHealthKit.Constants.Permissions.HeartRate,
  AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
  'WalkingSpeed',
  'WalkingAsymmetryPercentage',
] as HealthKitPermissions['permissions']['read'];

const permissions: HealthKitPermissions = {
  permissions: {
    read: readPermissions,
    write: [],
  },
};

function isHealthKitReady() {
  return Platform.OS === 'ios';
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function sumValues(samples: HealthValue[]) {
  if (!samples.length) {
    return null;
  }

  return Math.round(samples.reduce((total, sample) => total + sample.value, 0));
}

function averageValues(samples: HealthValue[], decimals = 1) {
  if (!samples.length) {
    return null;
  }

  const average =
    samples.reduce((total, sample) => total + sample.value, 0) / samples.length;
  const multiplier = 10 ** decimals;
  return Math.round(average * multiplier) / multiplier;
}

function initHealthKit() {
  return new Promise<void>((resolve, reject) => {
    if (!isHealthKitReady()) {
      reject(new Error('Apple HealthKit is only available on iPhone.'));
      return;
    }

    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve();
    });
  });
}

function getDailyStepSamples(options: HealthInputOptions) {
  return new Promise<HealthValue[]>((resolve, reject) => {
    AppleHealthKit.getDailyStepCountSamples(options, (error, results) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve(results ?? []);
    });
  });
}

function getHeartRateSamples(options: HealthInputOptions) {
  return new Promise<HealthValue[]>((resolve, reject) => {
    AppleHealthKit.getHeartRateSamples(options, (error, results) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve(results ?? []);
    });
  });
}

function getActiveEnergySamples(options: HealthInputOptions) {
  return new Promise<HealthValue[]>((resolve, reject) => {
    AppleHealthKit.getActiveEnergyBurned(options, (error, results) => {
      if (error) {
        reject(new Error(error));
        return;
      }

      resolve(results ?? []);
    });
  });
}

function getQuantitySamples(type: string, options: HealthInputOptions) {
  return new Promise<HealthValue[]>((resolve) => {
    const healthKit = AppleHealthKit as unknown as {
      getSamples: (
        input: Omit<HealthInputOptions, 'type'> & { type: string },
        callback: (error: string, results: HealthValue[]) => void,
      ) => void;
    };

    healthKit.getSamples({ ...options, type }, (error, results) => {
      if (error) {
        resolve([]);
        return;
      }

      resolve(results ?? []);
    });
  });
}

export async function requestHealthPermissions() {
  await initHealthKit();
  return true;
}

export async function readLast7DaysHealthData() {
  await initHealthKit();

  const today = startOfLocalDay(new Date());
  const days = Array.from({ length: 7 }, (_, index) =>
    addDays(today, index - 6),
  );

  const aggregates = await Promise.all(
    days.map(async (day): Promise<HealthDailyAggregate> => {
      const nextDay = addDays(day, 1);
      const options: HealthInputOptions = {
        startDate: day.toISOString(),
        endDate: nextDay.toISOString(),
        ascending: true,
        includeManuallyAdded: true,
      };

      const [steps, heartRate, activeEnergy, walkingSpeed, asymmetry] =
        await Promise.all([
          getDailyStepSamples(options),
          getHeartRateSamples({
            ...options,
            unit: AppleHealthKit.Constants.Units.bpm,
          }),
          getActiveEnergySamples({
            ...options,
            unit: AppleHealthKit.Constants.Units.kilocalorie,
          }),
          getQuantitySamples('WalkingSpeed', {
            ...options,
            unit: AppleHealthKit.Constants.Units.meter,
          }),
          getQuantitySamples('WalkingAsymmetryPercentage', {
            ...options,
            unit: AppleHealthKit.Constants.Units.percent,
          }),
        ]);

      const avg_walking_speed = averageValues(walkingSpeed, 2);
      const avg_walking_asymmetry = averageValues(asymmetry, 2);
      const hasGaitData =
        avg_walking_speed !== null || avg_walking_asymmetry !== null;

      return {
        date: toDateKey(day),
        steps: sumValues(steps),
        avg_heart_rate: averageValues(heartRate, 1),
        avg_walking_speed,
        avg_walking_asymmetry,
        active_calories: sumValues(activeEnergy),
        gait_score: hasGaitData
          ? calculateGaitScore({
              walking_speed: avg_walking_speed,
              walking_asymmetry: avg_walking_asymmetry,
            })
          : null,
      };
    }),
  );

  return aggregates;
}

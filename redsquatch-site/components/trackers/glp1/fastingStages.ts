export interface FastingStage {
  id: string;
  name: string;
  startHours: number;
  endHours: number; // Infinity for the last stage
  description: string;
}

// Edit this array to tweak boundaries or descriptions. Stages must be ordered by startHours.
export const FASTING_STAGES: FastingStage[] = [
  {
    id: 'fed',
    name: 'Fed',
    startHours: 0,
    endHours: 4,
    description: 'Digesting the last meal. Blood sugar and insulin are elevated as food is processed.',
  },
  {
    id: 'early_fast',
    name: 'Early Fast',
    startHours: 4,
    endHours: 12,
    description: 'Glucose stores are being tapped. Insulin drops and the body starts drawing on glycogen.',
  },
  {
    id: 'fat_burning',
    name: 'Fat-Burning',
    startHours: 12,
    endHours: 18,
    description: 'Glycogen stores run low. The body increasingly turns to stored fat as an energy source.',
  },
  {
    id: 'ketosis',
    name: 'Ketosis',
    startHours: 18,
    endHours: 24,
    description: 'Fat breakdown becomes the primary fuel. Ketone levels rise steadily.',
  },
  {
    id: 'deep_fast',
    name: 'Deep Fast',
    startHours: 24,
    endHours: Infinity,
    description: 'Extended fast. Metabolic adaptation deepens. Electrolytes and hydration become important.',
  },
];

export function getStage(elapsedMs: number): FastingStage {
  const hours = elapsedMs / 3_600_000;
  let current = FASTING_STAGES[0];
  for (const s of FASTING_STAGES) {
    if (hours >= s.startHours) current = s;
  }
  return current;
}

export function getNextStage(stage: FastingStage): FastingStage | null {
  const idx = FASTING_STAGES.indexOf(stage);
  return idx >= 0 && idx < FASTING_STAGES.length - 1 ? FASTING_STAGES[idx + 1] : null;
}

/** Progress 0–1 through the current stage window. Capped at 1 for the last stage. */
export function stageProgress(elapsedMs: number, stage: FastingStage): number {
  if (stage.endHours === Infinity) return 1;
  const start = stage.startHours * 3_600_000;
  const end = stage.endHours * 3_600_000;
  return Math.min(1, Math.max(0, (elapsedMs - start) / (end - start)));
}

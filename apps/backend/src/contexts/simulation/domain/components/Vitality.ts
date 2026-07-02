export const GROWTH_STAGE_NUTRITION_THRESHOLDS = [0, 10, 25, 50, 100] as const;

export interface Vitality {
  /** 0 = fully fed, 1 = starving. */
  hunger: number;
  /** 0 = exhausted, 1 = fully rested. */
  energy: number;
  /** 0 = dead, 1 = full health. */
  health: number;
  /** Age in ticks since spawn. */
  age: number;
  /** Cumulative nutrition consumed over the creature's life; drives growth stage. */
  nutritionAccumulated: number;
  /** Derived from nutritionAccumulated vs. GROWTH_STAGE_NUTRITION_THRESHOLDS. */
  growthStage: number;
}

export function growthStageForNutrition(nutrition: number): number {
  let stage = 0;
  for (const threshold of GROWTH_STAGE_NUTRITION_THRESHOLDS) {
    if (nutrition >= threshold) stage += 1;
    else break;
  }
  return stage - 1;
}

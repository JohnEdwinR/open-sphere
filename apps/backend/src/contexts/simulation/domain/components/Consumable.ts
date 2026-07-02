export interface Consumable {
  /** Hunger reduction (and Vitality.nutritionAccumulated gain) granted on consumption. */
  nutrition: number;
  /** Ticks remaining before this entity rots/despawns if never consumed. */
  decayTicksRemaining: number;
}

/**
 * MVP personality trait set (Simulation & World Design §3.1). Every value is
 * normalized [0, 1]. `hunger` here is the creature's baseline food-drive
 * trait (how strongly it prioritizes eating relative to other traits) — it
 * is distinct from Vitality.hunger, which is the *current* hunger level.
 */
export interface Personality {
  aggression: number;
  fear: number;
  curiosity: number;
  patience: number;
  greed: number;
  exploration: number;
  intelligence: number;
  memory: number;
  confidence: number;
  hunger: number;
}

export const PERSONALITY_TRAIT_NAMES: readonly (keyof Personality)[] = [
  "aggression",
  "fear",
  "curiosity",
  "patience",
  "greed",
  "exploration",
  "intelligence",
  "memory",
  "confidence",
  "hunger",
];

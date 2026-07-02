export type EntityId = string;

/**
 * String-keyed component type registry. Using a const map (not string
 * literals scattered across systems) keeps component names centralized so a
 * rename is a one-file change, per NFR-MAINT-001 (Clean Architecture layering).
 */
export const ComponentType = {
  Transform: "Transform",
  Vitality: "Vitality",
  Personality: "Personality",
  Perception: "Perception",
  Movement: "Movement",
  Consumable: "Consumable",
  Lifecycle: "Lifecycle",
  Ownership: "Ownership",
  Genetics: "Genetics",
  Intent: "Intent",
} as const;

export type ComponentTypeName = (typeof ComponentType)[keyof typeof ComponentType];

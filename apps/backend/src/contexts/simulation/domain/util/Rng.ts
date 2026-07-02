export type Rng = () => number;

/**
 * Seeded PRNG (mulberry32). Every place randomness is needed in the
 * simulation (genetics rolling, spawn placement) takes an injected Rng
 * rather than calling Math.random(), so a tick's outcome is reproducible
 * given the same input state and seed (Simulation & World Design §1) —
 * required for deterministic testing and future replay/consistency checks.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngRange(rng: Rng, min: number, max: number): number {
  return min + rng() * (max - min);
}

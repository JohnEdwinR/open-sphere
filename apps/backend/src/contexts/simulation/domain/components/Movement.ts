export interface Movement {
  /** World units per tick. */
  speed: number;
  target?: { x: number; y: number };
}

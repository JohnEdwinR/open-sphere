/**
 * Allele-pair model for future reproduction/inheritance (Simulation & World
 * Design §4). Not exercised by gameplay in MVP, but present from Phase 1 so
 * reproduction can be added later without migrating live creature data.
 */
export interface Genetics {
  seed: number;
  alleles: Record<string, [number, number]>;
}

export function phenotypeOf(genetics: Genetics, trait: string): number {
  const pair = genetics.alleles[trait];
  if (!pair) return 0.5;
  return (pair[0] + pair[1]) / 2;
}

export interface Ownership {
  /** Null for wild/unowned entities (Simulation & World Design §2.1). */
  ownerUserId: string | null;
}

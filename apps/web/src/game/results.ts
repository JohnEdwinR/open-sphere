import { get, set } from "idb-keyval";
import type { RunStats } from "./engine";

// In-game state lives only in memory/browser; once a run is over, just its
// final result is written here (IndexedDB). `synced` marks the point where a
// later "send final result to the database" step can pick up unsent runs.
export interface RunResult extends RunStats {
  id: string;
  endedAt: string;
  synced: boolean;
}

const KEY = "night-wizard-runs";
const MAX_RUNS = 200;

export async function loadRuns(): Promise<RunResult[]> {
  try {
    return (await get<RunResult[]>(KEY)) ?? [];
  } catch {
    return [];
  }
}

/**
 * Ask the browser not to evict our data under storage pressure (matters most
 * for an installed PWA on Android). Best effort; harmless if denied.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch {
    // unsupported or blocked
  }
}

export async function saveRun(stats: RunStats): Promise<RunResult[]> {
  const run: RunResult = { ...stats, id: crypto.randomUUID(), endedAt: new Date().toISOString(), synced: false };
  const runs = [...(await loadRuns()), run].slice(-MAX_RUNS);
  try {
    await set(KEY, runs);
  } catch {
    // Storage can be blocked (private mode); the run is simply not remembered.
  }
  return runs;
}

export function bests(runs: RunResult[]) {
  return {
    score: runs.reduce((m, r) => Math.max(m, r.score), 0),
    seconds: runs.reduce((m, r) => Math.max(m, r.seconds), 0),
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const t = Math.floor((seconds * 10) % 10);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${t}`;
}

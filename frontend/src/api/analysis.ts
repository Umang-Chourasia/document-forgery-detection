/**
 * Public API surface used by pages/components. Everything here is either
 * mock (see api/mock.ts) or a real call to the backend (see
 * api/catnetServer.ts). Pages should only ever import from this file —
 * that keeps the mock/real switch in one place.
 *
 * Since Phase 2 the real path persists to Supabase, and catnetServerGetAnalysis
 * already falls back to the database, so a link to a completed analysis keeps
 * working after a reload. The mock path still uses the legacy IndexedDB store
 * so the UI can be developed with no backend and no account; that store is no
 * longer the source of truth for signed-in users.
 */
import { catnetServerCreateAnalysis, catnetServerGetAnalysis } from "./catnetServer";
import { getHistoryEntry } from "./history";
import { mockCreateAnalysis, mockGetAnalysis } from "./mock";
import type { Analysis } from "../types/analysis";

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== "false";

export async function createAnalysis(file: File): Promise<Analysis> {
  return USE_MOCK ? mockCreateAnalysis(file) : catnetServerCreateAnalysis(file);
}

export async function getAnalysis(id: string): Promise<Analysis> {
  if (!USE_MOCK) return catnetServerGetAnalysis(id);

  try {
    return await mockGetAnalysis(id);
  } catch (err) {
    const historyEntry = await getHistoryEntry(id);
    if (historyEntry) return historyEntry;
    throw err;
  }
}

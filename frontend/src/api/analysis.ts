/**
 * Public API surface used by pages/components. Everything here is either
 * mock (see api/mock.ts) or a real call to the backend (see
 * api/catnetServer.ts). Pages should only ever import from this file —
 * that keeps the mock/real switch in one place. getAnalysis also falls
 * back to browser-local history (api/history.ts) so a link to a completed
 * analysis keeps working after a page reload, when the in-memory session
 * cache is gone but the history record survives.
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
  try {
    return await (USE_MOCK ? mockGetAnalysis(id) : catnetServerGetAnalysis(id));
  } catch (err) {
    const historyEntry = await getHistoryEntry(id);
    if (historyEntry) return historyEntry;
    throw err;
  }
}

/**
 * Browser-local analysis history (IndexedDB via idb), scoped to this device
 * and browser profile — there's no login system yet, so this is intentionally
 * not per-user. Stores actual image bytes (not blob: URLs, which don't
 * survive a reload) so history entries are viewable after the tab is closed
 * and reopened. When real auth/backend persistence arrives, this module is
 * the only thing that needs to change — pages only ever call these functions.
 */
import { openDB, type DBSchema } from "idb";
import type { Analysis } from "../types/analysis";

interface StoredPage {
  pageNumber: number;
  originalBlob: Blob;
  heatmapBlob: Blob | null;
  hasEvidence?: boolean;
}

interface StoredAnalysis {
  id: string;
  documentName: string;
  documentType: string;
  pageCount: number;
  createdAt: string;
  narrativeSummary?: string;
  pages: StoredPage[];
}

interface HistoryDB extends DBSchema {
  analyses: {
    key: string;
    value: StoredAnalysis;
    indexes: { "by-createdAt": string };
  };
}

const dbPromise = openDB<HistoryDB>("forgery-detection-history", 1, {
  upgrade(db) {
    const store = db.createObjectStore("analyses", { keyPath: "id" });
    store.createIndex("by-createdAt", "createdAt");
  },
});

async function blobFromUrl(url: string): Promise<Blob | null> {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

export async function saveHistoryEntry(analysis: Analysis): Promise<void> {
  const pages: StoredPage[] = [];
  for (const page of analysis.pages) {
    const originalBlob = await blobFromUrl(page.originalImageUrl);
    if (!originalBlob) continue;
    const heatmapBlob = await blobFromUrl(page.catnet.heatmapUrl);
    pages.push({
      pageNumber: page.pageNumber,
      originalBlob,
      heatmapBlob,
      hasEvidence: page.catnet.hasEvidence,
    });
  }
  if (pages.length === 0) return;

  const stored: StoredAnalysis = {
    id: analysis.id,
    documentName: analysis.documentName,
    documentType: analysis.documentType,
    pageCount: analysis.pageCount,
    createdAt: analysis.createdAt,
    narrativeSummary: analysis.narrative?.summary,
    pages,
  };

  const db = await dbPromise;
  await db.put("analyses", stored);
}

function toAnalysis(stored: StoredAnalysis): Analysis {
  return {
    id: stored.id,
    documentName: stored.documentName,
    documentType: stored.documentType,
    pageCount: stored.pageCount,
    status: "COMPLETED",
    stage: "REPORT",
    createdAt: stored.createdAt,
    narrative: stored.narrativeSummary ? { summary: stored.narrativeSummary } : undefined,
    pages: stored.pages.map((p) => ({
      pageNumber: p.pageNumber,
      originalImageUrl: URL.createObjectURL(p.originalBlob),
      catnet: {
        heatmapUrl: p.heatmapBlob ? URL.createObjectURL(p.heatmapBlob) : "",
        hasEvidence: p.hasEvidence,
      },
    })),
  };
}

export async function getHistoryEntry(id: string): Promise<Analysis | undefined> {
  const db = await dbPromise;
  const stored = await db.get("analyses", id);
  return stored ? toAnalysis(stored) : undefined;
}

export interface HistorySummary {
  id: string;
  documentName: string;
  documentType: string;
  createdAt: string;
  hasEvidence?: boolean;
  thumbnailUrl: string;
}

export async function listHistory(): Promise<HistorySummary[]> {
  const db = await dbPromise;
  const all = await db.getAllFromIndex("analyses", "by-createdAt");
  return all
    .slice()
    .reverse()
    .map((stored) => ({
      id: stored.id,
      documentName: stored.documentName,
      documentType: stored.documentType,
      createdAt: stored.createdAt,
      hasEvidence: stored.pages[0]?.hasEvidence,
      thumbnailUrl: URL.createObjectURL(stored.pages[0].originalBlob),
    }));
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const db = await dbPromise;
  await db.delete("analyses", id);
}

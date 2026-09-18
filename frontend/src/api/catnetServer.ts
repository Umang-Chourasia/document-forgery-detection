/**
 * Real backend implementation, matching the actual CAT-Net server contract
 * (catnet_server.py: POST /predict -> {status, job_id, results: [{filename, url}]}),
 * which differs from the originally-sketched /api/analyze contract in
 * types/analysis.ts. Adapted here rather than changing the backend, and
 * isolated in this file so pages never need to know the difference between
 * this and api/mock.ts.
 *
 * The backend has no GET-by-id endpoint and doesn't persist results, so
 * completed (and in-progress) analyses are cached in memory here for
 * getAnalysis() to read. Stages progress asynchronously the same way
 * api/mock.ts fakes them, except every stage here reflects real work:
 * CATNET is the actual /predict call, NARRATIVE is a real Gemini call
 * through the local narrative-service (skipped silently if unavailable).
 */
import { API_BASE_URL, ApiError, fetchBackendResourceAsObjectUrl } from "./client";
import { requestNarrative } from "./narrative";
import { saveHistoryEntry } from "./history";
import type { Analysis } from "../types/analysis";

interface PredictResponse {
  status: string;
  job_id: string;
  results: { filename: string; url: string }[];
}

const resultsCache = new Map<string, Analysis>();

function update(id: string, patch: Partial<Analysis>) {
  const current = resultsCache.get(id);
  if (!current) return;
  resultsCache.set(id, { ...current, ...patch });
}

async function runPipeline(id: string, file: File, originalImageUrl: string) {
  update(id, { status: "PROCESSING", stage: "CATNET" });

  let predictData: PredictResponse;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      body: formData,
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!response.ok) throw new Error(`CAT-Net server returned ${response.status}`);
    predictData = await response.json();
  } catch (err) {
    update(id, {
      status: "FAILED",
      error: err instanceof Error ? err.message : "CAT-Net inference failed.",
    });
    return;
  }

  // Resolve each heatmap to a local blob: URL rather than pointing <img> tags
  // straight at the backend — needed for ngrok's free-tier warning page (see
  // client.ts), and it also means downstream consumers (history, narrative)
  // never need to know or care how the backend is hosted.
  let pages;
  try {
    pages = await Promise.all(
      predictData.results.map(async (result, index) => ({
        pageNumber: index + 1,
        originalImageUrl,
        catnet: { heatmapUrl: await fetchBackendResourceAsObjectUrl(result.url) },
      })),
    );
  } catch (err) {
    update(id, {
      status: "FAILED",
      error: err instanceof Error ? err.message : "Failed to retrieve the heatmap result.",
    });
    return;
  }
  update(id, { pages, pageCount: pages.length });

  update(id, { stage: "NARRATIVE" });
  const firstHeatmapUrl = pages[0]?.catnet.heatmapUrl;
  const narrativeResult = firstHeatmapUrl
    ? await requestNarrative(file, firstHeatmapUrl)
    : ({ status: "skipped" } as const);

  const finalAnalysis: Analysis = {
    ...(resultsCache.get(id) as Analysis),
    status: "COMPLETED",
    stage: "REPORT",
    narrative: narrativeResult.status === "ok" ? { summary: narrativeResult.summary } : undefined,
    narrativeError: narrativeResult.status === "error" ? narrativeResult.reason : undefined,
  };
  resultsCache.set(id, finalAnalysis);
  void saveHistoryEntry(finalAnalysis);
}

export async function catnetServerCreateAnalysis(file: File): Promise<Analysis> {
  const id = crypto.randomUUID();
  const originalImageUrl = URL.createObjectURL(file);

  const analysis: Analysis = {
    id,
    documentName: file.name,
    documentType: file.type || "image",
    pageCount: 1,
    status: "QUEUED",
    stage: "UPLOAD",
    createdAt: new Date().toISOString(),
    pages: [{ pageNumber: 1, originalImageUrl, catnet: { heatmapUrl: "" } }],
  };
  resultsCache.set(id, analysis);

  void runPipeline(id, file, originalImageUrl);

  return analysis;
}

export async function catnetServerGetAnalysis(id: string): Promise<Analysis> {
  const cached = resultsCache.get(id);
  if (!cached) {
    throw new ApiError("Analysis not found in the live session cache.");
  }
  return cached;
}

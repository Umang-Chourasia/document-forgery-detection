/**
 * Real backend implementation, matching the actual CAT-Net server contract
 * (catnet_server.py: POST /predict -> {status, job_id, results: [{filename, url}]}),
 * which differs from the originally-sketched /api/analyze contract in
 * types/analysis.ts. Adapted here rather than changing the backend, and
 * isolated in this file so pages never need to know the difference between
 * this and api/mock.ts.
 *
 * Since Phase 2 the analysis is persisted in Supabase: the row is created
 * first so its SERVER-generated id is the one the UI routes to, files go to
 * private Storage, and the row is updated as the pipeline progresses. The
 * in-memory cache is kept purely so the live run can show stage-by-stage
 * progress without polling the database every 800ms; Supabase is the source
 * of truth once the run is over (or after a reload).
 *
 * The CAT-Net and Gemini calls themselves are unchanged.
 */
import { API_BASE_URL, ApiError, fetchBackendResourceAsBlob } from "./client";
import { requestNarrative } from "./narrative";
import {
  createAnalysisRecord,
  getAnalysisFromSupabase,
  markAnalysisFailed,
  updateAnalysisRecord,
  uploadDerived,
  uploadOriginal,
} from "./supabaseHistory";
import { generateThumbnail } from "../lib/thumbnail";
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

async function runPipeline(id: string, userId: string, file: File, originalImageUrl: string) {
  try {
    // --- Original upload: byte-for-byte, no recompression (forensic source).
    const originalPath = await uploadOriginal(userId, id, file);
    await updateAnalysisRecord(id, { original_path: originalPath });

    // --- CAT-Net inference (unchanged).
    update(id, { status: "PROCESSING", stage: "CATNET" });
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      body: formData,
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    if (!response.ok) throw new Error(`CAT-Net server returned ${response.status}`);
    const predictData: PredictResponse = await response.json();

    if (!predictData.results?.length) {
      throw new Error("CAT-Net returned no result for this image.");
    }

    // --- Heatmap: fetch once, use for both display and storage.
    const heatmapBlob = await fetchBackendResourceAsBlob(predictData.results[0].url);
    const heatmapUrl = URL.createObjectURL(heatmapBlob);
    const heatmapPath = await uploadDerived(userId, id, "heatmap.png", heatmapBlob, "image/png");

    const pages = [
      { pageNumber: 1, originalImageUrl, catnet: { heatmapUrl } },
    ];
    update(id, { pages, pageCount: 1 });

    // --- Thumbnail: derived, display-only, never replaces the original.
    let thumbnailPath: string | undefined;
    const thumbBlob = await generateThumbnail(file);
    if (thumbBlob) {
      thumbnailPath = await uploadDerived(userId, id, "thumbnail.webp", thumbBlob, "image/webp");
    }

    await updateAnalysisRecord(id, {
      heatmap_path: heatmapPath,
      ...(thumbnailPath ? { thumbnail_path: thumbnailPath } : {}),
    });

    // --- Forensic metrics, tampering risk, and narrative.
    // The metrics and risk are deterministic and computed server-side without
    // the language model; the narrative is the model's reading of them. A
    // narrative failure still leaves the measured evidence intact.
    update(id, { stage: "NARRATIVE" });
    const narrativeResult = await requestNarrative(file, heatmapUrl);

    const measured = narrativeResult.status === "ok" ? narrativeResult : null;

    const finalAnalysis: Analysis = {
      ...(resultsCache.get(id) as Analysis),
      status: "COMPLETED",
      stage: "REPORT",
      metrics: measured?.metrics,
      risk: measured?.risk,
      narrative: measured?.narrative,
      narrativeError:
        narrativeResult.status === "error"
          ? narrativeResult.reason
          : measured?.narrativeError,
    };
    resultsCache.set(id, finalAnalysis);

    await updateAnalysisRecord(id, {
      status: "COMPLETED",
      evidence_metrics: measured?.metrics ?? null,
      risk_level: measured?.risk?.level ?? null,
      narrative: measured
        ? { risk: measured.risk, narrative: measured.narrative ?? null }
        : null,
    });
  } catch (err) {
    // A FAILED analysis is persisted, but is never presented as a result.
    await markAnalysisFailed(id, err);
    update(id, {
      status: "FAILED",
      error: err instanceof Error ? err.message : "Analysis failed.",
    });
  }
}

export async function catnetServerCreateAnalysis(file: File): Promise<Analysis> {
  // The row is created before anything else so the database's own UUID is the
  // identity the UI routes to — a client-chosen id must never become the
  // primary key, or one user could address another user's row.
  const { id, userId, createdAt } = await createAnalysisRecord(file);
  const originalImageUrl = URL.createObjectURL(file);

  const analysis: Analysis = {
    id,
    documentName: file.name,
    documentType: file.type || "image",
    pageCount: 1,
    status: "QUEUED",
    stage: "UPLOAD",
    createdAt,
    pages: [{ pageNumber: 1, originalImageUrl, catnet: { heatmapUrl: "" } }],
  };
  resultsCache.set(id, analysis);

  void runPipeline(id, userId, file, originalImageUrl);

  return analysis;
}

export async function catnetServerGetAnalysis(id: string): Promise<Analysis> {
  const cached = resultsCache.get(id);
  if (cached) return cached;

  const stored = await getAnalysisFromSupabase(id);
  if (stored) return stored;

  throw new ApiError("Analysis not found.");
}

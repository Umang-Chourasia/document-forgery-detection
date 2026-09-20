/**
 * Supabase-backed analysis history — the source of truth for authenticated
 * users, replacing the browser-local IndexedDB store (api/history.ts, now
 * legacy and slated for removal in a later cleanup phase).
 *
 * Security notes:
 * - Row ownership is enforced by RLS (auth.uid() = user_id), not by the
 *   filters in this file. The .eq("user_id", ...) calls are for correctness
 *   and clarity; removing them would not grant access to anyone else's rows.
 * - The `documents` bucket is private. Nothing here ever produces a public
 *   URL; display uses short-lived signed URLs generated on demand.
 * - Object paths are {user_id}/{analysis_id}/..., which is what the Storage
 *   policies key off.
 */
import { supabase } from "./supabase";
import type {
  Analysis,
  AnalysisStatus,
  EvidenceMetrics,
  NarrativeEvidence,
  RiskLevel,
  TamperingRisk,
} from "../types/analysis";

const BUCKET = "documents";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

export interface AnalysisRow {
  id: string;
  user_id: string;
  document_name: string;
  document_type: string | null;
  status: AnalysisStatus;
  error: string | null;
  created_at: string;
  expires_at: string;
  original_path: string | null;
  heatmap_path: string | null;
  thumbnail_path: string | null;
  evidence_metrics: EvidenceMetrics | null;
  risk_level: RiskLevel | null;
  /** Stored as { risk, narrative } so the rule rationale survives a reload. */
  narrative: { risk?: TamperingRisk; narrative?: NarrativeEvidence } | null;
}

/** Strips anything that could leak backend internals before it reaches the
 *  database or the user. Keeps the message short and human-readable. */
export function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const cleaned = raw
    .replace(/https?:\/\/[^\s]+/gi, "[url]") // tunnel/backend URLs
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?\b/g, "[host]") // IPs
    .replace(/\b[A-Za-z]:\\[^\s]+/g, "[path]") // Windows paths
    .replace(/\/(?:home|Users)\/[^\s]+/g, "[path]"); // POSIX paths
  return cleaned.length > 200 ? `${cleaned.slice(0, 200)}…` : cleaned;
}

function extensionFor(file: File): string {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : undefined;
  if (fromName && /^[a-z0-9]{1,5}$/i.test(fromName)) return fromName.toLowerCase();
  const fromType = file.type.split("/")[1];
  return fromType && /^[a-z0-9]{1,5}$/i.test(fromType) ? fromType.toLowerCase() : "bin";
}

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("You must be signed in to run an analysis.");
  return data.user.id;
}

/** Creates the PROCESSING row and returns the SERVER-generated id. */
export async function createAnalysisRecord(
  file: File,
): Promise<{ id: string; userId: string; createdAt: string }> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("analyses")
    .insert({
      user_id: userId,
      document_name: file.name,
      document_type: file.type || null,
      status: "PROCESSING",
    })
    .select("id, created_at")
    .single();

  if (error) throw new Error(`Could not create the analysis record: ${error.message}`);
  return { id: data.id, userId, createdAt: data.created_at };
}

/** Uploads the original EXACTLY as received — no recompression, resizing or
 *  conversion. This is the forensic source and its bytes must not change. */
export async function uploadOriginal(
  userId: string,
  analysisId: string,
  file: File,
): Promise<string> {
  const path = `${userId}/${analysisId}/original.${extensionFor(file)}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type || undefined, upsert: true });
  if (error) throw new Error(`Original upload failed: ${error.message}`);
  return path;
}

export async function uploadDerived(
  userId: string,
  analysisId: string,
  filename: string,
  blob: Blob,
  contentType: string,
): Promise<string> {
  const path = `${userId}/${analysisId}/${filename}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw new Error(`Upload of ${filename} failed: ${error.message}`);
  return path;
}

export async function updateAnalysisRecord(
  id: string,
  patch: Partial<{
    status: AnalysisStatus;
    error: string | null;
    original_path: string;
    heatmap_path: string;
    thumbnail_path: string;
    evidence_metrics: unknown;
    risk_level: string | null;
    narrative: unknown;
  }>,
): Promise<void> {
  const { error } = await supabase.from("analyses").update(patch).eq("id", id);
  if (error) throw new Error(`Could not update the analysis record: ${error.message}`);
}

/** Best-effort failure marker — never throws, so a failing pipeline can't be
 *  masked by a secondary error while recording the first one. */
export async function markAnalysisFailed(id: string, err: unknown): Promise<void> {
  try {
    await supabase
      .from("analyses")
      .update({ status: "FAILED", error: sanitizeError(err) })
      .eq("id", id);
  } catch {
    /* swallow — the original failure is what matters */
  }
}

async function signedUrl(path: string | null): Promise<string> {
  if (!path) return "";
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) return "";
  return data.signedUrl;
}

function rowToAnalysis(row: AnalysisRow, originalUrl: string, heatmapUrl: string): Analysis {
  return {
    id: row.id,
    documentName: row.document_name,
    documentType: row.document_type ?? "image",
    pageCount: 1,
    status: row.status,
    stage: row.status === "COMPLETED" ? "REPORT" : undefined,
    createdAt: row.created_at,
    error: row.error ?? undefined,
    metrics: row.evidence_metrics ?? undefined,
    risk: row.narrative?.risk ?? undefined,
    narrative: row.narrative?.narrative ?? undefined,
    pages: [
      {
        pageNumber: 1,
        originalImageUrl: originalUrl,
        catnet: { heatmapUrl },
      },
    ],
  };
}

export async function getAnalysisFromSupabase(id: string): Promise<Analysis | undefined> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return undefined;

  const row = data as AnalysisRow;
  const [originalUrl, heatmapUrl] = await Promise.all([
    signedUrl(row.original_path),
    signedUrl(row.heatmap_path),
  ]);
  return rowToAnalysis(row, originalUrl, heatmapUrl);
}

export interface SupabaseHistorySummary {
  id: string;
  documentName: string;
  documentType: string;
  createdAt: string;
  status: AnalysisStatus;
  error?: string;
  riskLevel?: RiskLevel;
  thumbnailUrl: string;
}

export async function listAnalysesFromSupabase(): Promise<SupabaseHistorySummary[]> {
  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Could not load history: ${error.message}`);

  const rows = (data ?? []) as AnalysisRow[];
  return Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      documentName: row.document_name,
      documentType: row.document_type ?? "image",
      createdAt: row.created_at,
      status: row.status,
      error: row.error ?? undefined,
      riskLevel: row.risk_level ?? undefined,
      thumbnailUrl: await signedUrl(row.thumbnail_path ?? row.original_path),
    })),
  );
}

/**
 * Deletes an analysis. Storage objects go FIRST, then the row — if the row
 * were deleted first and the object removal then failed, the paths would be
 * gone and the files orphaned in the bucket with nothing pointing at them.
 */
export async function deleteAnalysisFromSupabase(id: string): Promise<void> {
  const { data, error: fetchError } = await supabase
    .from("analyses")
    .select("original_path, heatmap_path, thumbnail_path")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) throw new Error(`Could not look up the analysis: ${fetchError.message}`);

  const paths = [data?.original_path, data?.heatmap_path, data?.thumbnail_path].filter(
    (p): p is string => Boolean(p),
  );

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove(paths);
    if (storageError) {
      throw new Error(`Could not delete the stored files: ${storageError.message}`);
    }
  }

  const { error: rowError } = await supabase.from("analyses").delete().eq("id", id);
  if (rowError) throw new Error(`Could not delete the analysis: ${rowError.message}`);
}

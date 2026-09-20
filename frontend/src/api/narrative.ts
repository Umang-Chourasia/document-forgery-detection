/**
 * Calls the local narrative-service (see /narrative-service in the repo root),
 * which holds the Gemini API key server-side and never exposes it to the
 * browser.
 *
 * Since Phase 4 the service returns two distinct things:
 *   - metrics + risk: deterministic, measured from the heatmap, computed
 *     without involving the language model at all
 *   - narrative: the model's interpretation of that evidence
 *
 * They are kept separate all the way to the UI so measurement is never
 * presented as interpretation or vice versa. A narrative failure does not
 * discard the metrics, and we never fabricate either one.
 */
import type { EvidenceMetrics, NarrativeEvidence, TamperingRisk } from "../types/analysis";

const NARRATIVE_BASE_URL = import.meta.env.VITE_NARRATIVE_BASE_URL;

export type NarrativeResult =
  | {
      status: "ok";
      metrics: EvidenceMetrics;
      risk: TamperingRisk;
      narrative?: NarrativeEvidence;
      narrativeError?: string;
    }
  | { status: "skipped" }
  | { status: "error"; reason: string };

export async function requestNarrative(
  originalFile: File,
  heatmapUrl: string,
): Promise<NarrativeResult> {
  if (!NARRATIVE_BASE_URL) return { status: "skipped" };

  let heatmapBlob: Blob;
  try {
    const heatmapResponse = await fetch(heatmapUrl);
    if (!heatmapResponse.ok) {
      return { status: "error", reason: "Could not read the heatmap image to analyze." };
    }
    heatmapBlob = await heatmapResponse.blob();
  } catch {
    return { status: "error", reason: "Could not read the heatmap image to analyze." };
  }

  try {
    const formData = new FormData();
    formData.append("original", originalFile);
    formData.append("heatmap", heatmapBlob, "heatmap.png");

    const response = await fetch(`${NARRATIVE_BASE_URL}/api/narrate`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const detail = await response
        .json()
        .then((d) => (typeof d?.reason === "string" ? d.reason : undefined))
        .catch(() => undefined);
      return {
        status: "error",
        reason: detail ?? `Forensic analysis service returned an error (${response.status}).`,
      };
    }

    const data = await response.json();
    if (!data?.metrics || !data?.risk?.level) {
      return { status: "error", reason: "Forensic analysis service returned an unexpected response." };
    }

    return {
      status: "ok",
      metrics: data.metrics as EvidenceMetrics,
      risk: data.risk as TamperingRisk,
      narrative: data.narrative ?? undefined,
      narrativeError: data.narrativeError ?? undefined,
    };
  } catch {
    return {
      status: "error",
      reason: "Forensic analysis service is unreachable — is it running on this machine?",
    };
  }
}

/**
 * Calls the local narrative-service (see /narrative-service in the repo root),
 * which holds the Gemini API key server-side and never exposes it to the
 * browser.
 *
 * Failures are reported back as a reason string rather than swallowed: a
 * missing narrative must never break the rest of the analysis, but it also
 * shouldn't be indistinguishable from "not configured" — the UI surfaces the
 * reason so a rate limit or a stopped service is diagnosable at a glance.
 * We never fabricate narrative text when the call fails.
 */
const NARRATIVE_BASE_URL = import.meta.env.VITE_NARRATIVE_BASE_URL;

export type NarrativeResult =
  | { status: "ok"; summary: string }
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
      return { status: "error", reason: "Could not read the heatmap image to send for interpretation." };
    }
    heatmapBlob = await heatmapResponse.blob();
  } catch {
    return { status: "error", reason: "Could not read the heatmap image to send for interpretation." };
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
        reason: detail ?? `Interpretation service returned an error (${response.status}).`,
      };
    }

    const data = await response.json();
    if (typeof data.summary !== "string" || !data.summary.trim()) {
      return { status: "error", reason: "Interpretation service returned an empty response." };
    }
    return { status: "ok", summary: data.summary };
  } catch {
    return {
      status: "error",
      reason: "Interpretation service is unreachable — is it running on this machine?",
    };
  }
}

/**
 * Conceptual data model — NOT a finalized backend contract.
 * Fields here are placeholders for UI development against mock data.
 * When the real /api/analyze response shape is known, update this file
 * to match it exactly rather than adding fields speculatively elsewhere.
 */

export type AnalysisStatus = "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";

export type ProcessingStage =
  | "UPLOAD"
  | "PREPROCESSING"
  | "CATNET"
  | "NARRATIVE"
  | "REPORT";

export interface CatNetEvidence {
  /** URL to the heatmap image produced by CAT-Net localization. */
  heatmapUrl: string;
  /** URL to a backend-composited original+heatmap overlay, if the backend provides one. */
  overlayUrl?: string;
  /** Whether CAT-Net found any localized evidence at all — omitted when the backend doesn't report it. */
  hasEvidence?: boolean;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

/**
 * Deterministic measurements derived from the rendered CAT-Net heatmap.
 * These are measurements of the heatmap image, NOT direct CAT-Net outputs
 * and NOT a model confidence or probability.
 */
export interface EvidenceMetrics {
  source: string;
  heatmapWidth: number;
  heatmapHeight: number;
  evidenceThreshold: number;
  evidenceAreaFraction: number;
  evidencePixelCount: number;
  maxIntensity: number;
  meanIntensity: number;
  meanEvidenceIntensity: number;
  intensityHistogram: number[];
  regionCount: number;
  largestRegionFraction: number;
  largestRegionShare: number;
}

/** Tampering risk, decided by a fixed rule over the metrics — never by the LLM. */
export interface TamperingRisk {
  level: RiskLevel;
  rule: string;
  rationale: string;
  /**
   * The metric values the rule actually read, keyed by metric name. Already
   * emitted by classifyTamperingRisk() in narrative-service/metrics.mjs and
   * already persisted with the risk object; declared here so the UI can mark
   * which measurements drove the level instead of assuming a fixed list.
   * Optional because analyses stored before this was surfaced may omit it.
   */
  inputs?: Partial<Record<string, number>>;
}

/**
 * The LLM's reading of the evidence. Interpretation, explicitly not
 * measurement — the UI labels it as such so the two are never conflated.
 */
export interface NarrativeEvidence {
  /** Legacy single-paragraph form, kept for analyses stored before Phase 4. */
  summary?: string;

  /**
   * Concise point-wise form. These are the fields the UI renders now; the
   * prose fields below are retained so analyses stored before this format
   * still display correctly.
   */
  what_the_analysis_shows?: string[];
  interpretation?: string[];
  confidence?: string[];

  /** Prose form, from earlier stored analyses. Rendered only as a fallback. */
  observed_evidence?: string;
  location_description?: string;
  plain_language_meaning?: string;
}

export interface AnalysisPage {
  pageNumber: number;
  originalImageUrl: string;
  catnet: CatNetEvidence;
}

export interface Analysis {
  id: string;
  documentName: string;
  documentType: string;
  pageCount: number;
  status: AnalysisStatus;
  stage?: ProcessingStage;
  createdAt: string;
  pages: AnalysisPage[];
  /** Deterministic, measured. */
  metrics?: EvidenceMetrics;
  /** Deterministic, rule-based. */
  risk?: TamperingRisk;
  /** LLM interpretation of the above. */
  narrative?: NarrativeEvidence;
  /** Why the narrative step produced nothing, when it was attempted and failed. */
  narrativeError?: string;
  error?: string;
}

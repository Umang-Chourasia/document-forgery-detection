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
}

/**
 * The LLM's reading of the evidence. Interpretation, explicitly not
 * measurement — the UI labels it as such so the two are never conflated.
 */
export interface NarrativeEvidence {
  /** Legacy single-paragraph form, kept for analyses stored before Phase 4. */
  summary?: string;
  observed_evidence?: string;
  location_description?: string;
  plain_language_meaning?: string;
  possible_pattern?: string;
  pattern_reasoning?: string;
  pattern_confidence?: string;
  caveats?: string;
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

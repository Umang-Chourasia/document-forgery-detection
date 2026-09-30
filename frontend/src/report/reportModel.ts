import type { Analysis, RiskLevel } from "../types/analysis";

/**
 * The content of a downloadable analysis report, built from the completed
 * analysis already on screen. Pure data — no PDF, no images — so exactly what
 * a report says can be tested without rendering one.
 *
 * What is deliberately left out: the deterministic score, the rule name and
 * rationale, the rule's inputs and every threshold, the model's confidence
 * field, region coordinates, and any database id or storage path.
 */

export interface MetricRow {
  label: string;
  value: string;
  description: string;
}

export interface MetricGroup {
  title: string;
  rows: MetricRow[];
}

export interface ReportModel {
  /** Suggested download name, derived from the document name only. */
  fileName: string;
  documentName: string;
  analysedAt: string;
  generatedAt: string;
  pageCount: number;
  riskLevel: RiskLevel | null;
  /** "What the analysis shows" — empty when the interpretation is unavailable. */
  findings: string[];
  /** The single interpretation of the most significant region, or null. */
  interpretation: string | null;
  interpretationUnavailable: boolean;
  metricGroups: MetricGroup[];
  /** One plain sentence on what the measurements were taken from. */
  measurementBasis: string | null;
}

const percent = (fraction: number, digits = 2) => `${(fraction * 100).toFixed(digits)}%`;

const DATE_FORMAT: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" };

function formatDate(iso: string | undefined, fallback: string) {
  if (!iso) return fallback;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString(undefined, DATE_FORMAT);
}

/**
 * `invoice (final).png` → `document-forensics-invoice-final-report.pdf`.
 * Only the document's own name is used — never an id.
 */
export function reportFileName(documentName: string) {
  const stem = documentName.replace(/\.[^./\\]+$/, "");
  const safe = stem
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return `document-forensics-${safe || "document"}-report.pdf`;
}

export function buildReportModel(analysis: Analysis, now: Date = new Date()): ReportModel {
  const narrative = analysis.narrative;

  // Current analyses carry point-wise arrays; analyses stored before that
  // format carry prose fields. Either way the report shows ONE interpretation:
  // the single most significant region, exactly as the workspace does.
  let findings: string[] = [];
  let interpretation: string | null = null;
  if (narrative) {
    if (narrative.what_the_analysis_shows?.length || narrative.interpretation?.length) {
      findings = narrative.what_the_analysis_shows ?? [];
      interpretation = narrative.interpretation?.[0] ?? null;
    } else {
      findings = [narrative.observed_evidence, narrative.location_description].filter(
        (s): s is string => Boolean(s),
      );
      if (findings.length === 0 && narrative.summary) findings = [narrative.summary];
      interpretation = narrative.plain_language_meaning ?? null;
    }
  }
  const interpretationUnavailable = findings.length === 0 && interpretation === null;

  const m = analysis.metrics;
  const metricGroups: MetricGroup[] = [];
  let measurementBasis: string | null = null;

  if (m) {
    metricGroups.push(
      {
        title: "Intensity",
        rows: [
          {
            label: "Peak intensity",
            value: m.maxIntensity.toFixed(2),
            description: "Strongest single point on the heatmap",
          },
          {
            label: "Mean (flagged)",
            value: m.meanEvidenceIntensity.toFixed(2),
            description: "Average strength of the flagged pixels",
          },
        ],
      },
      {
        title: "Spread",
        rows: [
          {
            label: "Flagged area",
            value: percent(m.evidenceAreaFraction),
            description: "Share of the page flagged as evidence",
          },
          {
            label: "Regions",
            value: String(m.regionCount),
            description: "Separate connected flagged areas",
          },
          {
            label: "Largest region",
            value: percent(m.largestRegionFraction),
            description: "Share of the page the biggest region covers",
          },
          {
            label: "Concentration",
            value: percent(m.largestRegionShare, 0),
            description: "Share of the flagged evidence inside the biggest region",
          },
        ],
      },
    );

    // Present on every analysis since the strong-region measurements shipped;
    // older analyses simply omit the group.
    if (
      m.strongAreaFraction !== undefined &&
      m.strongRegionCount !== undefined &&
      m.strongLargestRegionFraction !== undefined
    ) {
      metricGroups.push({
        title: "Strong evidence",
        rows: [
          {
            label: "Strong-evidence area",
            value: percent(m.strongAreaFraction),
            description: "Share of the page in the strongest evidence band",
          },
          {
            label: "Strong regions",
            value: String(m.strongRegionCount),
            description: "Separate connected areas of strong evidence",
          },
          {
            label: "Largest strong region",
            value: percent(m.strongLargestRegionFraction),
            description: "Share of the page the biggest strong region covers",
          },
        ],
      });
    }

    measurementBasis =
      `Measured on the ${m.heatmapWidth} × ${m.heatmapHeight} evidence heatmap; ` +
      `${m.evidencePixelCount.toLocaleString()} pixels were flagged as evidence.`;
  }

  return {
    fileName: reportFileName(analysis.documentName),
    documentName: analysis.documentName,
    analysedAt: formatDate(analysis.createdAt, "Unknown"),
    generatedAt: now.toLocaleString(undefined, DATE_FORMAT),
    pageCount: analysis.pageCount || 1,
    riskLevel: analysis.risk?.level ?? null,
    findings,
    interpretation,
    interpretationUnavailable,
    metricGroups,
    measurementBasis,
  };
}

/**
 * The report can be produced once the analysis is final — including when the
 * interpretation step failed — and never while the interpretation is still
 * being written, even though the heatmap is already on screen by then.
 */
export function isReportReady(analysis: Analysis | null | undefined): analysis is Analysis {
  return Boolean(
    analysis && analysis.status === "COMPLETED" && analysis.pages[0]?.catnet.heatmapUrl,
  );
}

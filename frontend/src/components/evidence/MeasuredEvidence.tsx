import { Collapsible } from "../ui/Collapsible";
import { EvidenceList, type EvidenceItem } from "./EvidenceList";
import type { EvidenceMetrics, TamperingRisk } from "../../types/analysis";

/**
 * The deterministic layer, as a findings list.
 *
 * Every value is read straight out of EvidenceMetrics. Nothing is derived,
 * combined, rescaled or re-thresholded — the only arithmetic is
 * fraction-to-percent for display.
 *
 * `intensityHistogram` is intentionally not rendered. It stays in the metrics
 * payload because the deterministic risk rule reads it; it is simply not part
 * of the reviewer-facing presentation. Nor is there a heatmap legend.
 */
interface MeasuredEvidenceProps {
  metrics: EvidenceMetrics;
  risk?: TamperingRisk;
  /** Collapsed by default in narrow rails. */
  defaultOpen?: boolean;
}

/** Metric keys as the risk rule names them in `risk.inputs`. */
const RULE_INPUT_KEYS = [
  "evidenceAreaFraction",
  "maxIntensity",
  "largestRegionFraction",
  "largestRegionShare",
  "regionCount",
] as const;

export function MeasuredEvidence({ metrics, risk, defaultOpen = true }: MeasuredEvidenceProps) {
  const usedByRule = new Set(
    RULE_INPUT_KEYS.filter((key) => risk?.inputs?.[key] !== undefined),
  );
  const used = (key: string) => usedByRule.has(key as (typeof RULE_INPUT_KEYS)[number]);

  const items: EvidenceItem[] = [
    {
      key: "evidenceAreaFraction",
      label: "Flagged area",
      value: `${(metrics.evidenceAreaFraction * 100).toFixed(2)}%`,
      usedByRule: used("evidenceAreaFraction"),
    },
    {
      key: "maxIntensity",
      label: "Peak intensity",
      value: metrics.maxIntensity.toFixed(2),
      usedByRule: used("maxIntensity"),
    },
    {
      key: "meanEvidenceIntensity",
      label: "Mean (flagged)",
      value: metrics.meanEvidenceIntensity.toFixed(2),
      usedByRule: used("meanEvidenceIntensity"),
    },
    {
      key: "regionCount",
      label: "Regions",
      value: String(metrics.regionCount),
      usedByRule: used("regionCount"),
    },
    {
      key: "largestRegionFraction",
      label: "Largest region",
      value: `${(metrics.largestRegionFraction * 100).toFixed(2)}%`,
      usedByRule: used("largestRegionFraction"),
    },
    {
      key: "largestRegionShare",
      label: "Concentration",
      value: `${(metrics.largestRegionShare * 100).toFixed(0)}%`,
      usedByRule: used("largestRegionShare"),
    },
  ];

  return (
    <Collapsible title="Measured Evidence" titleClass="text-accent" defaultOpen={defaultOpen}>
      <p className="mb-4 text-small leading-relaxed text-ink-faint">
        Calculated from the detected evidence. Measurements, not interpretation.
      </p>

      <EvidenceList
        items={items}
        footer={
          <div className="mt-4 flex flex-col gap-1.5">
            {usedByRule.size > 0 && (
              <p className="label flex items-center gap-2 text-ink-faint">
                <span className="inline-block h-1 w-1 shrink-0 rounded-full bg-accent" />
                Read by the risk rule
              </p>
            )}
            <p className="label text-ink-faint">
              {metrics.heatmapWidth}×{metrics.heatmapHeight} ·{" "}
              {metrics.evidencePixelCount.toLocaleString()} px ≥ {metrics.evidenceThreshold}
            </p>
          </div>
        }
      />
    </Collapsible>
  );
}

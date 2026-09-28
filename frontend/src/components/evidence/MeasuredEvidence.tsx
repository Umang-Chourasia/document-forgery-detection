import type { ReactNode } from "react";
import { Collapsible } from "../ui/Collapsible";
import type { EvidenceMetrics, TamperingRisk } from "../../types/analysis";

/**
 * The deterministic layer, as grouped measurement tiles.
 *
 * Every value is read straight out of EvidenceMetrics. Nothing is derived,
 * combined, rescaled or re-thresholded — the only arithmetic is
 * fraction-to-percent for display. The one-line explanations describe how
 * narrative-service/metrics.mjs computes each value; they make no claim
 * about what a value means for the document.
 *
 * `intensityHistogram` is intentionally not rendered. It stays in the metrics
 * payload because the deterministic risk rule reads it; it is simply not part
 * of the reviewer-facing presentation. Nor is there a heatmap legend, and no
 * value is drawn as a bar or gauge.
 */
interface MeasuredEvidenceProps {
  metrics: EvidenceMetrics;
  risk?: TamperingRisk;
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

interface Metric {
  key: string;
  label: string;
  value: string;
  help: string;
}

const percent = (fraction: number, digits = 2) => `${(fraction * 100).toFixed(digits)}%`;

export function MeasuredEvidence({ metrics, risk, defaultOpen = true }: MeasuredEvidenceProps) {
  const usedByRule = new Set<string>(
    RULE_INPUT_KEYS.filter((key) => risk?.inputs?.[key] !== undefined),
  );

  const intensity: Metric[] = [
    {
      key: "maxIntensity",
      label: "Peak intensity",
      value: metrics.maxIntensity.toFixed(2),
      help: "Strongest single point on the heatmap",
    },
    {
      key: "meanEvidenceIntensity",
      label: "Mean (flagged)",
      value: metrics.meanEvidenceIntensity.toFixed(2),
      help: "Average strength of the flagged pixels",
    },
  ];

  const spread: Metric[] = [
    {
      key: "evidenceAreaFraction",
      label: "Flagged area",
      value: percent(metrics.evidenceAreaFraction),
      help: "Share of the page at or above the evidence threshold",
    },
    {
      key: "regionCount",
      label: "Regions",
      value: String(metrics.regionCount),
      help: "Separate connected flagged areas",
    },
    {
      key: "largestRegionFraction",
      label: "Largest region",
      value: percent(metrics.largestRegionFraction),
      help: "Share of the page the biggest region covers",
    },
    {
      key: "largestRegionShare",
      label: "Concentration",
      value: percent(metrics.largestRegionShare, 0),
      help: "Share of the flagged evidence inside the biggest region",
    },
  ];

  return (
    <Collapsible
      title="Measured Evidence"
      defaultOpen={defaultOpen}
      heading={
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            <BarsGlyph />
          </span>
          <span className="text-[1.375rem] font-semibold tracking-[-0.02em]">Measured Evidence</span>
        </span>
      }
    >
      <p className="mb-8 flex items-start gap-2.5 rounded-control bg-accent-soft px-4 py-3 text-small leading-relaxed text-accent">
        <InfoGlyph />
        Calculated from the detected evidence — measurements, not interpretation.
      </p>

      <div className="flex flex-col gap-9">
        <MetricGroup
          title="Intensity"
          icon={<BoltGlyph />}
          metrics={intensity}
          usedByRule={usedByRule}
        />
        <MetricGroup
          title="Spread"
          icon={<SpreadGlyph />}
          metrics={spread}
          usedByRule={usedByRule}
        />
      </div>

      <div className="mt-8 flex flex-col gap-2 rounded-control bg-well px-4 py-3.5">
        {usedByRule.size > 0 && (
          <p className="flex items-center gap-2 text-small text-ink-muted">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-accent" />
            Read by the risk rule
          </p>
        )}
        <p className="font-mono text-[0.8125rem] text-ink-faint">
          Heatmap {metrics.heatmapWidth}×{metrics.heatmapHeight} ·{" "}
          {metrics.evidencePixelCount.toLocaleString()} px ≥ {metrics.evidenceThreshold}
        </p>
      </div>
    </Collapsible>
  );
}

function MetricGroup({
  title,
  icon,
  metrics,
  usedByRule,
}: {
  title: string;
  icon: ReactNode;
  metrics: Metric[];
  usedByRule: Set<string>;
}) {
  return (
    <section>
      {/* Group heading: a tinted band so each group reads as its own section. */}
      <div className="mb-4 flex items-center justify-between gap-3 rounded-control border border-accent/20 bg-accent-soft px-4 py-3">
        <h3 className="flex items-center gap-2.5 text-[1.25rem] font-semibold tracking-[-0.02em] text-accent">
          {icon}
          {title}
        </h3>
        <span className="rounded-full bg-canvas/40 px-2.5 py-0.5 font-mono text-[0.8125rem] text-accent/80">
          {metrics.length} {metrics.length === 1 ? "measurement" : "measurements"}
        </span>
      </div>
      <dl className="grid grid-cols-2 gap-2.5">
        {metrics.map((m) => {
          const ruled = usedByRule.has(m.key);
          return (
            <div
              key={m.key}
              className={`flex flex-col gap-2.5 rounded-[1.125rem] border bg-surface-raised px-4 pb-[1.125rem] pt-4 ${
                ruled ? "border-accent/25" : "border-hairline"
              }`}
            >
              <dt className="flex items-center justify-between gap-2 text-[1rem] font-semibold tracking-[-0.01em] text-ink">
                {m.label}
                {ruled && (
                  <span
                    title="Read by the risk rule"
                    aria-label="Read by the risk rule"
                    className="h-2 w-2 shrink-0 rounded-full bg-accent"
                  />
                )}
              </dt>
              <dd className="font-mono text-[1.75rem] font-medium leading-none tracking-[-0.02em] text-ink tabular-nums">
                {m.value}
              </dd>
              <dd className="text-[0.8125rem] leading-snug text-ink-faint">{m.help}</dd>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

function BoltGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        d="M13 3L5 13.5h6L10 21l8-10.5h-6L13 3z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SpreadGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function BarsGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[1.125rem] w-[1.125rem]">
      <path
        d="M4 20h16M7 20v-6M12 20V6M17 20v-9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function InfoGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="mt-[0.2em] h-4 w-4 shrink-0">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 11v5M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

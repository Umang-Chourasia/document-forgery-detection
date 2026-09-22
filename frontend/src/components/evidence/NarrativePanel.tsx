import { Card, CardHeader } from "../ui/Card";
import type { NarrativeEvidence } from "../../types/analysis";

/**
 * The interpretation layer.
 *
 * Rendered in its own colour (violet, used nowhere else in the app) with a
 * persistent "Interpretation, not measurement" chip, so it can never be read
 * as part of the deterministic evidence beside it. The model explains the
 * already-decided risk level; it does not choose it, and nothing in this
 * panel restates the level as a conclusion of its own.
 */
export function NarrativePanel({ narrative }: { narrative: NarrativeEvidence }) {
  return (
    <Card tone="interpretation" className="p-5">
      <CardHeader
        title="AI Interpretation"
        titleClass="text-interpretation"
        caption="Generated from the evidence above. Interpretation, not measurement."
        right={
          <span className="rounded-sm border border-interpretation/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-interpretation">
            Model-written
          </span>
        }
      />

      {/* Legacy single-paragraph form, for analyses stored before Phase 4. */}
      {narrative.summary && (
        <p className="mb-3 text-sm leading-relaxed text-ink-muted">{narrative.summary}</p>
      )}

      <div className="flex flex-col gap-3">
        <Field label="What the heatmap shows" value={narrative.observed_evidence} />
        <Field label="Where" value={narrative.location_description} />
        <Field label="What it means" value={narrative.plain_language_meaning} />

        {narrative.possible_pattern && (
          <div className="rounded-sm border border-interpretation/20 bg-canvas/40 p-3">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
              Possible pattern
              {narrative.pattern_confidence
                ? ` · ${narrative.pattern_confidence} confidence`
                : ""}
            </p>
            <p className="text-sm leading-relaxed text-ink">{narrative.possible_pattern}</p>
            {narrative.pattern_reasoning && (
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                {narrative.pattern_reasoning}
              </p>
            )}
          </div>
        )}

        <Field label="Caveats" value={narrative.caveats} />
      </div>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">{value}</p>
    </div>
  );
}

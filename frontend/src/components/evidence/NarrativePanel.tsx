import { Card, CardHeader } from "../ui/Card";
import type { NarrativeEvidence } from "../../types/analysis";

/**
 * The interpretation layer.
 *
 * Rendered in its own colour (violet, used nowhere else in the app) with a
 * persistent "Interpretation, not measurement" chip, so it can never be read
 * as part of the deterministic evidence. The model explains the
 * already-decided risk level; it does not choose it, and nothing in this
 * panel restates the level as a conclusion of its own.
 *
 * Two shapes are supported. Current analyses carry point-wise arrays and are
 * rendered as three short sections. Analyses stored before that format carry
 * prose fields, and fall back to the previous rendering so history keeps
 * working without a migration.
 */
export function NarrativePanel({ narrative }: { narrative: NarrativeEvidence }) {
  const points = {
    shows: narrative.what_the_analysis_shows ?? [],
    interpretation: narrative.interpretation ?? [],
    confidence: narrative.confidence ?? [],
  };
  const hasPoints =
    points.shows.length > 0 ||
    points.interpretation.length > 0 ||
    points.confidence.length > 0;

  return (
    <Card tone="interpretation" className="p-5 sm:p-6">
      <CardHeader
        title="AI Interpretation"
        titleClass="text-interpretation"
        caption="Generated from the measured evidence. Interpretation, not measurement."
        right={
          <span className="rounded-sm border border-interpretation/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-interpretation">
            Model-written
          </span>
        }
      />

      {narrative.summary && (
        <p className="mb-4 text-sm leading-relaxed text-ink-muted">{narrative.summary}</p>
      )}

      {hasPoints ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Section title="What the analysis shows" items={points.shows} />
          <Section title="Interpretation" items={points.interpretation} />
          <Section title="Confidence" items={points.confidence}>
            {narrative.possible_pattern && (
              <p className="mt-3 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                Possible pattern:{" "}
                <span className="text-ink">{narrative.possible_pattern}</span>
                {narrative.pattern_confidence ? ` · ${narrative.pattern_confidence}` : ""}
              </p>
            )}
          </Section>
        </div>
      ) : (
        /* Legacy prose form, for analyses stored before the point-wise format. */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Prose label="What the analysis shows" value={narrative.observed_evidence} />
          <Prose label="Where" value={narrative.location_description} />
          <Prose label="What it means" value={narrative.plain_language_meaning} />
          {narrative.possible_pattern && (
            <Prose
              label={`Possible pattern${
                narrative.pattern_confidence
                  ? ` · ${narrative.pattern_confidence} confidence`
                  : ""
              }`}
              value={`${narrative.possible_pattern}${
                narrative.pattern_reasoning ? ` — ${narrative.pattern_reasoning}` : ""
              }`}
            />
          )}
        </div>
      )}

      {narrative.caveats && (
        <p className="mt-6 border-t border-interpretation/20 pt-4 text-xs leading-relaxed text-ink-faint">
          <span className="font-mono uppercase tracking-wide">Caveats · </span>
          {narrative.caveats}
        </p>
      )}
    </Card>
  );
}

function Section({
  title,
  items,
  children,
}: {
  title: string;
  items: string[];
  children?: React.ReactNode;
}) {
  if (items.length === 0 && !children) return null;
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-interpretation">
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm leading-relaxed text-ink-muted">
            <span aria-hidden="true" className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-interpretation/60" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
}

function Prose({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-interpretation">
        {label}
      </p>
      <p className="text-sm leading-relaxed text-ink-muted">{value}</p>
    </div>
  );
}

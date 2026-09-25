import { Collapsible } from "../ui/Collapsible";
import type { NarrativeEvidence } from "../../types/analysis";

/**
 * The interpretation layer.
 *
 * Carries its own colour (violet, used nowhere else) and a persistent
 * "Interpretation, not measurement" note, so it can never be read as part of
 * the deterministic evidence beside it. The model explains the already-decided
 * risk level; it does not choose it.
 *
 * Two sections are rendered — what the analysis shows, and the
 * interpretation of the single most significant region. The service also
 * returns a confidence field; it is deliberately not presented, and the
 * contract is unchanged.
 *
 * Two shapes are supported. Current analyses carry point-wise arrays;
 * analyses stored before that format carry prose fields and fall back to the
 * previous rendering, so history keeps working without a migration.
 */
export function NarrativePanel({ narrative }: { narrative: NarrativeEvidence }) {
  // `confidence` is still returned by the service and still part of the
  // contract; it is simply not presented. Nothing is removed from the API.
  const points = {
    shows: narrative.what_the_analysis_shows ?? [],
    interpretation: narrative.interpretation ?? [],
  };
  const hasPoints = points.shows.length > 0 || points.interpretation.length > 0;

  return (
    <Collapsible title="Interpretation" titleClass="text-interpretation">
      <p className="mb-5 text-small leading-relaxed text-ink-faint">
        Generated from the measured evidence. Interpretation, not measurement.
      </p>

      {narrative.summary && (
        <p className="mb-5 text-small leading-relaxed text-ink-muted">{narrative.summary}</p>
      )}

      {hasPoints ? (
        <div className="flex flex-col gap-5">
          <Section title="What the analysis shows" items={points.shows} />
          <Section title="Interpretation" items={points.interpretation} />
        </div>
      ) : (
        /* Legacy prose form, for analyses stored before the point-wise format. */
        <div className="flex flex-col gap-5">
          <Prose label="What the analysis shows" value={narrative.observed_evidence} />
          <Prose label="Where" value={narrative.location_description} />
          <Prose label="What it means" value={narrative.plain_language_meaning} />
        </div>
      )}
    </Collapsible>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="label mb-2.5 text-interpretation">{title}</p>
      <ul className="flex flex-col gap-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2.5 text-small leading-relaxed text-ink-muted">
            <span
              aria-hidden="true"
              className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-interpretation/60"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Prose({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="label mb-2.5 text-interpretation">{label}</p>
      <p className="text-small leading-relaxed text-ink-muted">{value}</p>
    </div>
  );
}

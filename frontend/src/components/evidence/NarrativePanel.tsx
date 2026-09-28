import { Collapsible } from "../ui/Collapsible";
import type { NarrativeEvidence } from "../../types/analysis";

/**
 * The interpretation layer.
 *
 * Carries its own colour (violet, used nowhere else) and a persistent
 * "interpretation, not measurement" note, so it can never be read as part of
 * the deterministic evidence beside it. The model explains the already-decided
 * risk level; it does not choose it.
 *
 * Two sections are rendered — the numbered findings ("What the analysis
 * shows") and the key finding, the interpretation of the single most
 * significant region. Figures inside the text are highlighted for scanning;
 * the text itself is shown exactly as returned. The service also returns a
 * confidence field; it is deliberately not presented, and the contract is
 * unchanged.
 *
 * Two shapes are supported. Current analyses carry point-wise arrays;
 * analyses stored before that format carry prose fields and fall back to the
 * previous rendering, so history keeps working without a migration.
 */
export function NarrativePanel({ narrative }: { narrative: NarrativeEvidence }) {
  // `confidence` is still returned by the service and still part of the
  // contract; it is simply not presented. Nothing is removed from the API.
  const findings = narrative.what_the_analysis_shows ?? [];
  const keyFindings = narrative.interpretation ?? [];
  const hasPoints = findings.length > 0 || keyFindings.length > 0;

  return (
    <Collapsible
      title="Interpretation"
      heading={
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-interpretation-soft text-interpretation">
            <SparkleGlyph />
          </span>
          <span className="text-[1.375rem] font-semibold tracking-[-0.02em]">Interpretation</span>
        </span>
      }
    >
      <p className="mb-8 flex items-start gap-2.5 rounded-control bg-interpretation-soft px-4 py-3 text-small leading-relaxed text-interpretation">
        <InfoGlyph />
        Generated from the measured evidence — interpretation, not measurement.
      </p>

      {narrative.summary && (
        <p className="mb-8 text-body leading-relaxed text-ink-muted">
          <Highlighted text={narrative.summary} />
        </p>
      )}

      {hasPoints ? (
        <div className="flex flex-col gap-9">
          {findings.length > 0 && (
            <section>
              <SectionHeading
                title="What the analysis shows"
                aside={`${findings.length} ${findings.length === 1 ? "finding" : "findings"}`}
              />
              <ol className="flex flex-col gap-3">
                {findings.map((item, i) => (
                  <li
                    key={i}
                    className="flex gap-3.5 rounded-[1.125rem] bg-surface-raised px-[1.125rem] py-4"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 flex h-[1.625rem] w-[1.625rem] shrink-0 items-center justify-center rounded-full border border-interpretation-dot/40 font-mono text-[0.75rem] text-interpretation"
                    >
                      {i + 1}
                    </span>
                    <p className="text-[1.125rem] leading-relaxed text-ink/80">
                      <Highlighted text={item} />
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {keyFindings.length > 0 && (
            <section>
              <SectionHeading title="Key finding" />
              <div className="flex flex-col gap-3">
                {keyFindings.map((item, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 rounded-[1.25rem] border border-interpretation-dot/30 bg-interpretation-dot/[0.08] p-[1.375rem]"
                  >
                    <span className="flex items-center gap-2 text-small font-medium text-interpretation">
                      <TargetGlyph />
                      Most significant region
                    </span>
                    <p className="text-[1.25rem] font-medium leading-[1.55] tracking-[-0.01em] text-ink/95">
                      <Highlighted text={item} />
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        /* Legacy prose form, for analyses stored before the point-wise format. */
        <div className="flex flex-col gap-9">
          <Prose label="What the analysis shows" value={narrative.observed_evidence} />
          <Prose label="Where" value={narrative.location_description} />
          <Prose label="What it means" value={narrative.plain_language_meaning} />
        </div>
      )}
    </Collapsible>
  );
}

function SectionHeading({ title, aside }: { title: string; aside?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-border pb-3">
      <h3 className="label text-[0.8125rem] font-medium text-interpretation">{title}</h3>
      {aside && <span className="font-mono text-[0.8125rem] text-ink-dim">{aside}</span>}
    </div>
  );
}

function Prose({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <section>
      <SectionHeading title={label} />
      <p className="text-[1.125rem] leading-relaxed text-ink/80">
        <Highlighted text={value} />
      </p>
    </section>
  );
}

/**
 * Figures — "4", "0.92", "1.92 percent", "70%" — marked so a reviewer can scan
 * a point for its numbers. Presentation only: the text is not altered, and
 * nothing is computed from it.
 */
const FIGURE = /(\d+(?:[.,]\d+)?(?:\s?(?:percent|%))?)/gi;

function Highlighted({ text }: { text: string }) {
  const parts = text.split(FIGURE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="whitespace-nowrap rounded-md bg-interpretation/15 px-1.5 py-px font-semibold text-ink"
          >
            {part}
          </mark>
        ) : (
          part
        ),
      )}
    </>
  );
}

function SparkleGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-[1.125rem] w-[1.125rem]">
      <path
        d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
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

function TargetGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

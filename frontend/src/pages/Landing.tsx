import { useAuth } from "../contexts/AuthContext";
import { ButtonLink } from "../components/ui/Button";

const CAPABILITIES = [
  {
    index: "01",
    label: "Pixel-level localization",
    body: "The analysis surfaces exactly which regions of a page carry unusual visual evidence — not a single page-wide guess.",
  },
  {
    index: "02",
    label: "Evidence, not a verdict",
    body: "Results are presented as localized evidence for a human reviewer to interpret, never as an invented fake/real classification.",
  },
  {
    index: "03",
    label: "Narrative interpretation",
    body: "A language model reads the localization output and summarizes what the evidence shows, alongside the heatmap itself.",
  },
];

export function Landing() {
  const { session } = useAuth();

  return (
    <div className="mx-auto max-w-[100rem] px-6 lg:px-10">
      {/* Asymmetric hero: type on the left, the document specimen on the
          right. The column split is what stops this reading as a dashboard. */}
      <section className="grid min-h-[calc(100svh-4.25rem)] grid-cols-1 items-center gap-16 py-20 lg:grid-cols-12 lg:gap-10 lg:py-0">
        <div className="lg:col-span-6 xl:col-span-5">
          <p className="label text-ink-faint">Document Forensics</p>
          <h1 className="mt-8 max-w-xl text-[2.5rem] font-medium leading-[1.06] tracking-[-0.022em] text-ink sm:text-display">
            Analyze a document.
            <br />
            Inspect the evidence.
          </h1>
          <p className="mt-7 max-w-md text-lead leading-relaxed text-ink-muted">
            Pixel-level forgery localization, run against your own documents and
            presented as evidence for review — not an unexplained score.
          </p>

          {/* Sign in lives in the chrome only; the hero carries one action. */}
          <div className="mt-11">
            <ButtonLink to={session ? "/w" : "/signup"} size="lg">
              {session ? "Analyze Document" : "Get Started"}
            </ButtonLink>
          </div>
        </div>

        <figure className="lg:col-span-6 lg:col-start-7 xl:col-span-6 xl:col-start-7">
          <Specimen />
          <figcaption className="label mt-4 text-ink-faint">
            Localization output · warm regions carry the evidence
          </figcaption>
        </figure>
      </section>

      {/* Capabilities as ruled rows, not a card grid. */}
      <section className="border-t border-hairline">
        {CAPABILITIES.map((cap) => (
          <article
            key={cap.label}
            className="grid grid-cols-1 gap-3 border-b border-hairline py-9 sm:grid-cols-12 sm:gap-8"
          >
            <p className="label text-accent sm:col-span-1">{cap.index}</p>
            <h2 className="text-body font-medium tracking-tight text-ink sm:col-span-4">
              {cap.label}
            </h2>
            <p className="max-w-2xl text-body leading-relaxed text-ink-muted sm:col-span-7">
              {cap.body}
            </p>
          </article>
        ))}
      </section>

      <footer className="label flex flex-wrap items-center justify-between gap-3 py-10 text-ink-faint">
        <span>Localization only · no invented classification</span>
        <span>Evidence for review</span>
      </footer>
    </div>
  );
}

/**
 * An abstract specimen rather than a screenshot: a document plate with a
 * single warm region, drawn in CSS so it costs nothing to load and cannot go
 * stale against the real UI.
 */
function Specimen() {
  return (
    <div
      aria-hidden="true"
      className="relative aspect-[4/3] w-full overflow-hidden border border-hairline bg-canvas-deep"
    >
      {/* Ruled text lines, thinning toward the foot of the page. */}
      <div className="absolute inset-0 flex flex-col gap-[3.2%] p-[9%]">
        {[92, 78, 85, 60, 88, 71, 94, 66, 80, 48].map((w, i) => (
          <span
            key={i}
            className="block h-[3px] bg-ink"
            style={{ width: `${w}%`, opacity: 0.06 + (10 - i) * 0.006 }}
          />
        ))}
      </div>

      {/* The one region of interest. Soft, not glowing. */}
      <div
        className="absolute"
        style={{
          left: "26%",
          top: "47%",
          width: "22%",
          height: "9%",
          background:
            "radial-gradient(ellipse at center, rgba(229,96,95,0.55), rgba(229,96,95,0.14) 55%, transparent 72%)",
        }}
      />
      <div
        className="absolute border border-evidence/50"
        style={{ left: "26%", top: "47%", width: "22%", height: "9%" }}
      />
      <span
        className="label absolute text-evidence/80"
        style={{ left: "26%", top: "calc(47% + 9% + 8px)" }}
      >
        Region 01
      </span>

      {/* Corner registration marks — the forensic-plate cue. */}
      {[
        "left-3 top-3 border-l border-t",
        "right-3 top-3 border-r border-t",
        "left-3 bottom-3 border-b border-l",
        "right-3 bottom-3 border-b border-r",
      ].map((pos) => (
        <span key={pos} className={`absolute h-3 w-3 border-ink-faint/40 ${pos}`} />
      ))}
    </div>
  );
}

import { useAuth } from "../contexts/AuthContext";
import { ButtonLink } from "../components/ui/Button";

const CAPABILITIES = [
  {
    label: "Pixel-level localization",
    body: "The analysis surfaces exactly which regions of a page carry unusual visual evidence — not a single page-wide guess.",
  },
  {
    label: "Evidence, not a verdict",
    body: "Results are presented as localized evidence for a human reviewer to interpret, never as an invented fake/real classification.",
  },
  {
    label: "Narrative interpretation",
    body: "A language model reads the localization output and summarizes what the evidence shows, alongside the heatmap itself.",
  },
];

const PIPELINE = [
  {
    step: "01",
    label: "Localization",
    body: "The document is analyzed to identify regions showing unusual visual evidence, returned as a heatmap.",
  },
  {
    step: "02",
    label: "Measurement",
    body: "Quantitative measurements are calculated from the detected evidence, and a fixed rule assigns a tampering risk level.",
  },
  {
    step: "03",
    label: "Interpretation",
    body: "A language model explains the measured evidence in plain language. It never decides the risk level.",
  },
];

export function Landing() {
  const { session } = useAuth();

  return (
    <div className="mx-auto max-w-6xl px-6">
      {/* The hero fills the remaining viewport via flex, rather than
          subtracting a hardcoded navbar height that breaks when the navbar
          changes. */}
      <section className="flex min-h-[70svh] flex-col justify-center py-20">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          Document Forensics
        </p>
        <h1 className="max-w-3xl text-4xl font-medium leading-[1.08] tracking-tight text-ink sm:text-5xl">
          Analyze a document.
          <br />
          Inspect the evidence.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted">
          Pixel-level forgery localization, run against your own documents and
          presented as evidence for review — not an unexplained score.
        </p>

        {/* Sign in lives in the navbar only; the hero carries one primary action. */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <ButtonLink to={session ? "/analyze" : "/signup"} size="lg">
            {session ? "Analyze Document →" : "Get Started →"}
          </ButtonLink>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-3">
        {CAPABILITIES.map((cap) => (
          <div key={cap.label} className="bg-surface p-6">
            <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-accent">
              {cap.label}
            </h2>
            <p className="text-sm leading-relaxed text-ink-muted">{cap.body}</p>
          </div>
        ))}
      </section>

      <section className="py-20">
        <p className="mb-8 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          How it works
        </p>
        <ol className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {PIPELINE.map((item) => (
            <li
              key={item.step}
              className="rounded-sm border border-border bg-surface p-6"
            >
              <p className="mb-3 font-mono text-2xl text-accent/40">{item.step}</p>
              <h3 className="mb-2 font-mono text-xs uppercase tracking-wide text-ink">
                {item.label}
              </h3>
              <p className="text-sm leading-relaxed text-ink-muted">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-border py-10 text-center font-mono text-xs text-ink-faint">
        Localization only · no invented classification
      </footer>
    </div>
  );
}

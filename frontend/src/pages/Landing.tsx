import { Link } from "react-router-dom";

const CAPABILITIES = [
  {
    label: "Pixel-level localization",
    body: "CAT-Net v2 traces compression-artifact inconsistencies to surface exactly which regions of a page carry manipulation signatures — not a single page-wide guess.",
  },
  {
    label: "Evidence, not a verdict",
    body: "Results are presented as localized evidence for a human reviewer to interpret, never as an invented fake/real classification.",
  },
  {
    label: "Narrative interpretation",
    body: "An LLM reads the localization output and writes a plain-language account of what the evidence shows, alongside the raw heatmap.",
  },
];

export function Landing() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="flex min-h-[calc(100svh-73px)] flex-col justify-center py-24">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          Document Forensics
        </p>
        <h1 className="max-w-3xl text-5xl font-medium leading-[1.08] tracking-tight text-ink">
          Analyze a document.
          <br />
          Inspect the evidence.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted">
          Pixel-level forgery localization built on CAT-Net v2's compression-artifact
          tracing, run against your own images and presented as evidence for
          review — not an unexplained score.
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link
            to="/analyze"
            className="rounded-sm border border-accent/40 bg-accent-soft px-6 py-3 font-mono text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            Analyze Document →
          </Link>
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

      <footer className="py-16 text-center font-mono text-xs text-ink-faint">
        CAT-Net v2 · localization only, no invented classification
      </footer>
    </div>
  );
}

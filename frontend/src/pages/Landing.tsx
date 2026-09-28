import { useId, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ArrowRight, ButtonLink } from "../components/ui/Button";
import { Logo } from "../components/layout/Logo";

/**
 * The landing page: hero with a live specimen, an overview of the three
 * layers the product keeps apart, how it works, FAQ.
 *
 * Every claim here is something the application actually does. The specimen
 * is an illustration drawn in SVG — it is labelled as one and carries no
 * numbers that could be mistaken for a measurement.
 */

type Layer = "original" | "heatmap" | "overlay";
type ViewMode = Layer | "split";

const VIEW_MODES: { key: ViewMode; label: string }[] = [
  { key: "original", label: "Original" },
  { key: "heatmap", label: "Heatmap" },
  { key: "overlay", label: "Overlay" },
  { key: "split", label: "Side by side" },
];

const TAG = "inline-flex items-center gap-2.5 rounded-full border border-border px-4 py-1.5 text-body text-ink-muted";
const H2 = "text-[3rem] font-medium leading-[0.98] tracking-[-0.045em] text-ink sm:text-[4.5rem] lg:text-[6.5rem]";
const PANEL = "rounded-[2rem] border border-hairline bg-surface lg:rounded-hero";

export function Landing() {
  const { session } = useAuth();
  const [mode, setMode] = useState<ViewMode>("overlay");
  const primaryTo = session ? "/w" : "/signup";

  return (
    <div className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-20">
      {/* ------------------------------------------------------------ Hero */}
      <section id="top" className="flex flex-col items-center pb-28 pt-14 text-center sm:pt-20 lg:pb-40">
        <span className={TAG}>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-evidence" />
          Document forgery detection
        </span>

        <h1 className="mt-8 text-[3.25rem] font-medium leading-[0.96] tracking-[-0.05em] text-ink sm:text-[5.5rem] lg:text-[7.75rem]">
          Every document,
          <br />
          examined.
        </h1>

        <p className="mt-8 max-w-3xl text-lead leading-relaxed text-ink-muted">
          Upload a scan or photo of any document. See exactly which regions carry
          signs of manipulation — mapped, measured and explained.
        </p>

        <div className="mt-11 flex flex-wrap justify-center gap-3">
          <ButtonLink to={primaryTo} size="lg">
            {session ? "Analyze a document" : "Get started"}
            <ArrowRight className="h-5 w-5" />
          </ButtonLink>
          <a
            href="#how-it-works"
            className="inline-flex items-center rounded-full border border-border px-7 py-4 text-body font-medium text-ink transition-colors hover:border-border-strong hover:bg-surface"
          >
            See how it works
          </a>
        </div>

        <div className="scroll-quiet mt-16 max-w-full overflow-x-auto lg:mt-20">
          <div
            role="tablist"
            aria-label="View mode"
            className="flex gap-1.5 rounded-full border border-border bg-well p-1.5"
          >
            {VIEW_MODES.map((m) => (
              <button
                key={m.key}
                role="tab"
                aria-selected={mode === m.key}
                onClick={() => setMode(m.key)}
                className={`shrink-0 whitespace-nowrap rounded-full px-5 py-2.5 text-body font-medium transition-colors sm:px-6 ${
                  mode === m.key ? "bg-ink text-canvas" : "text-ink-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <figure className="dots relative mt-6 flex w-full justify-center gap-4 rounded-[2rem] border border-hairline bg-well px-4 pb-16 pt-10 sm:gap-10 sm:px-10 sm:pb-20 sm:pt-20 lg:rounded-hero">
          {mode === "split" ? (
            <>
              <div className="w-full max-w-[32.5rem]">
                <Specimen layer="original" />
              </div>
              <div className="w-full max-w-[32.5rem]">
                <Specimen layer="heatmap" />
              </div>
            </>
          ) : (
            <div className="w-full max-w-[32.5rem]">
              <Specimen layer={mode} />
            </div>
          )}

          <span className="absolute left-6 top-6 hidden items-center gap-2.5 rounded-full border border-border bg-canvas/75 px-4 py-2 text-small text-ink-muted backdrop-blur sm:inline-flex">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />
            Evidence map ready
          </span>
          <span className="absolute right-6 top-6 hidden items-center gap-2.5 rounded-full border border-border bg-canvas/75 px-4 py-2 text-small text-ink backdrop-blur sm:inline-flex">
            Tampering risk
            <span className="rounded-full bg-evidence-soft px-2.5 py-0.5 font-medium text-evidence">High</span>
          </span>
          <figcaption className="label absolute bottom-6 left-6 text-ink-dim">
            Illustrative example
          </figcaption>
        </figure>
      </section>

      {/* -------------------------------------------------------- Overview */}
      <section id="overview" className="flex scroll-mt-24 flex-col gap-12 pb-28 lg:gap-20 lg:pb-40">
        <SectionHeader
          tag="Overview"
          title={
            <>
              Evidence,
              <br />
              not a verdict.
            </>
          }
          aside="Three layers, kept deliberately apart: where the evidence is, how strong it is, and what it might mean. You make the call."
        />

        <FeatureCard
          eyebrow="01 · Localization"
          title={<>See exactly<br />where.</>}
          body="Every page is examined pixel by pixel for editing and compression traces. The result is an evidence map laid over your document — zoom, pan and compare it against the original."
          chips={["Pixel-level heatmap", "Zoom up to 4×", "Adjustable overlay"]}
          visual={
            <div className="w-full max-w-[26rem]">
              <Specimen layer="heatmap" />
            </div>
          }
        />

        <FeatureCard
          reverse
          eyebrow="02 · Risk"
          title={<>A risk level<br />you can trace.</>}
          body="Low, Medium or High — decided by fixed rules on the measured evidence: how strong it is, how large, how concentrated. The same evidence always gives the same level."
          chips={["Deterministic", "No invented scores"]}
          visual={<RiskIllustration />}
        />

        <FeatureCard
          eyebrow="03 · Interpretation"
          title={<>Explained in<br />plain language.</>}
          body="An AI summary reads the measured evidence and describes the single most significant region — always marked as interpretation, never presented as measurement."
          chips={["One key region", "Clearly labelled"]}
          visual={<InterpretationIllustration />}
        />

        <div className="grid gap-4 md:grid-cols-3 lg:gap-6">
          <SmallCard
            icon={<IconLock />}
            title="Private by default"
            body="Uploads and results are tied to your account and visible only to you."
          />
          <SmallCard
            icon={<IconLayers />}
            title="Four ways to look"
            body="Original, heatmap, overlay and side by side — with zoom and pan."
          />
          <SmallCard
            icon={<IconDocument />}
            title="Built for real documents"
            body="JPEG, PNG and WebP images of certificates, IDs, invoices and payslips."
          />
        </div>
      </section>

      {/* ---------------------------------------------------- How it works */}
      <section id="how-it-works" className="flex scroll-mt-24 flex-col gap-12 pb-28 lg:gap-20 lg:pb-40">
        <SectionHeader
          tag="How it works"
          title={
            <>
              From upload
              <br />
              to evidence.
            </>
          }
          aside="Four steps. The evidence map appears first; the written interpretation follows moments later."
        />

        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {STEPS.map((step, i) => (
            <li
              key={step.title}
              className="flex min-h-[20rem] flex-col justify-between gap-10 rounded-[2.25rem] border border-hairline bg-surface p-8 lg:min-h-[32.5rem] lg:p-9"
            >
              <div className="flex items-start justify-between">
                <span className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-surface-raised text-ink">
                  {step.icon}
                </span>
                <span className="font-mono text-body text-ink-dim">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <div>
                <h3 className="text-[2rem] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
                  {step.title}
                </h3>
                <p className="mt-3.5 text-[1.125rem] leading-relaxed text-ink-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ------------------------------------------------------------- FAQ */}
      <section id="faq" className="grid scroll-mt-24 gap-12 pb-28 lg:grid-cols-2 lg:gap-20 lg:pb-40">
        <div className="flex flex-col items-start gap-7">
          <span className={TAG}>FAQ</span>
          <h2 className={H2}>
            Questions,
            <br />
            answered.
          </h2>
        </div>
        <Faq />
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="pb-20">
        <div className={`dots flex flex-col items-center gap-11 px-6 py-24 text-center lg:py-36 ${PANEL}`}>
          <h2 className={H2}>
            Examine your
            <br />
            first document.
          </h2>
          <ButtonLink to={primaryTo} size="lg">
            {session ? "Open workspace" : "Get started"}
            <ArrowRight className="h-5 w-5" />
          </ButtonLink>
        </div>
      </section>

      {/* ---------------------------------------------------------- Footer */}
      <footer className="flex flex-col gap-10 border-t border-border py-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row sm:items-center">
          <Logo />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-body">
            <a href="#overview" className="text-ink-muted transition-colors hover:text-ink">Overview</a>
            <a href="#how-it-works" className="text-ink-muted transition-colors hover:text-ink">How it works</a>
            <a href="#faq" className="text-ink-muted transition-colors hover:text-ink">FAQ</a>
            {session ? (
              <Link to="/w" className="text-ink-muted transition-colors hover:text-ink">Workspace</Link>
            ) : (
              <Link to="/login" className="text-ink-muted transition-colors hover:text-ink">Sign in</Link>
            )}
          </nav>
        </div>
        <div className="flex flex-col justify-between gap-2 text-small text-ink-dim sm:flex-row">
          <span>Evidence for review — not a verdict.</span>
          <span>© {new Date().getFullYear()} Document Forensics</span>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------------------------------------------ Parts */

function SectionHeader({ tag, title, aside }: { tag: string; title: ReactNode; aside: string }) {
  return (
    <div className="flex flex-col justify-between gap-8 lg:flex-row lg:items-end lg:gap-20">
      <div className="flex flex-col items-start gap-7">
        <span className={TAG}>{tag}</span>
        <h2 className={H2}>{title}</h2>
      </div>
      <p className="max-w-md text-[1.25rem] leading-relaxed text-ink-muted">{aside}</p>
    </div>
  );
}

function FeatureCard({
  eyebrow, title, body, chips, visual, reverse = false,
}: {
  eyebrow: string;
  title: ReactNode;
  body: string;
  chips: string[];
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <article className={`grid gap-3 p-3 sm:gap-6 sm:p-6 lg:min-h-[47.5rem] lg:grid-cols-2 ${PANEL}`}>
      <div className="flex flex-col justify-between gap-12 p-5 sm:p-10 lg:p-12">
        <p className="label text-[0.875rem] text-ink-faint">{eyebrow}</p>
        <div className="flex flex-col gap-6">
          <h3 className="text-[2.75rem] font-medium leading-[1.02] tracking-[-0.04em] text-ink lg:text-[3.75rem]">
            {title}
          </h3>
          <p className="max-w-[30rem] text-[1.25rem] leading-relaxed text-ink-muted">{body}</p>
          <ul className="flex flex-wrap gap-2">
            {chips.map((chip) => (
              <li key={chip} className="rounded-full bg-surface-raised px-4 py-2 text-body text-ink-muted">
                {chip}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={`dots flex min-h-[22rem] items-center justify-center rounded-[1.5rem] bg-canvas p-5 sm:p-10 lg:rounded-panel ${
          reverse ? "lg:order-first" : ""
        }`}
      >
        {visual}
      </div>
    </article>
  );
}

function SmallCard({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="flex min-h-[17.5rem] flex-col justify-between gap-10 rounded-panel border border-hairline bg-surface p-9 lg:p-10">
      <span className="flex h-14 w-14 items-center justify-center rounded-[1.125rem] bg-surface-raised text-ink">
        {icon}
      </span>
      <div>
        <h3 className="text-[1.75rem] font-medium tracking-[-0.025em] text-ink">{title}</h3>
        <p className="mt-2.5 text-[1.125rem] leading-relaxed text-ink-muted">{body}</p>
      </div>
    </div>
  );
}

/** Illustration of the risk panel. Descriptive words, never numbers. */
function RiskIllustration() {
  const rows: [string, string][] = [
    ["Peak intensity", "Strong"],
    ["Localized region", "Present"],
    ["Evidence spread", "Contained"],
  ];
  return (
    <div aria-hidden="true" className="w-full max-w-[30rem] rounded-panel border border-border bg-surface p-8 text-left sm:p-10">
      <p className="label text-ink-faint">Tampering risk</p>
      <p className="mt-6 text-[5.5rem] font-medium leading-[0.9] tracking-[-0.05em] text-evidence sm:text-[7rem]">
        High
      </p>
      <div className="mt-8 grid grid-cols-3 gap-1.5">
        {(["Low", "Medium", "High"] as const).map((level) => (
          <div key={level} className="flex flex-col gap-2.5">
            <span className={`h-1.5 rounded-full ${level === "High" ? "bg-evidence" : "bg-border"}`} />
            <span className={`text-small ${level === "High" ? "text-ink" : "text-ink-dim"}`}>{level}</span>
          </div>
        ))}
      </div>
      <dl className="mt-8">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between border-t border-border py-4 text-[1.125rem]">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="text-ink">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Illustration of the interpretation panel, in the same violet as the real one. */
function InterpretationIllustration() {
  return (
    <div aria-hidden="true" className="w-full max-w-[32.5rem] rounded-panel border border-border bg-surface p-8 text-left sm:p-10">
      <p className="label text-interpretation">Interpretation</p>
      <p className="mt-2.5 text-body text-ink-faint">
        Generated from the measured evidence. Interpretation, not measurement.
      </p>
      <p className="mt-7 text-small font-medium text-interpretation">What the analysis shows</p>
      <ul className="mt-3 flex flex-col gap-3">
        <Bullet>Strong evidence concentrates in one compact region.</Bullet>
        <Bullet>The rest of the page shows no comparable traces.</Bullet>
      </ul>
      <div className="mt-7 border-t border-border pt-7">
        <p className="text-small font-medium text-interpretation">Interpretation</p>
        <ul className="mt-3">
          <Bullet>
            The highlighted region sits over the amount due — a value worth checking
            against the original record.
          </Bullet>
        </ul>
      </div>
    </div>
  );
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3.5 text-[1.1875rem] leading-relaxed text-ink/80">
      <span className="mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full bg-interpretation-dot" />
      <span>{children}</span>
    </li>
  );
}

const FAQS = [
  {
    q: "Does it tell me whether a document is fake?",
    a: "No. It localizes evidence of manipulation and grades the risk. The final judgement always stays with a human reviewer.",
  },
  {
    q: "What kinds of documents can I analyze?",
    a: "JPEG, PNG or WebP images of a single page — scans, screenshots or photos of certificates, IDs, invoices and payslips.",
  },
  {
    q: "How is the risk level decided?",
    a: "By fixed thresholds on measured evidence: peak intensity, the size of strongly flagged regions and how concentrated they are. A single bright pixel cannot raise it to High.",
  },
  {
    q: "Who can see my documents?",
    a: "Only you. Uploads and results are stored privately to your account.",
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const baseId = useId();

  return (
    <div className="border-b border-border">
      {FAQS.map((item, i) => {
        const isOpen = open === i;
        const panelId = `${baseId}-faq-${i}`;
        return (
          <div key={item.q} className="border-t border-border py-7">
            <h3>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-6 text-left text-[1.375rem] font-medium tracking-[-0.02em] text-ink sm:text-[1.625rem]"
              >
                <span>{item.q}</span>
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border">
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-4 w-4">
                    <path d="M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    {!isOpen && (
                      <path d="M12 5v14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    )}
                  </svg>
                </span>
              </button>
            </h3>
            {isOpen && (
              <p id={panelId} className="mt-4 pr-16 text-[1.25rem] leading-relaxed text-ink-muted">
                {item.a}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- Specimen */

const LAYERS: Record<Layer, { paper: number; field: number; heat: number }> = {
  original: { paper: 1, field: 0, heat: 0 },
  heatmap: { paper: 0, field: 1, heat: 1 },
  overlay: { paper: 1, field: 0.42, heat: 0.85 },
};

/**
 * A sample invoice drawn in SVG, so it scales without losing the alignment
 * between the page and its evidence region. The "heatmap" layer uses the
 * same blue-to-red ramp the real viewer shows. Illustration only.
 */
function Specimen({ layer }: { layer: Layer }) {
  // useId() output contains characters that are not safe inside url(#…).
  const gradientId = `heat${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const v = LAYERS[layer];
  const fade = { transition: "opacity 300ms ease" };
  const rows = [
    [210, 72],
    [160, 64],
    [240, 76],
    [130, 60],
  ];

  return (
    <div className="overflow-hidden rounded-[1.25rem] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
      <svg
        viewBox="0 0 520 680"
        role="img"
        aria-label={`Sample invoice, ${layer === "original" ? "original" : layer} view`}
        className="block h-auto w-full"
        data-layer={layer}
      >
        <defs>
          <radialGradient id={gradientId}>
            <stop offset="0" stopColor="#800000" />
            <stop offset="0.18" stopColor="#ff1a00" />
            <stop offset="0.38" stopColor="#ffd400" />
            <stop offset="0.56" stopColor="#3cffc8" />
            <stop offset="0.74" stopColor="#0050ff" />
            <stop offset="0.9" stopColor="#00007f" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="520" height="680" fill="#00007f" />

        <g style={{ ...fade, opacity: v.paper }} fontFamily="Geist, system-ui, sans-serif">
          <rect width="520" height="680" fill="#ecebe6" />
          <text x="44" y="75" fontSize="30" fontWeight="600" letterSpacing="-0.6" fill="#16161a">INVOICE</text>
          <text x="476" y="69" fontSize="13" textAnchor="end" fill="#5a5a60" fontFamily="Geist Mono, monospace">No. 2026-0481</text>
          <rect x="44" y="112" width="432" height="1" fill="#cfcdc6" />
          <text x="44" y="152" fontSize="11" letterSpacing="1.3" fill="#7a7a80" fontFamily="Geist Mono, monospace">BILLED TO</text>
          <rect x="44" y="165" width="180" height="10" rx="5" fill="#c9c7c0" />
          <rect x="44" y="183" width="130" height="10" rx="5" fill="#c9c7c0" />
          <text x="44" y="240" fontSize="11" letterSpacing="1.3" fill="#7a7a80" fontFamily="Geist Mono, monospace">DESCRIPTION</text>
          <text x="476" y="240" fontSize="11" letterSpacing="1.3" fill="#7a7a80" textAnchor="end" fontFamily="Geist Mono, monospace">AMOUNT</text>
          {rows.map(([left, right], i) => (
            <g key={i}>
              <rect x="44" y={259 + i * 32} width={left} height="12" rx="6" fill="#d4d2cb" />
              <rect x={476 - right} y={259 + i * 32} width={right} height="12" rx="6" fill="#d4d2cb" />
            </g>
          ))}
          <rect x="44" y="399" width="432" height="1" fill="#cfcdc6" />
          <text x="44" y="455" fontSize="16" fill="#3a3a40">Amount due</text>
          <text x="476" y="461" fontSize="30" fontWeight="600" textAnchor="end" fill="#16161a">₹ 48,200.00</text>
          <rect x="44" y="598" width="150" height="8" rx="4" fill="#d4d2cb" />
          <rect x="44" y="614" width="110" height="8" rx="4" fill="#d4d2cb" />
          <circle cx="444" cy="604" r="31" fill="none" stroke="#b8b6ae" strokeWidth="2" />
        </g>

        <rect width="520" height="680" fill="#00007f" style={{ ...fade, opacity: v.field }} />
        <ellipse
          cx="386"
          cy="450"
          rx="110"
          ry="52"
          fill={`url(#${gradientId})`}
          style={{ ...fade, opacity: v.heat }}
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------- Icons */

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-7 w-7"
    >
      {children}
    </svg>
  );
}

function IconLock() {
  return (
    <Svg>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

function IconLayers() {
  return (
    <Svg>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </Svg>
  );
}

function IconDocument() {
  return (
    <Svg>
      <path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </Svg>
  );
}

const STEPS = [
  {
    title: "Upload the document",
    body: "Drop in a scan or photo of a single page. It is stored privately to your account.",
    icon: (
      <Svg>
        <path d="M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
      </Svg>
    ),
  },
  {
    title: "Localize the evidence",
    body: "The page is analyzed for manipulation traces and an evidence heatmap is generated.",
    icon: (
      <Svg>
        <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
        <circle cx="12" cy="12" r="3" />
      </Svg>
    ),
  },
  {
    title: "Measure the risk",
    body: "Intensity, extent and concentration of the evidence set a Low, Medium or High risk level.",
    icon: (
      <Svg>
        <path d="M5 20v-6M12 20V8M19 20V4" />
      </Svg>
    ),
  },
  {
    title: "Review and interpret",
    body: "Inspect the heatmap in four views and read a plain-language interpretation of the key region.",
    icon: (
      <Svg>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
        <circle cx="12" cy="12" r="3" />
      </Svg>
    ),
  },
];

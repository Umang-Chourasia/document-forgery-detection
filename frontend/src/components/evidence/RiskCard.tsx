import { RISK_FILL, RISK_TEXT, titleCase } from "../../lib/display";
import type { RiskLevel, TamperingRisk } from "../../types/analysis";

const LEVELS: RiskLevel[] = ["LOW", "MEDIUM", "HIGH"];

/**
 * The tampering risk, reduced to the single thing a reviewer needs at a
 * glance, and given the top of the rail so it is the first thing read.
 *
 * Level only. No score, no rule name, no rationale, no thresholds — those
 * stay in the payload and in the persisted record, unrendered. The three
 * segments are the three levels, not a gauge: exactly one is lit, and it
 * carries no more information than the word above it. The level is decided
 * by the deterministic rule in narrative-service, never by the language
 * model.
 */
export function RiskCard({ risk }: { risk: TamperingRisk }) {
  return (
    <section className="rounded-card border border-hairline bg-surface px-7 py-7">
      <h2 className="label text-ink-faint">Tampering Risk</h2>
      <p
        className={`mt-4 text-[4.75rem] font-medium leading-[0.9] tracking-[-0.05em] ${RISK_TEXT[risk.level]}`}
      >
        {titleCase(risk.level)}
      </p>
      <div className="mt-6 grid grid-cols-3 gap-1.5" aria-hidden="true">
        {LEVELS.map((level) => (
          <span
            key={level}
            className={`h-1.5 rounded-full ${
              level === risk.level ? RISK_FILL[level] : "bg-border"
            }`}
          />
        ))}
      </div>
    </section>
  );
}

import { RiskBadge } from "./RiskBadge";
import type { TamperingRisk } from "../../types/analysis";

/**
 * The tampering risk, reduced to the single thing a reviewer needs at a
 * glance, and given the top of the rail so it is the first thing read.
 *
 * Level only. No score, no bar, no rule name, no rationale, no thresholds —
 * those stay in the payload and in the persisted record, unrendered. The
 * level is decided by the deterministic rule in narrative-service, never by
 * the language model.
 */
export function RiskCard({ risk }: { risk: TamperingRisk }) {
  return (
    <section className="pb-7">
      <h2 className="label mb-4 text-ink-faint">Tampering Risk</h2>
      <RiskBadge level={risk.level} size="lg" />
    </section>
  );
}

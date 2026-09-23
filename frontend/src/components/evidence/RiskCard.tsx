import { Card } from "../ui/Card";
import { RiskBadge } from "./RiskBadge";
import type { TamperingRisk } from "../../types/analysis";

/**
 * The tampering risk, reduced to the single thing a reviewer needs at a
 * glance: the level.
 *
 * Everything quantitative lives in Measured Evidence beside it, and the
 * rationale, rule name and score stay in the payload without being rendered.
 * The level is still decided by the deterministic rule in
 * narrative-service/metrics.mjs — never by the language model.
 */
export function RiskCard({ risk }: { risk: TamperingRisk }) {
  return (
    <Card tone="default" className="px-5 py-5">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-wide text-ink-faint">
        Tampering Risk
      </h2>
      <RiskBadge level={risk.level} size="lg" />
    </Card>
  );
}

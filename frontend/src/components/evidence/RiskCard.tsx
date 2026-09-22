import { Card } from "../ui/Card";
import { RiskBadge } from "./RiskBadge";
import type { TamperingRisk } from "../../types/analysis";

/**
 * The focal element of the result sidebar.
 *
 * The level, rule name and rationale are all taken verbatim from the
 * deterministic classifier. Nothing here is written by, or influenced by, the
 * language model — and the note saying so is kept word-for-word from the
 * previous implementation.
 */
export function RiskCard({ risk }: { risk: TamperingRisk }) {
  return (
    <Card tone="default" className="overflow-hidden">
      <div className="border-b border-border bg-surface-raised px-5 py-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-mono text-xs uppercase tracking-wide text-ink-faint">
            Tampering Risk
          </h2>
          <span className="rounded-sm border border-accent/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-accent">
            Deterministic
          </span>
        </div>
        {/* `risk.rule` is the internal rule identifier. It stays in the payload
            and in the persisted record, but is not shown to the reviewer. */}
        <RiskBadge level={risk.level} size="lg" />
      </div>

      <div className="px-5 py-4">
        <p className="text-sm leading-relaxed text-ink-muted">{risk.rationale}</p>
        <p className="mt-3 font-mono text-[11px] leading-relaxed text-ink-faint">
          Calculated by a fixed rule from the measured evidence below — not
          chosen by the language model, and not a confidence value.
        </p>
      </div>
    </Card>
  );
}

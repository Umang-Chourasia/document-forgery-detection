import type { ReactNode } from "react";

export interface EvidenceItem {
  key: string;
  label: string;
  value: string;
  /** Marks a measurement the deterministic rule actually read. */
  usedByRule?: boolean;
}

/**
 * A restrained findings list: one ruled row per measurement, label left,
 * value right. No cards, no bars, no chart.
 */
export function EvidenceList({ items, footer }: { items: EvidenceItem[]; footer?: ReactNode }) {
  return (
    <div>
      <dl>
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0"
          >
            <dt className="flex items-center gap-2 text-small text-ink-muted">
              {item.label}
              {item.usedByRule && (
                <span
                  title="Read by the risk rule"
                  aria-label="Read by the risk rule"
                  className="inline-block h-1 w-1 shrink-0 rounded-full bg-accent"
                />
              )}
            </dt>
            <dd className="label tabular-nums text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
      {footer}
    </div>
  );
}

import type { ReactNode } from "react";

/**
 * A titled block of content, separated by a rule rather than enclosed in a
 * card. Replaces the old `Card` + `CardHeader` pairing: same grouping, none
 * of the boxed-dashboard feel.
 */
interface PanelProps {
  /** Mono micro-label above the content. */
  title?: string;
  /** Colour for the label where it carries meaning (e.g. the layer it names). */
  titleClass?: string;
  /** Small print under the label. */
  caption?: ReactNode;
  /** Rendered opposite the label. */
  right?: ReactNode;
  /** Draws the rule above the block. Off for the first panel in a column. */
  bordered?: boolean;
  className?: string;
  children: ReactNode;
}

export function Panel({
  title,
  titleClass = "text-ink-faint",
  caption,
  right,
  bordered = true,
  className = "",
  children,
}: PanelProps) {
  return (
    <section className={`${bordered ? "border-t border-hairline pt-6" : ""} ${className}`}>
      {(title || right) && (
        <div className="mb-3 flex items-baseline justify-between gap-3">
          {title && <h2 className={`label ${titleClass}`}>{title}</h2>}
          {right}
        </div>
      )}
      {caption && (
        <p className="mb-4 text-small leading-relaxed text-ink-faint">{caption}</p>
      )}
      {children}
    </section>
  );
}

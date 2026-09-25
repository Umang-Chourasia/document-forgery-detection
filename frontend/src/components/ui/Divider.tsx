/**
 * A hairline rule. Structure in this product is carried by dividers and
 * whitespace rather than by enclosing boxes, so this is used far more often
 * than any bordered container.
 */
export function Divider({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-hairline ${className}`} />;
}

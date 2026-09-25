interface SkeletonProps {
  className?: string;
}

/** Placeholder block. `.skeleton` carries the pulse (index.css), which is
 *  disabled under prefers-reduced-motion. Square, like everything else. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

interface SkeletonProps {
  className?: string;
}

/** Placeholder block. `.skeleton` carries the pulse (index.css), which is
 *  disabled under prefers-reduced-motion. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded-control ${className}`} aria-hidden="true" />;
}

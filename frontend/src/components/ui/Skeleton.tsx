interface SkeletonProps {
  className?: string;
}

/** Placeholder block. `.skeleton` carries the pulse animation (index.css),
 *  which is disabled under prefers-reduced-motion. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton rounded-sm ${className}`} aria-hidden="true" />;
}

/** Row placeholder matching the History card shape. */
export function SkeletonCard() {
  return (
    <div className="flex items-center gap-4 rounded-sm border border-border bg-surface p-4">
      <Skeleton className="h-14 w-14 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-6 w-20 shrink-0" />
    </div>
  );
}

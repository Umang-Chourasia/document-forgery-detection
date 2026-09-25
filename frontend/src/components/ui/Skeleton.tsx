interface SkeletonProps {
  className?: string;
}

/** Placeholder block. `.skeleton` carries the pulse (index.css), which is
 *  disabled under prefers-reduced-motion. Square, like everything else. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Row placeholder matching the history row shape. */
export function SkeletonCard() {
  return (
    <div className="flex items-center gap-5 border-t border-hairline py-5">
      <Skeleton className="h-14 w-14 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-2/5" />
        <Skeleton className="h-2.5 w-1/4" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" />
    </div>
  );
}

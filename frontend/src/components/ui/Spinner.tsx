interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = "h-3.5 w-3.5", label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        className={`animate-spin text-accent motion-reduce:animate-none ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      {label && <span className="label text-ink-muted">{label}</span>}
    </span>
  );
}

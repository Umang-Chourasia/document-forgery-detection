interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = "h-4 w-4", label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg
        className={`animate-spin text-accent motion-reduce:animate-none ${className}`}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="2.5" />
        <path
          d="M21 12a9 9 0 0 0-9-9"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      {label && <span className="font-mono text-sm text-ink-muted">{label}</span>}
    </span>
  );
}

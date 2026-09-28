/**
 * The product mark: a white tile with a registration-frame glyph — the
 * forensic-plate cue — beside the wordmark.
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-3 text-[1.1875rem] font-medium tracking-[-0.02em] text-ink">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.625rem] bg-ink">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-canvas">
          <path
            d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      </span>
      <span className={compact ? "hidden sm:inline" : ""}>Document Forensics</span>
    </span>
  );
}

import { Link, useLocation } from "react-router-dom";

export function NavBar() {
  const location = useLocation();
  const isLanding = location.pathname === "/";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-accent/40 bg-accent-soft font-mono text-[11px] font-semibold text-accent">
            D
          </span>
          <span className="font-mono text-sm font-medium tracking-wide text-ink">
            DOCUMENT FORGERY DETECTION
          </span>
        </Link>

        {!isLanding && (
          <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
            <Link to="/history" className="transition-colors hover:text-ink">
              History
            </Link>
            <Link to="/analyze" className="transition-colors hover:text-ink">
              New Analysis
            </Link>
          </nav>
        )}

        {isLanding && (
          <nav className="flex items-center gap-6">
            <Link to="/history" className="font-mono text-xs text-ink-muted transition-colors hover:text-ink">
              History
            </Link>
            <Link
              to="/analyze"
              className="rounded-sm border border-accent/40 bg-accent-soft px-4 py-2 font-mono text-xs font-medium text-accent transition-colors hover:bg-accent/20"
            >
              Analyze Document
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

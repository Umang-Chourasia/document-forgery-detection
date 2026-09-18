import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, loading, signOut } = useAuth();
  const isLanding = location.pathname === "/";

  const handleSignOut = async () => {
    await signOut();
    navigate("/", { replace: true });
  };

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to={session ? "/analyze" : "/"} className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-sm border border-accent/40 bg-accent-soft font-mono text-[11px] font-semibold text-accent">
            D
          </span>
          <span className="font-mono text-sm font-medium tracking-wide text-ink">
            DOCUMENT FORGERY DETECTION
          </span>
        </Link>

        {loading ? null : session ? (
          <nav className="flex items-center gap-6 font-mono text-xs text-ink-muted">
            <Link to="/history" className="transition-colors hover:text-ink">
              History
            </Link>
            <Link to="/analyze" className="transition-colors hover:text-ink">
              New Analysis
            </Link>
            <span className="hidden max-w-[180px] truncate text-ink-faint sm:inline">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="rounded-sm border border-border px-3 py-1.5 transition-colors hover:border-border-strong hover:text-ink"
            >
              Sign Out
            </button>
          </nav>
        ) : (
          <nav className="flex items-center gap-4 font-mono text-xs">
            <Link to="/login" className="text-ink-muted transition-colors hover:text-ink">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="rounded-sm border border-accent/40 bg-accent-soft px-4 py-2 font-medium text-accent transition-colors hover:bg-accent/20"
            >
              {isLanding ? "Get Started" : "Sign Up"}
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

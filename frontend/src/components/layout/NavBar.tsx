import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, loading, signOut } = useAuth();
  const isLanding = location.pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);

  // The menu is closed from the events that navigate away, rather than from an
  // effect watching the pathname — same result, no cascading render.
  const closeMenu = () => setMenuOpen(false);

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
    navigate("/", { replace: true });
  };

  const navLinkClass = "transition-colors hover:text-ink";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to={session ? "/analyze" : "/"} className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm border border-accent/40 bg-accent-soft font-mono text-[11px] font-semibold text-accent">
            D
          </span>
          {/* The full product name is long; below `sm` it would crowd out the
              navigation, so a short mark is shown instead. */}
          <span className="hidden font-mono text-sm font-medium tracking-wide text-ink sm:inline">
            DOCUMENT FORGERY DETECTION
          </span>
          <span className="font-mono text-sm font-medium tracking-wide text-ink sm:hidden">
            DFD
          </span>
        </Link>

        {loading ? null : session ? (
          <>
            <nav className="hidden items-center gap-6 font-mono text-xs text-ink-muted md:flex">
              <Link to="/history" className={navLinkClass}>
                History
              </Link>
              <Link to="/analyze" className={navLinkClass}>
                New Analysis
              </Link>
              <span className="hidden max-w-[180px] truncate text-ink-faint lg:inline">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="rounded-sm border border-border px-3 py-1.5 transition-colors hover:border-border-strong hover:text-ink"
              >
                Sign Out
              </button>
            </nav>

            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="Toggle navigation menu"
              className="rounded-sm border border-border p-2 text-ink-muted transition-colors hover:text-ink md:hidden"
            >
              <MenuGlyph open={menuOpen} />
            </button>
          </>
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

      {session && menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-border bg-canvas px-6 py-3 font-mono text-sm text-ink-muted md:hidden">
          <Link
            to="/analyze"
            onClick={closeMenu}
            className="py-2 transition-colors hover:text-ink"
          >
            New Analysis
          </Link>
          <Link
            to="/history"
            onClick={closeMenu}
            className="py-2 transition-colors hover:text-ink"
          >
            History
          </Link>
          {user?.email && (
            <span className="truncate py-2 text-xs text-ink-faint">{user.email}</span>
          )}
          <button
            onClick={handleSignOut}
            className="mt-1 rounded-sm border border-border px-3 py-2 text-left text-xs transition-colors hover:border-border-strong hover:text-ink"
          >
            Sign Out
          </button>
        </nav>
      )}
    </header>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      {open ? (
        <path
          d="M6 6l12 12M18 6L6 18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M4 7h16M4 12h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

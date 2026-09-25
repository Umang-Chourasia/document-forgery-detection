import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { DocumentIdentity } from "./DocumentIdentity";

/**
 * Application chrome: a single hairline rule, a wordmark, and the least
 * navigation that still works. Signed-in links use an underline indicator
 * rather than pills — from Phase 2 this becomes the workspace switch.
 */
export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, loading, signOut } = useAuth();
  const { activeDocument } = useWorkspace();
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

  // Both workspace links share the /w path, so the active one is decided by
  // the pane in the query string rather than by the path alone.
  const inWorkspace = location.pathname.startsWith("/w");
  const historyPane = new URLSearchParams(location.search).get("pane") === "history";
  const navLink = (active: boolean) =>
    `border-b pb-1 transition-colors ${
      active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
    }`;

  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-[4.25rem] max-w-[100rem] items-center justify-between px-6 lg:px-10">
        <Link to={session ? "/w" : "/"} className="flex items-baseline gap-3">
          <span className="text-body font-medium tracking-tight text-ink">
            Document Forensics
          </span>
          <span className="label hidden text-ink-faint sm:inline">Localization</span>
        </Link>

        {/* The loaded document's identity lives here so the stage does not
            have to repeat it. */}
        {activeDocument && (
          <div className="mx-6 hidden min-w-0 flex-1 md:flex">
            <DocumentIdentity doc={activeDocument} />
          </div>
        )}

        {loading ? null : session ? (
          <>
            <nav className="label hidden items-center gap-8 md:flex">
              <Link to="/w" className={navLink(inWorkspace && !historyPane)}>
                Analysis
              </Link>
              <Link to="/w?pane=history" className={navLink(inWorkspace && historyPane)}>
                History
              </Link>
              <span className="hidden max-w-[200px] truncate text-ink-faint lg:inline">
                {user?.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-ink-muted transition-colors hover:text-ink"
              >
                Sign Out
              </button>
            </nav>

            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label="Toggle navigation menu"
              className="text-ink-muted transition-colors hover:text-ink md:hidden"
            >
              <MenuGlyph open={menuOpen} />
            </button>
          </>
        ) : (
          <nav className="label flex items-center gap-7">
            <Link to="/login" className="text-ink-muted transition-colors hover:text-ink">
              Sign In
            </Link>
            <Link
              to="/signup"
              className="border-b border-accent pb-1 text-accent transition-colors hover:text-ink"
            >
              {isLanding ? "Get Started" : "Sign Up"}
            </Link>
          </nav>
        )}
      </div>

      {session && menuOpen && (
        <nav className="label flex flex-col border-t border-hairline bg-canvas px-6 py-2 md:hidden">
          <Link
            to="/w"
            onClick={closeMenu}
            className="border-b border-hairline py-4 text-ink-muted transition-colors hover:text-ink"
          >
            Analysis
          </Link>
          <Link
            to="/w?pane=history"
            onClick={closeMenu}
            className="border-b border-hairline py-4 text-ink-muted transition-colors hover:text-ink"
          >
            History
          </Link>
          {user?.email && (
            <span className="truncate py-4 text-ink-faint">{user.email}</span>
          )}
          <button
            onClick={handleSignOut}
            className="border-t border-hairline py-4 text-left text-ink-muted transition-colors hover:text-ink"
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
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      ) : (
        <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      )}
    </svg>
  );
}

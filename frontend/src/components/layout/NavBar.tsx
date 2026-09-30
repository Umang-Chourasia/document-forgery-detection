import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { useWorkspace } from "../../contexts/WorkspaceContext";
import { isReportReady } from "../../report/reportModel";
import { AccountMenu } from "./AccountMenu";
import { DownloadReportButton } from "./DownloadReportButton";
import { DocumentIdentity } from "./DocumentIdentity";
import { Logo } from "./Logo";

/** In-page sections of the landing page, reached by anchor. */
const LANDING_SECTIONS = [
  { href: "#overview", label: "Overview" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

/**
 * Application chrome. On the landing page it carries a pill of in-page
 * sections; in the workspace it carries the loaded document's identity and
 * the one global action, starting a new analysis.
 */
export function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, user, loading, signOut } = useAuth();
  const { activeDocument, activeId, clear, analysis } = useWorkspace();
  const isLanding = location.pathname === "/";
  const inWorkspace = location.pathname.startsWith("/w");
  const [menuOpen, setMenuOpen] = useState(false);

  // Only the analysis on the stage, and only once it is final: the heatmap is
  // on screen before the interpretation finishes, but the report is not
  // offered until the run has reached its terminal state.
  const reportAnalysis =
    inWorkspace && analysis && analysis.id === activeId && isReportReady(analysis)
      ? analysis
      : null;

  // The menu is closed from the events that navigate away, rather than from an
  // effect watching the pathname — same result, no cascading render.
  const closeMenu = () => setMenuOpen(false);

  const handleSignOut = async () => {
    closeMenu();
    await signOut();
    navigate("/", { replace: true });
  };

  const startNew = () => {
    closeMenu();
    clear();
  };

  return (
    <header className="sticky top-0 z-20 bg-canvas/85 backdrop-blur-md">
      <div className="mx-auto flex h-nav max-w-[100rem] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to={session && !isLanding ? "/w" : "/"} aria-label="Document Forensics home">
          <Logo compact={inWorkspace} />
        </Link>

        {/* The loaded document's identity lives here so the stage does not
            have to repeat it. */}
        {activeDocument && inWorkspace && (
          <div className="hidden min-w-0 flex-1 md:flex">
            <DocumentIdentity doc={activeDocument} />
          </div>
        )}

        {isLanding && (
          <nav
            aria-label="Sections"
            className="mx-auto hidden gap-1 rounded-full border border-border bg-well p-1 md:flex"
          >
            {LANDING_SECTIONS.map((s) => (
              <a
                key={s.href}
                href={s.href}
                className="rounded-full px-5 py-2 text-body text-ink-muted transition-colors hover:bg-surface hover:text-ink"
              >
                {s.label}
              </a>
            ))}
          </nav>
        )}

        <div className="ml-auto flex items-center gap-3">
          {loading ? null : session ? (
            <>
              {reportAnalysis && (
                <DownloadReportButton key={reportAnalysis.id} analysis={reportAnalysis} />
              )}
              {inWorkspace && activeId && (
                <button
                  onClick={startNew}
                  className="hidden items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-small font-medium text-canvas transition-colors hover:bg-ink/85 md:inline-flex"
                >
                  <PlusGlyph />
                  New analysis
                </button>
              )}
              {isLanding && (
                <Link
                  to="/w"
                  className="hidden rounded-full bg-ink px-5 py-2.5 text-small font-medium text-canvas transition-colors hover:bg-ink/85 sm:inline-flex"
                >
                  Open workspace
                </Link>
              )}

              <div className="hidden md:flex">
                <AccountMenu email={user?.email ?? ""} onSignOut={handleSignOut} />
              </div>

              <button
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-label="Toggle navigation menu"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-border text-ink-muted transition-colors hover:text-ink md:hidden"
              >
                <MenuGlyph open={menuOpen} />
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-full px-4 py-2.5 text-body text-ink-muted transition-colors hover:text-ink"
              >
                Sign in
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-ink px-5 py-2.5 text-body font-medium text-canvas transition-colors hover:bg-ink/85"
              >
                {isLanding ? "Get started" : "Sign up"}
              </Link>
            </>
          )}
        </div>
      </div>

      {session && menuOpen && (
        <nav className="mx-4 mb-4 flex flex-col rounded-card border border-border bg-surface p-2 md:hidden">
          <Link
            to="/w"
            onClick={closeMenu}
            className="rounded-control px-4 py-3.5 text-body text-ink transition-colors hover:bg-surface-raised"
          >
            New analysis
          </Link>
          {reportAnalysis && (
            <DownloadReportButton
              key={reportAnalysis.id}
              analysis={reportAnalysis}
              variant="menu"
              onDone={closeMenu}
            />
          )}
          <Link
            to="/w?pane=history"
            onClick={closeMenu}
            className="rounded-control px-4 py-3.5 text-body text-ink transition-colors hover:bg-surface-raised"
          >
            History
          </Link>
          {user?.email && (
            <span className="truncate px-4 py-3.5 text-small text-ink-faint" title={user.email}>
              {user.email}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="rounded-control border-t border-border px-4 py-3.5 text-left text-body text-ink-muted transition-colors hover:text-ink"
          >
            Log out
          </button>
        </nav>
      )}
    </header>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function MenuGlyph({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      ) : (
        <path d="M4 8h16M4 16h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      )}
    </svg>
  );
}

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Spinner } from "./ui/Spinner";

/**
 * Gate for routes that require a signed-in user. While the initial session is
 * still being restored we render nothing rather than redirecting, otherwise a
 * refresh on a protected page would bounce an authenticated user to /login.
 *
 * This is a UX guard only — the real enforcement is Row Level Security on the
 * database, so a user who bypasses this still cannot read anyone's data.
 */
export function ProtectedRoute() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        className="mx-auto flex max-w-2xl flex-col items-center gap-3 px-6 py-24"
        aria-busy="true"
      >
        <Spinner />
        <p className="font-mono text-sm text-ink-muted">Restoring session…</p>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

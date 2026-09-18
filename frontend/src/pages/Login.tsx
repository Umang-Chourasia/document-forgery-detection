import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/analyze";

  if (!loading && session) return <Navigate to={from} replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      // Supabase returns a generic message for unconfirmed accounts; make it actionable.
      const message = /email not confirmed/i.test(signInError.message)
        ? "This email hasn't been confirmed yet. Check your inbox for the confirmation link."
        : /invalid login credentials/i.test(signInError.message)
          ? "Incorrect email or password."
          : signInError.message;
      setError(message);
      setSubmitting(false);
      return;
    }

    navigate(from, { replace: true });
  };

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">Sign in</p>
      <h1 className="mb-8 text-2xl font-medium text-ink">Welcome back</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">Email</span>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">Password</span>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
        </label>

        {error && (
          <p className="rounded-sm border border-evidence/30 bg-evidence-soft px-3 py-2 text-sm text-evidence">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-sm border border-accent/40 bg-accent-soft py-3 font-mono text-sm font-medium text-accent transition-colors enabled:hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Signing in…" : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Don't have an account?{" "}
        <Link to="/signup" className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  RETENTION_CONSENT_TEXT,
  RETENTION_CONSENT_VERSION,
  RETENTION_DAYS,
  supabase,
} from "../api/supabase";
import { useAuth } from "../contexts/AuthContext";

export function Signup() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/analyze" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!consent) {
      setError("You must accept the document retention notice to create an account.");
      return;
    }
    setSubmitting(true);
    setError(null);

    // Email confirmation is disabled on this project, so signUp() returns a
    // session immediately and the user goes straight into the app.
    //
    // Consent is still sent as user metadata rather than written from here:
    // a SECURITY DEFINER trigger on auth.users copies it into `profiles`.
    // Keeping it that way means the client can never fabricate or alter its
    // own consent record — `profiles` has no INSERT policy.
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          retention_consent_at: new Date().toISOString(),
          retention_consent_version: RETENTION_CONSENT_VERSION,
          retention_days: RETENTION_DAYS,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!data.session) {
      // Should not happen while "Confirm email" is disabled. Surface it rather
      // than silently pretending signup worked.
      setError(
        "Account was created but no session was returned. This usually means email " +
          "confirmation is still enabled on the Supabase project. Try signing in, or " +
          "check Authentication → Sign In / Providers → Email.",
      );
      setSubmitting(false);
      return;
    }

    navigate("/analyze", { replace: true });
  };

  return (
    <div className="mx-auto max-w-md px-6 py-20">
      <p className="mb-2 font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
        Create account
      </p>
      <h1 className="mb-8 text-2xl font-medium text-ink">Get started</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">Email</span>
          <input
            id="signup-email"
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
            id="signup-password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
          />
          <span className="text-xs text-ink-faint">At least 6 characters.</span>
        </label>

        <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface p-4">
          <input
            id="signup-consent"
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-sm leading-relaxed text-ink-muted">{RETENTION_CONSENT_TEXT}</span>
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
          {submitting ? "Creating account…" : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

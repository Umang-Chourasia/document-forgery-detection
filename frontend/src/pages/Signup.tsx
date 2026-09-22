import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  RETENTION_CONSENT_TEXT,
  RETENTION_CONSENT_VERSION,
  RETENTION_DAYS,
  supabase,
} from "../api/supabase";
import { useAuth } from "../contexts/AuthContext";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Field } from "../components/ui/Input";

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
    <AuthShell eyebrow="Create account" title="Get started">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field
          id="signup-email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Field
          id="signup-password"
          label="Password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="At least 6 characters."
        />

        {/* Consent block. The text itself is the consent record and is
            rendered verbatim from api/supabase.ts — presentation only here. */}
        <div className="mt-2 rounded-sm border border-border bg-canvas/50">
          <p className="border-b border-border px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-ink-faint">
            Data retention · {RETENTION_DAYS} days
          </p>
          <label className="flex cursor-pointer items-start gap-3 p-4">
            <input
              id="signup-consent"
              type="checkbox"
              required
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
            />
            <span className="text-sm leading-relaxed text-ink-muted">
              {RETENTION_CONSENT_TEXT}
            </span>
          </label>
        </div>

        {error && (
          <Card tone="evidence" className="px-3 py-2">
            <p className="text-sm text-evidence">{error}</p>
          </Card>
        )}

        <Button type="submit" disabled={submitting} size="lg" className="mt-2 w-full">
          {submitting ? "Creating account…" : "Create Account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already have an account?{" "}
        <Link to="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}

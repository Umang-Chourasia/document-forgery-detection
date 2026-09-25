import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { useAuth } from "../contexts/AuthContext";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/Button";
import { Field } from "../components/ui/Input";

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
    <AuthShell eyebrow="Sign in" title="Welcome back">
      <form onSubmit={handleSubmit} className="flex flex-col gap-7">
        <Field
          id="login-email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Field
          id="login-password"
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p className="border-l border-evidence pl-3 text-small leading-relaxed text-evidence">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting} size="lg" className="mt-4 w-full">
          {submitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="mt-10 border-t border-hairline pt-6 text-small text-ink-muted">
        Don't have an account?{" "}
        <Link to="/signup" className="text-accent transition-colors hover:text-ink">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

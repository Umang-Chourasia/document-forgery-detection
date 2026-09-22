import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../api/supabase";
import { useAuth } from "../contexts/AuthContext";
import { AuthShell } from "../components/layout/AuthShell";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <Card tone="evidence" className="px-3 py-2">
            <p className="text-sm text-evidence">{error}</p>
          </Card>
        )}

        <Button type="submit" disabled={submitting} size="lg" className="mt-2 w-full">
          {submitting ? "Signing in…" : "Sign In"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Don't have an account?{" "}
        <Link to="/signup" className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  );
}

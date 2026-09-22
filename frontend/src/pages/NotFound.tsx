import { useAuth } from "../contexts/AuthContext";
import { ButtonLink } from "../components/ui/Button";

export function NotFound() {
  const { session } = useAuth();

  return (
    <div className="mx-auto flex min-h-[60svh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-5xl text-ink-faint">404</p>
      <h1 className="mt-4 text-2xl font-medium tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-muted">
        That address doesn't match any page in this application.
      </p>
      <ButtonLink to={session ? "/analyze" : "/"} className="mt-8">
        {session ? "Back to analysis" : "Back to home"}
      </ButtonLink>
    </div>
  );
}

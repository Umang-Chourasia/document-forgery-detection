import { useAuth } from "../contexts/AuthContext";
import { ButtonLink } from "../components/ui/Button";

export function NotFound() {
  const { session } = useAuth();

  return (
    <div className="mx-auto flex min-h-[calc(100svh-4.25rem)] max-w-[100rem] flex-col justify-center px-6 lg:px-10">
      <p className="label text-ink-faint">Error</p>
      <p className="mt-6 text-display font-medium tracking-tight text-ink-faint/50">404</p>
      <h1 className="mt-4 text-title font-medium tracking-tight text-ink">
        Page not found
      </h1>
      <p className="mt-4 max-w-md text-body leading-relaxed text-ink-muted">
        That address doesn't match any page in this application.
      </p>
      <div className="mt-10">
        <ButtonLink to={session ? "/w" : "/"} variant="secondary">
          {session ? "Back to analysis" : "Back to home"}
        </ButtonLink>
      </div>
    </div>
  );
}

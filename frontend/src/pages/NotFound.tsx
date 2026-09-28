import { useAuth } from "../contexts/AuthContext";
import { ButtonLink } from "../components/ui/Button";

export function NotFound() {
  const { session } = useAuth();

  return (
    <div className="mx-auto flex min-h-[calc(100svh-var(--spacing-nav))] max-w-[100rem] flex-col items-center justify-center px-6 text-center">
      <span className="rounded-full border border-border px-4 py-1.5 text-small text-ink-muted">
        Error 404
      </span>
      <h1 className="mt-8 text-[4rem] font-medium leading-[0.96] tracking-[-0.05em] text-ink sm:text-[6.5rem]">
        Page not found.
      </h1>
      <p className="mt-6 max-w-md text-lead leading-relaxed text-ink-muted">
        That address doesn't match any page in this application.
      </p>
      <div className="mt-10">
        <ButtonLink to={session ? "/w" : "/"} size="lg">
          {session ? "Back to analysis" : "Back to home"}
        </ButtonLink>
      </div>
    </div>
  );
}

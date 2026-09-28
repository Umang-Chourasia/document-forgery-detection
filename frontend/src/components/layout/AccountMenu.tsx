import { useEffect, useId, useRef, useState } from "react";

interface AccountMenuProps {
  email: string;
  onSignOut: () => void;
}

/**
 * The account control in the chrome: a single initial, with the address kept
 * inside the menu rather than permanently on screen.
 *
 * Dismissal covers both routes a user expects — a click anywhere outside and
 * the Escape key — and focus returns to the trigger afterwards so keyboard
 * navigation does not lose its place. `pointerdown` rather than `click` so
 * the menu closes before the underlying control reacts.
 */
export function AccountMenu({ email, onSignOut }: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  const initial = (email.trim()[0] ?? "?").toUpperCase();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${email}`}
        title={email}
        className={`flex h-11 w-11 items-center justify-center rounded-full border bg-surface text-body font-medium transition-colors ${
          open
            ? "border-ink/50 text-ink"
            : "border-border text-ink-muted hover:border-border-strong hover:text-ink"
        }`}
      >
        {initial}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-72 overflow-hidden rounded-card border border-border bg-surface p-2 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]"
        >
          <p className="label px-4 pb-1 pt-3 text-ink-faint">Account</p>
          <p className="truncate px-4 pb-3 text-small text-ink" title={email}>
            {email}
          </p>
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
            className="w-full rounded-control px-4 py-3 text-left text-body text-ink-muted transition-colors hover:bg-surface-raised hover:text-ink"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

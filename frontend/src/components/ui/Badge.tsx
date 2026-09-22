import type { ReactNode } from "react";

export type BadgeSize = "sm" | "md";

const SIZES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-[11px]",
};

interface BadgeProps {
  /** Border/background/text classes, supplied by the caller's own colour map. */
  className?: string;
  size?: BadgeSize;
  children: ReactNode;
}

/** Shared pill shape. Colour is left to the caller so risk and status keep
 *  their own, separately-meaningful palettes. */
export function Badge({ className = "", size = "md", children }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm border font-mono uppercase tracking-wide ${SIZES[size]} ${className}`}
    >
      {children}
    </span>
  );
}

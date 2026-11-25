import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info";

const TONES: Record<Tone, string> = {
  error: "bg-destructive/10 text-destructive",
  success: "bg-secondary text-secondary-foreground",
  info: "bg-muted text-foreground",
};

/**
 * One visual language for feedback (04-ui-spec § Feedback and loading). Errors
 * interrupt a screen reader; everything else is announced politely.
 */
export function Alert({
  tone = "info",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-lg px-3 py-2 text-sm", TONES[tone], className)}
    >
      {children}
    </p>
  );
}

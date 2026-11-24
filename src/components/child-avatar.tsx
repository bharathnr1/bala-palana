import { initialsOf } from "@/lib/children";
import { cn } from "@/lib/utils";

/**
 * A child's round avatar with an initials fallback (04-ui-spec § Look and
 * feel). Photos arrive with M6-02; the photo column is already on `child`.
 */
export function ChildAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground",
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

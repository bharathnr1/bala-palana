"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";

/**
 * A password field with a show/hide control, so a long password can be checked
 * before submitting (04-ui-spec § Feedback and loading). The toggle is a
 * button, so the field still submits as usual.
 */
export function PasswordInput({
  id,
  name,
  autoComplete,
  minLength,
  describedBy,
  className,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  minLength?: number;
  describedBy?: string;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        aria-describedby={describedBy}
        className={cn(
          "h-11 w-full rounded-lg border border-input bg-background px-3 pr-12",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
        aria-label={visible ? strings.auth.hidePassword : strings.auth.showPassword}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  );
}

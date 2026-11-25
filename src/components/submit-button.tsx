"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/**
 * A submit button that shows a spinner, swaps to its pending label and blocks
 * double submits while its form's Server Action runs. It reads `useFormStatus`,
 * so it must live inside the `<form>` it submits.
 */
export function SubmitButton({
  children,
  pendingChildren,
  iconOnly = false,
  ...props
}: ComponentProps<typeof Button> & {
  pendingChildren?: React.ReactNode;
  /** For buttons whose only content is an icon: show just the spinner while pending. */
  iconOnly?: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} type="submit" loading={pending}>
      {pending && iconOnly ? null : pending && pendingChildren ? pendingChildren : children}
    </Button>
  );
}

"use client";

import { useEffect } from "react";

import { rememberChild } from "@/lib/recent-children";

/** Records a profile visit for the "Recently viewed" row (M0-08). */
export function RememberView({ id, name }: { id: string; name: string }) {
  useEffect(() => {
    rememberChild({ id, name });
  }, [id, name]);

  return null;
}

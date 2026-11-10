"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/admin/actions";

// Runs a save action and keeps its result next to the form.
export function useSave() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const save = (run: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await run();
      setMessage(result.ok ? { text: "Saved", error: false } : { text: result.error, error: true });
    });
  const clear = () => setMessage(null);
  return { pending, message, save, clear };
}

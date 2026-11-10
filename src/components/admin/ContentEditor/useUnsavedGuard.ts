"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Warns before the admin leaves the page while `dirty`. Covers links, form posts outside the tab panels (logout), the back button
// and closing or reloading the tab. `onLeave` runs once the admin confirms, before navigation continues (used to delete
// the unsaved uploads). A reload or closed tab can only get the browser's own prompt, so those uploads are left to the
// "pending" tag Cloudinary keeps on them.
export function useUnsavedGuard(dirty: boolean, onLeave: () => Promise<unknown> | void) {
  const router = useRouter();
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  // Once the admin has confirmed, nothing should block the navigation that follows.
  const bypass = useRef(false);
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    if (!dirty) return;
    bypass.current = false;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (bypass.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (bypass.current || event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || (anchor.target && anchor.target !== "_self") || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      // Other sites leave through beforeunload; links within this page (a hash) don't leave at all.
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(() => () => router.push(`${url.pathname}${url.search}${url.hash}`));
    };

    // Forms inside the tab panels are the editors themselves (saving is not leaving); any other form, like logout, leaves the page.
    const onSubmit = (event: SubmitEvent) => {
      const form = event.target as HTMLFormElement | null;
      if (bypass.current || !form || form.closest('[role="tabpanel"]')) return;
      event.preventDefault();
      event.stopPropagation();
      const submitter = event.submitter as HTMLElement | null;
      setPendingLeave(() => () => form.requestSubmit(submitter));
    };

    // The back button can't be cancelled, so a spare history entry absorbs the first press and the page stays put.
    window.history.pushState(window.history.state, "", window.location.href);
    const onPopState = () => {
      if (bypass.current) return;
      window.history.pushState(window.history.state, "", window.location.href);
      setPendingLeave(() => () => window.history.go(-2));
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [dirty, router]);

  const confirm = useCallback(async () => {
    const go = pendingLeave;
    setPendingLeave(null);
    bypass.current = true;
    await Promise.allSettled([onLeaveRef.current()]);
    go?.();
  }, [pendingLeave]);

  const cancel = useCallback(() => setPendingLeave(null), []);

  return { open: pendingLeave !== null, confirm, cancel };
}

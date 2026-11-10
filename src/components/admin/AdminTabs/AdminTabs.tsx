"use client";

import { useState, type KeyboardEvent, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ADMIN_TABS, type AdminTabId } from "./tabs";
import styles from "./adminTabs.module.scss";

// Every panel is rendered up front and the inactive ones are only hidden, so switching tabs needs no request
// and a half-typed edit survives a trip to another tab.
export default function AdminTabs({ initial, panels }: { initial: AdminTabId; panels: Record<AdminTabId, ReactNode> }) {
  const [active, setActive] = useState<AdminTabId>(initial);

  // The console keeps its state while the admin is on another page, so coming back through the Admin button would reopen the tab
  // they left. Any change of page puts it back on Home, at plain /admin. Switching tabs only changes the query string, not the path.
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setActive("home");
  }

  const select = (id: AdminTabId) => {
    setActive(id);
    // Keeps refresh and a shared link on the same tab without a navigation.
    window.history.replaceState(null, "", id === "home" ? "/admin" : `/admin?tab=${id}`);
  };

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = ADMIN_TABS[(index + step + ADMIN_TABS.length) % ADMIN_TABS.length].id;
    select(next);
    document.getElementById(`admin-tab-${next}`)?.focus();
  };

  return (
    <>
      <div className={styles.nav} role="tablist" aria-label="Admin sections">
        {ADMIN_TABS.map((tab, index) => (
          <button
            key={tab.id}
            id={`admin-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`admin-panel-${tab.id}`}
            tabIndex={active === tab.id ? 0 : -1}
            className={active === tab.id ? styles.active : styles.link}
            onClick={() => select(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {ADMIN_TABS.map((tab) => (
        <div key={tab.id} id={`admin-panel-${tab.id}`} role="tabpanel" aria-labelledby={`admin-tab-${tab.id}`} hidden={active !== tab.id}>
          {panels[tab.id]}
        </div>
      ))}
    </>
  );
}

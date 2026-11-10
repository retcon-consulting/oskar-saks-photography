"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import styles from "./contentEditor.module.scss";

export default function ConfirmLeaveModal({ open, onConfirm, onCancel }: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  // false while rendering on the server, where there is no document to portal into.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open, mounted]);

  if (!mounted) return null;

  // Rendered on the body: the editor's tab panel is hidden while another tab is showing, and a hidden dialog can't be seen.
  return createPortal(
    // Esc fires `cancel`, which stays on the page like the Cancel button does.
    <dialog
      ref={dialog}
      className={styles.modal}
      aria-labelledby="leave-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="leave-title">Leave without saving?</h2>
      <p>
        A photo you uploaded hasn&rsquo;t been saved. If you leave now it won&rsquo;t be saved, and the upload will be deleted.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.primary} onClick={onConfirm}>
          OK
        </button>
        <button type="button" className={styles.outline} onClick={onCancel} autoFocus>
          Cancel
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

import styles from "./contentEditor.module.scss";

type SaveBarProps = {
  pending: boolean;
  message: { text: string; error: boolean } | null;
  // When given, a Cancel button sits beside Save that throws away the section's unsaved changes.
  onCancel?: () => void;
};

export default function SaveBar({ pending, message, onCancel }: SaveBarProps) {
  return (
    <div className={styles.actions}>
      <button type="submit" className={styles.primary} disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </button>
      {onCancel && (
        <button type="button" className={styles.outline} disabled={pending} onClick={onCancel}>
          Cancel
        </button>
      )}
      {message && (
        <p className={message.error ? styles.error : styles.ok} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
}

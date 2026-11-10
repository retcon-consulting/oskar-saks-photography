"use client";

import { useRef, useState, type PointerEvent } from "react";
import { discardSiteUploadAction, signSiteUploadAction } from "@/app/admin/site-image-actions";
import { MAX_MEDIA_BYTES, MEDIA_ACCEPT, type SiteImageKey } from "@/lib/media";
import styles from "./contentEditor.module.scss";

// A photo uploaded for a slot. `staged` (tracked by the editor) means it isn't saved yet.
export type PickerValue = { publicId: string; url: string; alt: string; focalX: number; focalY: number };

type Props = {
  slotKey: SiteImageKey;
  label: string;
  // The original photo that ships with the site, shown (and used on the site) whenever no upload is set.
  fallback: { src: string; alt: string };
  defaultFocal: { x: number; y: number };
  value: PickerValue | null;
  staged: boolean;
  onChange: (value: PickerValue | null, staged: boolean) => void;
};

const preview = (url: string, width: number) => url.replace("/upload/", `/upload/f_auto,q_auto,c_limit,w_${width}/`);
const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export default function SiteImagePicker({ slotKey, label, fallback, defaultFocal, value, staged, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // An upload that was never saved is useless once replaced or removed, so it goes straight away.
  const dropStaged = () => {
    if (staged && value) void discardSiteUploadAction(value.publicId);
  };

  async function upload(file: File) {
    setError(null);
    if (!MEDIA_ACCEPT.split(",").includes(file.type)) return setError("Use a JPG, PNG or WebP");
    if (file.size > MAX_MEDIA_BYTES) return setError("Photos must be 10 MB or smaller");

    setBusy(true);
    try {
      const signed = await signSiteUploadAction(slotKey);
      if (!signed) return setError("Uploads are unavailable");

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", signed.apiKey);
      body.append("signature", signed.signature);
      for (const [key, param] of Object.entries(signed.params)) body.append(key, String(param));

      const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body });
      if (!response.ok) return setError("Upload to Cloudinary failed");
      const uploaded: { public_id: string; secure_url: string } = await response.json();

      dropStaged();
      onChange(
        {
          publicId: uploaded.public_id,
          url: uploaded.secure_url,
          alt: value?.alt ?? fallback.alt,
          focalX: value?.focalX ?? defaultFocal.x,
          focalY: value?.focalY ?? defaultFocal.y,
        },
        true,
      );
    } catch {
      setError("Something went wrong");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  const remove = () => {
    setError(null);
    dropStaged();
    onChange(null, false);
  };

  const setFocal = (focalX: number, focalY: number) => value && onChange({ ...value, focalX: clamp(focalX), focalY: clamp(focalY) }, staged);

  const moveFocal = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setFocal(((event.clientX - box.left) / box.width) * 100, ((event.clientY - box.top) / box.height) * 100);
  };

  return (
    <div className={styles.picker}>
      <p className={styles.pickerLabel}>{label}</p>

      {value ? (
        <>
          <div
            className={styles.focalStage}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              moveFocal(event);
            }}
            onPointerMove={(event) => event.currentTarget.hasPointerCapture(event.pointerId) && moveFocal(event)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- an admin preview of a Cloudinary file, resized by its URL */}
            <img src={preview(value.url, 900)} alt={value.alt} draggable={false} />
            <span className={styles.focalDot} style={{ left: `${value.focalX}%`, top: `${value.focalY}%` }} aria-hidden="true" />
          </div>
          <p className={styles.hint}>Click or drag on the photo to choose the part the site keeps in view when it crops.</p>

          <div className={styles.focalSliders}>
            <label>
              <span>Across ({value.focalX}%)</span>
              <input type="range" min={0} max={100} value={value.focalX} onChange={(event) => setFocal(Number(event.target.value), value.focalY)} />
            </label>
            <label>
              <span>Down ({value.focalY}%)</span>
              <input type="range" min={0} max={100} value={value.focalY} onChange={(event) => setFocal(value.focalX, Number(event.target.value))} />
            </label>
          </div>

          <label>
            <span>Alt text</span>
            <input
              value={value.alt}
              onChange={(event) => onChange({ ...value, alt: event.target.value }, staged)}
              maxLength={300}
              required
            />
          </label>
        </>
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- the original photo as a plain preview */}
          <img className={styles.defaultPreview} src={fallback.src} alt={fallback.alt} />
          <p className={styles.hint}>Showing the original photo. Upload one to replace it.</p>
        </>
      )}

      <div className={styles.actions}>
        <input ref={input} type="file" accept={MEDIA_ACCEPT} hidden onChange={(event) => event.target.files?.[0] && upload(event.target.files[0])} />
        <button type="button" className={styles.outline} disabled={busy} onClick={() => input.current?.click()}>
          {busy ? "Uploading…" : value ? "Replace photo" : "Upload photo"}
        </button>
        {value && (
          <button type="button" className={styles.danger} disabled={busy} onClick={remove}>
            Use original
          </button>
        )}
        {staged && <span className={styles.hint}>Not saved yet</span>}
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
      <p className={styles.hint}>JPG, PNG or WebP, up to 10 MB.</p>
    </div>
  );
}

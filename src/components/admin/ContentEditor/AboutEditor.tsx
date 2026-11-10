"use client";

import { useState } from "react";
import { updateAboutSectionAction } from "@/app/admin/content-actions";
import { discardSiteUploadAction, saveSiteImagesAction, type SaveSiteImagesInput } from "@/app/admin/site-image-actions";
import { ABOUT_PHOTO, OSKAR_PHOTO } from "@/data/photos";
import type { AboutContent } from "@/lib/contentSchema";
import { SITE_IMAGE_KEYS, type SiteImageKey } from "@/lib/media";
import type { SiteImage } from "@/lib/siteImages";
import ConfirmLeaveModal from "./ConfirmLeaveModal";
import SaveBar from "./SaveBar";
import SiteImagePicker, { type PickerValue } from "./SiteImagePicker";
import { TITLE_HINT } from "./hints";
import { useSave } from "./useSave";
import { useUnsavedGuard } from "./useUnsavedGuard";
import styles from "./contentEditor.module.scss";

// Where each photo sits in the crop when the admin hasn't chosen: the same as the site's own CSS default.
const DEFAULT_FOCAL: Record<SiteImageKey, { x: number; y: number }> = {
  "about-portrait": { x: 50, y: 50 },
  "about-couple": { x: 50, y: 30 },
};

type Slots = Record<SiteImageKey, PickerValue | null>;
type Staged = Record<SiteImageKey, boolean>;

function toPickerValue(key: SiteImageKey, image: SiteImage): PickerValue | null {
  if (!image.publicId) return null;
  return {
    publicId: image.publicId,
    url: image.src,
    alt: image.alt,
    focalX: image.focalX ?? DEFAULT_FOCAL[key].x,
    focalY: image.focalY ?? DEFAULT_FOCAL[key].y,
  };
}

export default function AboutEditor({ content, images }: { content: AboutContent; images: Record<SiteImageKey, SiteImage> }) {
  // Each section saves on its own: its copy and its photo, nothing else.
  const intro = useSave();
  const vision = useSave();

  // What's showing on the site (`saved`) versus what the admin has set up in the forms (`slots`).
  const [saved, setSaved] = useState<Slots>(() => ({
    "about-portrait": toPickerValue("about-portrait", images["about-portrait"]),
    "about-couple": toPickerValue("about-couple", images["about-couple"]),
  }));
  const [slots, setSlots] = useState<Slots>(saved);
  const [staged, setStaged] = useState<Staged>({ "about-portrait": false, "about-couple": false });

  const stagedUploads = SITE_IMAGE_KEYS.flatMap((key) => (staged[key] && slots[key] ? [slots[key].publicId] : []));
  const guard = useUnsavedGuard(stagedUploads.length > 0, () => Promise.all(stagedUploads.map((id) => discardSiteUploadAction(id))));

  const setSlot = (key: SiteImageKey) => (value: PickerValue | null, isStaged: boolean) => {
    setSlots((current) => ({ ...current, [key]: value }));
    setStaged((current) => ({ ...current, [key]: isStaged }));
  };

  // Saves one slot's photo; the other slot is told to stay as it is.
  const savePhoto = async (key: SiteImageKey) => {
    const value = slots[key];
    const details = value && { alt: value.alt, focalX: value.focalX, focalY: value.focalY };
    const slot: SaveSiteImagesInput[SiteImageKey] = !value
      ? saved[key]
        ? { kind: "default" }
        : { kind: "keep" }
      : staged[key]
        ? { kind: "upload", publicId: value.publicId, ...details! }
        : { kind: "edit", ...details! };
    const result = await saveSiteImagesAction({
      "about-portrait": { kind: "keep" },
      "about-couple": { kind: "keep" },
      [key]: slot,
    });
    if (result.ok) {
      setSaved((current) => ({ ...current, [key]: value }));
      setStaged((current) => ({ ...current, [key]: false }));
    }
    return result;
  };

  return (
    <div className={styles.sections}>
      <form
        className={styles.form}
        action={(formData) =>
          intro.save(async () => {
            const copy = await updateAboutSectionAction("intro", {
              pageTitle: String(formData.get("pageTitle") ?? ""),
              intro: String(formData.get("intro") ?? ""),
            });
            return copy.ok ? savePhoto("about-portrait") : copy;
          })
        }
      >
        <section className={styles.panel}>
          <h2>Hi, I&rsquo;m Oskar</h2>
          <p className={styles.hint}>The introduction with Oskar&rsquo;s portrait. Shown at the top of the About page and on the home page.</p>
          <label>
            <span>
              Heading <span className={styles.labelHint}>({TITLE_HINT})</span>
            </span>
            <input name="pageTitle" defaultValue={content.pageTitle} maxLength={120} required />
          </label>
          <label>
            <span>Introduction</span>
            <textarea name="intro" defaultValue={content.intro} rows={10} maxLength={2400} required />
          </label>
          <SiteImagePicker
            slotKey="about-portrait"
            label="Portrait"
            fallback={OSKAR_PHOTO}
            defaultFocal={DEFAULT_FOCAL["about-portrait"]}
            value={slots["about-portrait"]}
            staged={staged["about-portrait"]}
            onChange={setSlot("about-portrait")}
          />
        </section>
        <SaveBar pending={intro.pending} message={intro.message} />
      </form>

      <form
        className={styles.form}
        action={(formData) =>
          vision.save(async () => {
            const copy = await updateAboutSectionAction("vision", {
              sectionTitle: String(formData.get("sectionTitle") ?? ""),
              caption: String(formData.get("caption") ?? ""),
              paragraphs: String(formData.get("paragraphs") ?? "")
                .split(/\n\s*\n/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean),
            });
            return copy.ok ? savePhoto("about-couple") : copy;
          })
        }
      >
        <section className={styles.panel}>
          <h2>Two People, One Shared Vision</h2>
          <p className={styles.hint}>The section with the photo of Oskar and Katya. Shown below the introduction on the About page and the home page.</p>
          <label>
            <span>
              Heading <span className={styles.labelHint}>(a new line breaks the heading; {TITLE_HINT})</span>
            </span>
            <textarea name="sectionTitle" defaultValue={content.sectionTitle} rows={2} maxLength={120} required />
          </label>
          <label>
            <span>Caption under the photo</span>
            <input name="caption" defaultValue={content.caption} maxLength={80} required />
          </label>
          <label>
            <span>
              Paragraphs <span className={styles.labelHint}>(leave a blank line between paragraphs)</span>
            </span>
            <textarea name="paragraphs" defaultValue={content.paragraphs.join("\n\n")} rows={10} required />
          </label>
          <SiteImagePicker
            slotKey="about-couple"
            label="Photo"
            fallback={ABOUT_PHOTO}
            defaultFocal={DEFAULT_FOCAL["about-couple"]}
            value={slots["about-couple"]}
            staged={staged["about-couple"]}
            onChange={setSlot("about-couple")}
          />
        </section>
        <SaveBar pending={vision.pending} message={vision.message} />
      </form>
      <ConfirmLeaveModal open={guard.open} onConfirm={guard.confirm} onCancel={guard.cancel} />
    </div>
  );
}

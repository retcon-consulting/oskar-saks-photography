"use client";

import { useEffect, useRef, useState } from "react";
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

  // The text as last saved. The fields are uncontrolled, so Cancel remounts a section (new `key`) to put these values back.
  const [copy, setCopy] = useState({
    pageTitle: content.pageTitle,
    intro: content.intro,
    sectionTitle: content.sectionTitle,
    caption: content.caption,
    paragraphs: content.paragraphs.join("\n\n"),
  });
  const [formKey, setFormKey] = useState({ intro: 0, vision: 0 });

  // Puts both sections back to what is saved: text, photos, messages. Used when the admin leaves the page, so nothing unsaved
  // is waiting for them when they come back (the admin page keeps its state while it is out of view).
  const resetAll = () => {
    setSlots(saved);
    setStaged({ "about-portrait": false, "about-couple": false });
    setFormKey((current) => ({ intro: current.intro + 1, vision: current.vision + 1 }));
    intro.clear();
    vision.clear();
  };
  const resetRef = useRef(resetAll);
  useEffect(() => {
    resetRef.current = resetAll;
  });
  // Runs when the editor is hidden or removed by navigating away.
  useEffect(() => () => resetRef.current(), []);

  const stagedUploads = SITE_IMAGE_KEYS.flatMap((key) => (staged[key] && slots[key] ? [slots[key].publicId] : []));
  const guard = useUnsavedGuard(stagedUploads.length > 0, () => {
    resetAll();
    return Promise.all(stagedUploads.map((id) => discardSiteUploadAction(id)));
  });

  // Throws away a section's unsaved changes: its text goes back to what was saved, its photo goes back to the saved one,
  // and an upload that was never saved is deleted from Cloudinary.
  const cancel = (section: "intro" | "vision", key: SiteImageKey, state: ReturnType<typeof useSave>) => {
    const unsaved = staged[key] ? slots[key] : null;
    if (unsaved) void discardSiteUploadAction(unsaved.publicId);
    setSlots((current) => ({ ...current, [key]: saved[key] }));
    setStaged((current) => ({ ...current, [key]: false }));
    setFormKey((current) => ({ ...current, [section]: current[section] + 1 }));
    state.clear();
  };

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
            const fields = { pageTitle: String(formData.get("pageTitle") ?? ""), intro: String(formData.get("intro") ?? "") };
            const text = await updateAboutSectionAction("intro", fields);
            if (!text.ok) return text;
            setCopy((current) => ({ ...current, ...fields }));
            return savePhoto("about-portrait");
          })
        }
      >
        <section key={`intro-${formKey.intro}`} className={styles.panel}>
          <h2>Hi, I&rsquo;m Oskar</h2>
          <p className={styles.hint}>The introduction with Oskar&rsquo;s portrait. Shown at the top of the About page and on the home page.</p>
          <label>
            <span>
              Heading <span className={styles.labelHint}>({TITLE_HINT})</span>
            </span>
            <input name="pageTitle" defaultValue={copy.pageTitle} maxLength={120} required />
          </label>
          <label>
            <span>Introduction</span>
            <textarea name="intro" defaultValue={copy.intro} rows={10} maxLength={2400} required />
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
        <SaveBar pending={intro.pending} message={intro.message} onCancel={() => cancel("intro", "about-portrait", intro)} />
      </form>

      <form
        className={styles.form}
        action={(formData) =>
          vision.save(async () => {
            const paragraphs = String(formData.get("paragraphs") ?? "")
              .split(/\n\s*\n/)
              .map((paragraph) => paragraph.trim())
              .filter(Boolean);
            const fields = {
              sectionTitle: String(formData.get("sectionTitle") ?? ""),
              caption: String(formData.get("caption") ?? ""),
              paragraphs,
            };
            const text = await updateAboutSectionAction("vision", fields);
            if (!text.ok) return text;
            setCopy((current) => ({ ...current, ...fields, paragraphs: paragraphs.join("\n\n") }));
            return savePhoto("about-couple");
          })
        }
      >
        <section key={`vision-${formKey.vision}`} className={styles.panel}>
          <h2>Two People, One Shared Vision</h2>
          <p className={styles.hint}>The section with the photo of Oskar and Katya. Shown below the introduction on the About page and the home page.</p>
          <label>
            <span>
              Heading <span className={styles.labelHint}>(a new line breaks the heading; {TITLE_HINT})</span>
            </span>
            <textarea name="sectionTitle" defaultValue={copy.sectionTitle} rows={2} maxLength={120} required />
          </label>
          <label>
            <span>Caption under the photo</span>
            <input name="caption" defaultValue={copy.caption} maxLength={80} required />
          </label>
          <label>
            <span>
              Paragraphs <span className={styles.labelHint}>(leave a blank line between paragraphs)</span>
            </span>
            <textarea name="paragraphs" defaultValue={copy.paragraphs} rows={10} required />
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
        <SaveBar pending={vision.pending} message={vision.message} onCancel={() => cancel("vision", "about-couple", vision)} />
      </form>
      <ConfirmLeaveModal open={guard.open} onConfirm={guard.confirm} onCancel={guard.cancel} />
    </div>
  );
}

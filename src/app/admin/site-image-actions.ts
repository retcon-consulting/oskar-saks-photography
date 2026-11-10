"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { verifyAdmin } from "@/lib/dal";
import { db } from "@/lib/db";
import { destroyImages, fetchUploadedImage, markImagesAttached, mediaUrl, signSiteUpload } from "@/lib/cloudinary";
import {
  MAX_MEDIA_BYTES,
  MEDIA_FORMATS,
  SITE_FOLDER,
  SITE_IMAGE_KEYS,
  SITE_PUBLIC_ID_PATTERN,
  SITE_UPLOAD_TAG,
  siteFolder,
  type SiteImageKey,
} from "@/lib/media";
import type { ActionResult } from "./actions";

const keySchema = z.enum(SITE_IMAGE_KEYS);

export async function signSiteUploadAction(key: string) {
  await verifyAdmin();
  const parsed = keySchema.safeParse(key);
  if (!parsed.success) return null;
  return signSiteUpload(parsed.data);
}

const detailsSchema = {
  alt: z.string().trim().min(1, "Alt text is required for each photo").max(300),
  focalX: z.number().int().min(0).max(100),
  focalY: z.number().int().min(0).max(100),
};

// What the editor wants for one slot: leave it, go back to the original photo, change only the details of the current upload,
// or swap in a newly uploaded photo.
const slotSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("keep") }),
  z.object({ kind: z.literal("default") }),
  z.object({ kind: z.literal("edit"), ...detailsSchema }),
  z.object({ kind: z.literal("upload"), publicId: z.string().max(200), ...detailsSchema }),
]);

const saveSchema = z.object({ "about-portrait": slotSchema, "about-couple": slotSchema });

export type SaveSiteImagesInput = z.input<typeof saveSchema>;

// Only files in the site folder are ever deleted here, never the originals that ship with the site.
const isSiteFile = (publicId: string) => publicId.startsWith(`${SITE_FOLDER}/`);

export async function saveSiteImagesAction(input: SaveSiteImagesInput): Promise<ActionResult> {
  await verifyAdmin();
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid photo details" };

  // Check every upload before changing anything, so a bad one doesn't leave the other slot half-saved.
  const verified = new Map<SiteImageKey, { width: number; height: number }>();
  for (const key of SITE_IMAGE_KEYS) {
    const slot = parsed.data[key];
    if (slot.kind !== "upload") continue;
    if (!SITE_PUBLIC_ID_PATTERN.test(slot.publicId) || !slot.publicId.startsWith(`${siteFolder(key)}/`)) {
      return { ok: false, error: "Invalid upload" };
    }
    const image = await fetchUploadedImage(slot.publicId);
    if (!image || !MEDIA_FORMATS.includes(image.format)) return { ok: false, error: "Upload could not be verified" };
    if (image.bytes > MAX_MEDIA_BYTES) {
      await destroyImages([slot.publicId]).catch(() => undefined);
      return { ok: false, error: "Photos must be 10 MB or smaller" };
    }
    verified.set(key, { width: image.width, height: image.height });
  }

  const attached: string[] = [];
  const replaced: string[] = [];
  let changed = false;

  for (const key of SITE_IMAGE_KEYS) {
    const slot = parsed.data[key];
    if (slot.kind === "keep") continue;

    const existing = await db.siteImage.findUnique({ where: { key } });

    if (slot.kind === "default") {
      if (!existing) continue;
      await db.siteImage.delete({ where: { key } });
      replaced.push(existing.cloudinaryPublicId);
      changed = true;
    } else if (slot.kind === "edit") {
      if (!existing) return { ok: false, error: "That photo no longer exists. Refresh and try again." };
      await db.siteImage.update({ where: { key }, data: { alt: slot.alt, focalX: slot.focalX, focalY: slot.focalY } });
      changed = true;
    } else {
      const size = verified.get(key)!;
      const data = {
        cloudinaryPublicId: slot.publicId,
        url: mediaUrl(slot.publicId),
        width: size.width,
        height: size.height,
        alt: slot.alt,
        focalX: slot.focalX,
        focalY: slot.focalY,
      };
      await db.siteImage.upsert({ where: { key }, create: { key, ...data }, update: data });
      if (existing && existing.cloudinaryPublicId !== slot.publicId) replaced.push(existing.cloudinaryPublicId);
      attached.push(slot.publicId);
      changed = true;
    }
  }

  // Rows first: if removing the old files fails, the worst case is an unused file in Cloudinary, not a broken image on the site.
  await markImagesAttached(attached, SITE_UPLOAD_TAG).catch((error) => console.error("Failed to tag upload:", error));
  await destroyImages(replaced.filter(isSiteFile)).catch((error) => console.error("Failed to delete old image:", error));

  if (changed) updateTag("content");
  return { ok: true };
}

// Removes an upload the admin walked away from without saving. Refuses anything a slot is using.
export async function discardSiteUploadAction(publicId: string): Promise<ActionResult> {
  await verifyAdmin();
  if (!SITE_PUBLIC_ID_PATTERN.test(publicId)) return { ok: false, error: "Invalid upload" };
  const inUse = await db.siteImage.findFirst({ where: { cloudinaryPublicId: publicId }, select: { key: true } });
  if (inUse) return { ok: false, error: "That photo is in use" };
  await destroyImages([publicId]).catch((error) => console.error("Failed to discard upload:", error));
  return { ok: true };
}

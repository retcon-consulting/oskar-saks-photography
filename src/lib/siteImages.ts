import { cacheLife, cacheTag } from "next/cache";
import { ABOUT_PHOTO, OSKAR_PHOTO } from "@/data/photos";
import { db } from "@/lib/db";
import type { SiteImageKey } from "@/lib/media";

export type SiteImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  // object-position percentages; null leaves the layout's own default crop.
  focalX: number | null;
  focalY: number | null;
  // Set when an uploaded photo is in use; its Cloudinary id lets the admin replace or remove it.
  publicId: string | null;
};

const DEFAULTS: Record<SiteImageKey, { src: string; alt: string; width: number; height: number }> = {
  "about-portrait": OSKAR_PHOTO,
  "about-couple": ABOUT_PHOTO,
};

// A photo uploaded in the admin replaces the static file; with no row the site keeps showing the original, so there is always a photo.
async function loadSiteImage(key: SiteImageKey): Promise<SiteImage> {
  "use cache";
  cacheTag("content");
  cacheLife("days");
  const row = await db.siteImage.findUnique({ where: { key } });
  if (!row) return { ...DEFAULTS[key], focalX: null, focalY: null, publicId: null };
  return {
    src: row.url,
    alt: row.alt,
    width: row.width,
    height: row.height,
    focalX: row.focalX,
    focalY: row.focalY,
    publicId: row.cloudinaryPublicId,
  };
}

export const getAboutPortrait = () => loadSiteImage("about-portrait");
export const getAboutCouplePhoto = () => loadSiteImage("about-couple");

export function focalPosition(image: Pick<SiteImage, "focalX" | "focalY">) {
  return image.focalX === null || image.focalY === null ? undefined : `${image.focalX}% ${image.focalY}%`;
}

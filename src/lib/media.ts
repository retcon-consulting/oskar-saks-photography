export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const MEDIA_FORMATS = ["jpg", "jpeg", "png", "webp"];
export const MEDIA_ACCEPT = "image/jpeg,image/png,image/webp";
export const MEDIA_UPLOAD_TAG = "pending-gallery-upload";
export const MEDIA_FOLDER = "oskar-saks/gallery";
export const MEDIA_PUBLIC_ID_PATTERN = /^oskar-saks\/gallery\/(families|couples|events)\/[A-Za-z0-9_-]{2,40}$/;

export function mediaFolder(category: string) {
  return `${MEDIA_FOLDER}/${category}`;
}

// Site-wide images (the About page photos). Kept apart from the gallery so each has its own folder, pending tag and id pattern.
export const SITE_IMAGE_KEYS = ["about-portrait", "about-couple"] as const;
export type SiteImageKey = (typeof SITE_IMAGE_KEYS)[number];
export const SITE_UPLOAD_TAG = "pending-site-upload";
export const SITE_FOLDER = "oskar-saks/site";
export const SITE_PUBLIC_ID_PATTERN = /^oskar-saks\/site\/(about-portrait|about-couple)\/[A-Za-z0-9_-]{2,40}$/;

export function siteFolder(key: SiteImageKey) {
  return `${SITE_FOLDER}/${key}`;
}

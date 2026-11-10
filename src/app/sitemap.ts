import type { MetadataRoute } from "next";
import { getListedCategories } from "@/lib/gallery";
import { getSiteUrl } from "@/lib/siteConfig";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = getSiteUrl();
  const categories = await getListedCategories();
  const paths = ["/", "/about", "/gallery", ...categories.map((category) => `/gallery/${category.slug}`), "/services"];
  return paths.map((path) => ({
    url: `${site}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" || path.startsWith("/gallery") ? "weekly" : "monthly",
    priority: path === "/" ? 1 : path === "/gallery" ? 0.9 : 0.8,
  }));
}

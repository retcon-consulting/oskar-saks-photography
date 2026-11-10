import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageHero from "@/components/ui/PageHero/PageHero";
import PhotoGrid from "@/components/sections/Gallery/PhotoGrid";
import { getCategories, getCategoryContent, getListedCategories, getPhotosByCategory } from "@/lib/gallery";
import { pageMetadata } from "@/lib/seo";
import styles from "@/components/sections/Gallery/categoryPage.module.scss";

// With Cache Components this list must never be empty. The admin can't delete the last gallery, so it isn't.
// Galleries added later are rendered on demand the first time they are visited.
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: PageProps<"/gallery/[category]">): Promise<Metadata> {
  const { category: slug } = await params;
  const category = await getCategoryContent(slug);
  if (!category) return {};
  return pageMetadata({ title: `${category.label} Gallery`, description: category.description, path: `/gallery/${category.slug}` });
}

export default function CategoryPage({ params }: PageProps<"/gallery/[category]">) {
  return (
    <Suspense fallback={<div style={{ minHeight: "100svh" }} aria-busy="true" />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}

async function CategoryContent({ params }: { params: PageProps<"/gallery/[category]">["params"] }) {
  const { category: slug } = await params;
  const category = await getCategoryContent(slug);
  if (!category) notFound();

  const [listed, photos] = await Promise.all([getListedCategories(), getPhotosByCategory(category.slug)]);
  const others = listed.filter((item) => item.slug !== category.slug);

  return (
    <>
      <PageHero
        eyebrow={`Gallery / ${category.label}`}
        title={
          <>
            {category.heading.split(" ").slice(0, -1).join(" ")} <em>{category.heading.split(" ").slice(-1)}</em>
          </>
        }
        lede={category.description}
        back={{ href: "/gallery", label: "All galleries" }}
      />
      <div className={`${styles.body} ${styles.bodyWide}`}>
        <PhotoGrid photos={photos} />
      </div>
      {others.length > 0 && (
        <nav className={styles.pager} aria-label="More galleries">
          {others.map((item) => (
            <Link key={item.slug} href={`/gallery/${item.slug}`} className={styles.pagerLink}>
              <small>Also see →</small>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

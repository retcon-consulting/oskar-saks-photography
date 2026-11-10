import type { CSSProperties } from "react";
import FadeImage from "@/components/ui/FadeImage/FadeImage";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal/Reveal";
import { getListedCategories, getPhotosByCategory } from "@/lib/gallery";
import styles from "./categoryCards.module.scss";

export default async function CategoryCards() {
  // Only galleries that have a photo are listed, so every card has a cover to show.
  const categories = await getListedCategories();
  const photosByCategory = await Promise.all(categories.map((category) => getPhotosByCategory(category.slug)));
  return (
    <ul className={styles.grid} style={{ "--count": categories.length } as CSSProperties}>
      {categories.map((category, index) => {
        const photos = photosByCategory[index];
        const cover = photos.find((photo) => photo.cover) ?? photos[0];
        if (!cover) return null;
        return (
          <Reveal as="li" key={category.slug} delay={index * 110} className={styles.item}>
            <Link href={`/gallery/${category.slug}`} className={styles.card}>
              <FadeImage
                src={cover.src}
                alt=""
                fill
                sizes="(min-width: 1024px) 30vw, 100vw"
                className={styles.image}
              />
              <span className={styles.shade} aria-hidden="true" />
              <span className={styles.body}>
                <span className={styles.name}>{category.label}</span>
                <span className={styles.tagline}>{category.tagline}</span>
                <span className={styles.view}>
                  View gallery <span aria-hidden="true">→</span>
                </span>
              </span>
            </Link>
          </Reveal>
        );
      })}
    </ul>
  );
}

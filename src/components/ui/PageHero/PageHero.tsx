import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Reveal from "@/components/ui/Reveal/Reveal";
import styles from "./pageHero.module.scss";

type PageHeroProps = {
  eyebrow: string;
  title: ReactNode;
  lede?: string;
  back?: { href: string; label: string };
  // width/height are the image's real size (the layout crops it square); objectPosition is the admin's chosen focal point.
  portrait?: { src: string; alt: string; width?: number; height?: number; objectPosition?: string };
  // For use as a section partway down another page (the home page's intro to Oskar) rather than as the top of a page:
  // a section heading instead of the page's h1, normal section spacing instead of clearing the header, and a lazy portrait.
  asSection?: { id: string };
};

export default function PageHero({ eyebrow, title, lede, back, portrait, asSection }: PageHeroProps) {
  return (
    <section id={asSection?.id} className={`${styles.hero} ${asSection ? styles.section : ""}`}>
      <div className={`${styles.inner} ${portrait ? styles.withPortrait : ""}`}>
        <div className={styles.copy}>
        {back && (
          <Reveal>
            <Link href={back.href} className={styles.back}>
              <span aria-hidden="true">←</span>
              {back.label}
            </Link>
          </Reveal>
        )}
        <Reveal delay={back ? 60 : 0}>
          <p className={styles.eyebrow}>{eyebrow}</p>
        </Reveal>
        <Reveal as={asSection ? "h2" : "h1"} delay={120} className={styles.title}>
          {title}
        </Reveal>
        {lede && (
          <Reveal as="p" delay={200} className={styles.lede}>
            {lede}
          </Reveal>
        )}
        </div>
        {portrait && (
          <Reveal delay={240} className={styles.portrait}>
            <Image
              src={portrait.src}
              alt={portrait.alt}
              width={portrait.width ?? 800}
              height={portrait.height ?? 800}
              sizes="(min-width: 768px) 28rem, 80vw"
              quality={90}
              preload={!asSection}
              style={portrait.objectPosition ? { objectPosition: portrait.objectPosition } : undefined}
            />
          </Reveal>
        )}
      </div>
    </section>
  );
}

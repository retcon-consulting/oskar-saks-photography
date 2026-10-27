"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useActiveSection } from "@/hooks/useActiveSection";
import { CATEGORIES } from "@/data/photos";
// import { instagramUrl, NAV_LINKS, PHOTOGRAPHER } from "@/lib/siteConfig";
import { NAV_LINKS, PHOTOGRAPHER } from "@/lib/siteConfig";
import styles from "./header.module.scss";

// How long scrolling must pause before the desktop header slides away.
const IDLE_HIDE_MS = 2000;

// export default function Header({ instagram }: { instagram: string }) {
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  // Desktop only (see header.module.scss): the header slides away once scrolling has stopped for a few seconds.
  const [idle, setIdle] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastY = useRef(0);
  const active = useActiveSection();

  useEffect(() => {
    let idleTimer: number | undefined;
    // Waits out the pause; if the pointer is over the header or someone is tabbing through it, it keeps waiting rather than vanishing
    // under them. Plain :focus-within would also match a link that was merely clicked earlier, and the header would never hide.
    const armIdle = () => {
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        const header = headerRef.current;
        if (header && (header.matches(":hover") || header.querySelector(":focus-visible"))) return armIdle();
        setIdle(true);
      }, IDLE_HIDE_MS);
    };
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setIdle(false);
      if (y > 24) armIdle();
      else window.clearTimeout(idleTimer);
      setGalleryOpen(false);
      if (Math.abs(y - lastY.current) > 8) {
        setHidden(y > 400 && y > lastY.current);
        lastY.current = y;
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(idleTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 900) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!galleryOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setGalleryOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [galleryOpen]);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const closeGallery = () => {
    setGalleryOpen(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  return (
    <header
      ref={headerRef}
      className={`${styles.header} ${idle ? styles.idle : ""} ${scrolled ? styles.scrolled : ""} ${menuOpen ? styles.open : ""} ${hidden && !menuOpen ? styles.hidden : ""}`}
      onFocusCapture={() => {
        setHidden(false);
        setIdle(false);
      }}
    >
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} onClick={closeMenu} aria-label={`${PHOTOGRAPHER}, back to top`}>
          <Image
            src="/images/logo.webp"
            alt={`${PHOTOGRAPHER} Photo`}
            width={1102}
            height={443}
            sizes="(min-width: 768px) 11.5rem, 8rem"
            className={styles.logo}
            preload
          />
        </Link>

        <nav className={styles.desktopNav} aria-label="Primary">
          <ul>
            {NAV_LINKS.map(({ id, label, href }) => (
              <li
                key={id}
                className={id === "gallery" ? `${styles.hasMenu} ${galleryOpen ? styles.menuShown : ""}` : undefined}
                onPointerEnter={id === "gallery" ? (event) => event.pointerType === "mouse" && setGalleryOpen(true) : undefined}
                onPointerLeave={id === "gallery" ? () => setGalleryOpen(false) : undefined}
                onFocus={
                  id === "gallery"
                    ? (event) => event.target.matches(":focus-visible") && setGalleryOpen(true)
                    : undefined
                }
                onBlur={
                  id === "gallery"
                    ? (event) => !event.currentTarget.contains(event.relatedTarget) && setGalleryOpen(false)
                    : undefined
                }
              >
                <Link
                  href={href}
                  className={`${styles.link} ${active === id ? styles.active : ""}`}
                  aria-current={active === id ? "page" : undefined}
                  onClick={id === "gallery" ? closeGallery : undefined}
                >
                  {label}
                </Link>
                {id === "gallery" && (
                  <ul className={styles.dropdown}>
                    {CATEGORIES.map((category) => (
                      <li key={category.slug}>
                        <Link href={`/gallery/${category.slug}`} className={styles.dropLink} onClick={closeGallery}>
                          {category.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className={styles.toggle}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={styles.toggleLabel}>{menuOpen ? "Close" : "Menu"}</span>
          <span className={styles.burger} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <div id="mobile-menu" className={styles.overlay} inert={!menuOpen}>
        <nav aria-label="Mobile">
          <ul>
            {NAV_LINKS.map(({ id, label, href }, index) => (
              <li key={id} style={{ transitionDelay: menuOpen ? `${120 + index * 55}ms` : "0ms" }}>
                <Link
                  href={href}
                  className={`${styles.overlayLink} ${active === id ? styles.active : ""}`}
                  onClick={closeMenu}
                >
                  <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
                  <span>{label}</span>
                </Link>
                {id === "gallery" && (
                  <ul className={styles.subLinks}>
                    {CATEGORIES.map((category) => (
                      <li key={category.slug}>
                        <Link href={`/gallery/${category.slug}`} onClick={closeMenu}>
                          {category.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* <a className={styles.overlayFoot} href={instagramUrl(instagram)} target="_blank" rel="noopener noreferrer">
          @{instagram}
        </a> */}
      </div>
    </header>
  );
}

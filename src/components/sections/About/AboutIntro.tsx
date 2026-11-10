import PageHero from "@/components/ui/PageHero/PageHero";
import { getAboutPortrait, focalPosition } from "@/lib/siteImages";
import { getAboutContent, renderTitle } from "@/lib/siteContent";

// "Hi, I'm Oskar": the same introduction the About page opens with, shown on the home page above the About section.
// It carries the home page's "about" id, so the nav's About tab lights up from here.
export default async function AboutIntro() {
  const [content, photo] = await Promise.all([getAboutContent(), getAboutPortrait()]);
  return (
    <PageHero
      asSection={{ id: "about" }}
      eyebrow="About"
      title={renderTitle(content.pageTitle)}
      lede={content.intro}
      portrait={{ src: photo.src, alt: photo.alt, width: photo.width, height: photo.height, objectPosition: focalPosition(photo) }}
    />
  );
}

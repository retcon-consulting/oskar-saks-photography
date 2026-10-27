import { getSiteUrl, PHOTOGRAPHER, SITE_DESCRIPTION, SITE_NAME } from "@/lib/siteConfig";
import { getContactContent } from "@/lib/siteContent";

// Structured data that tells search engines this is a local photography business, with the contact details edited in the admin.
export default async function SiteJsonLd() {
  const contact = await getContactContent();
  const site = getSiteUrl();
  const data = {
    "@context": "https://schema.org",
    "@type": "Photographer",
    "@id": `${site}/#business`,
    name: SITE_NAME,
    founder: { "@type": "Person", name: PHOTOGRAPHER },
    description: SITE_DESCRIPTION,
    url: site,
    image: `${site}/og.jpg`,
    logo: `${site}/android-chrome-512x512.png`,
    email: contact.email,
    address: { "@type": "PostalAddress", addressLocality: contact.location, addressRegion: "CO", addressCountry: "US" },
    areaServed: { "@type": "State", name: "Colorado" },
    // sameAs: [instagramUrl(contact.instagram)],
  };
  // "<" is escaped so nothing in the data (it includes admin-edited text) can close the script tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\u003c") }} />;
}

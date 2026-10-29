import type { Metadata } from 'next';
import { SITE_DESCRIPTION } from '@/lib/siteConfig';
import { pageMetadata } from '@/lib/seo';
import Hero from '@/components/sections/Hero/Hero';
import AboutIntro from '@/components/sections/About/AboutIntro';
import About from '@/components/sections/About/About';
import GalleryPreview from '@/components/sections/Gallery/GalleryPreview';
// import Store from "@/components/sections/Store/Store";
import Services from '@/components/sections/Services/Services';

// No title: the layout's default ("Oskar Saks Photography | tagline") is what the home page should be called.
export const metadata: Metadata = pageMetadata({
	description: SITE_DESCRIPTION,
	path: '/',
});

export default function Home() {
	return (
		<>
			<Hero />
			<GalleryPreview />
			<Services preview />
			<AboutIntro />
			<About />
			{/* <Store /> */}
		</>
	);
}

import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdminSkeleton from '@/components/admin/AdminSkeleton/AdminSkeleton';
import AdminTabs from '@/components/admin/AdminTabs/AdminTabs';
import { parseTab } from '@/components/admin/AdminTabs/tabs';
import ContactEditor from '@/components/admin/ContentEditor/ContactEditor';
import AboutEditor from '@/components/admin/ContentEditor/AboutEditor';
import HomeEditor from '@/components/admin/ContentEditor/HomeEditor';
import ServicesEditor from '@/components/admin/ContentEditor/ServicesEditor';
import PhotoManager from '@/components/admin/PhotoManager/PhotoManager';
import { verifyAdmin } from '@/lib/dal';
import { db } from '@/lib/db';
import { getAboutContent, getContactContent, getHomeContent, getServicesContent } from '@/lib/siteContent';
import { getAboutCouplePhoto, getAboutPortrait } from '@/lib/siteImages';

export const metadata: Metadata = {
	title: 'Admin',
	robots: { index: false, follow: false },
};

async function getGalleryCategories() {
	const [photos, categories] = await Promise.all([
		db.photo.findMany({
			orderBy: [{ position: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
		}),
		db.category.findMany({ orderBy: [{ hidden: 'asc' }, { position: 'asc' }, { slug: 'asc' }] }),
	]);

	return (
		categories
			.map((category) => ({
				slug: category.slug,
				label: category.label,
				heading: category.heading,
				tagline: category.tagline,
				description: category.description,
				hidden: category.hidden,
				photos: photos
					.filter((photo) => photo.category === category.slug)
					.map(({ id, url, alt, title, cover }) => ({
						id,
						url,
						alt,
						title: title ?? '',
						cover,
					})),
			}))
			// "Unassigned photos" only shows up while it holds something to sort out.
			.filter((category) => !category.hidden || category.photos.length > 0)
	);
}

// One page holds every section; the tabs switch in the browser, so only this first load shows the skeleton.
async function AdminConsole({ searchParams }: { searchParams: PageProps<'/admin'>['searchParams'] }) {
	await verifyAdmin();
	const [{ tab }, home, about, aboutPortrait, aboutCouple, services, contact, categories] = await Promise.all([
		searchParams,
		getHomeContent(),
		getAboutContent(),
		getAboutPortrait(),
		getAboutCouplePhoto(),
		getServicesContent(),
		getContactContent(),
		getGalleryCategories(),
	]);

	return (
		<AdminTabs
			initial={parseTab(typeof tab === 'string' ? tab : undefined)}
			panels={{
				home: <HomeEditor content={home} />,
				about: <AboutEditor content={about} images={{ 'about-portrait': aboutPortrait, 'about-couple': aboutCouple }} />,
				gallery: <PhotoManager categories={categories} />,
				services: <ServicesEditor content={services} />,
				contact: <ContactEditor content={contact} />,
			}}
		/>
	);
}

export default function AdminPage(props: PageProps<'/admin'>) {
	return (
		<Suspense fallback={<AdminSkeleton variant='form' />}>
			<AdminConsole searchParams={props.searchParams} />
		</Suspense>
	);
}

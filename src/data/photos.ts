export type CategorySlug = 'families' | 'couples' | 'events';

export type Photo = {
	id: string;
	src: string;
	width: number;
	height: number;
	alt: string;
	category: CategorySlug;
	title?: string;
	cover?: boolean;
};

export type Category = {
	slug: CategorySlug;
	label: string;
	heading: string;
	tagline: string;
	description: string;
};

export const CATEGORIES: Category[] = [
	{
		slug: 'families',
		label: 'Families',
		heading: 'Family Photography',
		tagline: 'Real connection, unhurried',
		description:
			'Family photos should feel effortless, natural, and fun. As a husband-and-wife team, we work together to create a relaxed, enjoyable experience while capturing genuine moments against Colorado’s beautiful backdrops—whether you have a favorite location in mind or let us find the perfect spot for you.',
	},
	{
		slug: 'couples',
		label: 'Couples',
		heading: 'Couples Shoots',
		tagline: 'Quiet moments, honest light',
		description:
			'Whether you’re just beginning your journey together or have been married for decades, we’re here to capture the love and connection that make your relationship unique. From candid laughter to quiet, intimate moments, we’ll help you create beautiful memories to look back on for years to come.',
	},
	{
		slug: 'events',
		label: 'Events',
		heading: 'Events',
		tagline: 'Energy, atmosphere, defining moments',
		description:
			'From dimly lit concert venues and dynamic dance performances to corporate celebrations and large-scale events, we capture the energy, atmosphere, and defining moments that make every occasion unique.',
	},
];

export function getCategory(slug: string) {
	return CATEGORIES.find((category) => category.slug === slug);
}

export const HERO_PHOTO = {
	src: '/images/hero.jpg',
	width: 2000,
	height: 1335,
	alt: 'A couple walking arm in arm through falling snow',
};

export const OSKAR_PHOTO = {
	src: '/images/oskar.webp',
	width: 800,
	height: 800,
	alt: 'Portrait of photographer Oskar Saks',
};

export const ABOUT_PHOTO = {
	src: '/images/about.webp',
	width: 2500,
	height: 3333,
	alt: 'Oskar and Katya smiling together beneath a string-lit tree in golden evening light',
};

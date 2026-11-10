export type Photo = {
	id: string;
	src: string;
	width: number;
	height: number;
	alt: string;
	// The slug of the gallery the photo belongs to.
	category: string;
	title?: string;
	cover?: boolean;
};

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

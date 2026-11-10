import Image from 'next/image';
import Link from 'next/link';
import Reveal from '@/components/ui/Reveal/Reveal';
import { getAboutContent, renderTitle } from '@/lib/siteContent';
import { focalPosition, getAboutCouplePhoto } from '@/lib/siteImages';
import styles from './about.module.scss';

type AboutProps = {
	// On the About page itself: no link back to that page, and a different heading id (the home page's copy of this section can
	// still be in the document, hidden, and ids must stay unique).
	onAboutPage?: boolean;
};

export default async function About({ onAboutPage = false }: AboutProps) {
	const [content, photo] = await Promise.all([getAboutContent(), getAboutCouplePhoto()]);
	const position = focalPosition(photo);
	const titleId = onAboutPage ? 'about-page-title' : 'about-title';
	return (
		// Always follows the "Hi, I'm Oskar" introduction, which has the "about" id and the "About" eyebrow.
		<section className={styles.about} aria-labelledby={titleId}>
			<div className={styles.inner}>
				<Reveal className={styles.media}>
					<div className={styles.portrait}>
						<Image
							src={photo.src}
							alt={photo.alt}
							fill
							sizes='(min-width: 1024px) 40vw, 100vw'
							quality={90}
							className={styles.image}
							style={position ? { objectPosition: position } : undefined}
						/>
					</div>
					<p className={styles.caption}>
						<span>{content.caption}</span>
					</p>
				</Reveal>

				<div className={styles.copy}>
					<Reveal as='h2' delay={80} className={styles.title}>
						<span id={titleId}>{renderTitle(content.sectionTitle)}</span>
					</Reveal>
					{content.paragraphs.map((paragraph, index) => (
						<Reveal
							key={index}
							as='p'
							delay={160 + index * 80}
							className={styles.paragraph}
						>
							{paragraph}
						</Reveal>
					))}
					{!onAboutPage && (
						<Reveal delay={260} className={styles.actions}>
							<Link href='/about' className={styles.secondary}>
								More about Oskar <span aria-hidden='true'>→</span>
							</Link>
						</Reveal>
					)}
				</div>
			</div>
		</section>
	);
}

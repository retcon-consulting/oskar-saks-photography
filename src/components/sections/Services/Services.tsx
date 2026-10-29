import Link from "next/link";
import Reveal from "@/components/ui/Reveal/Reveal";
import { getServicesContent, renderTitle } from "@/lib/siteContent";
import InquireButton from "./InquireButton";
import styles from "./services.module.scss";

type ServicesProps = {
  preview?: boolean;
};

export default async function Services({ preview = false }: ServicesProps) {
  const content = await getServicesContent();
  return (
    <section
      id={preview ? "services" : undefined}
      className={`${styles.services} ${preview ? "" : styles.full}`}
      aria-labelledby={preview ? "services-title" : undefined}
    >
      <div className={styles.inner}>
        {preview && (
        <header className={styles.head}>
          <Reveal>
            <p className={styles.eyebrow}>Services</p>
          </Reveal>
          <Reveal as="h2" delay={80} className={styles.title}>
            <span id="services-title">{renderTitle(content.title)}</span>
          </Reveal>
        </header>
        )}

        <ol className={styles.list}>
          {content.items.map((service, index) => {
            const discounted = service.discountActive && service.discountPercent > 0 && service.discountName !== "";
            const salePrice = Math.round(service.startingAt * (1 - service.discountPercent / 100));
            return (
            <Reveal as="li" key={service.id} delay={60 * index} className={styles.row}>
              <span className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
              <div className={styles.body}>
                <h3 data-text={service.title}>{service.title}</h3>
                <p>{service.description}</p>
                {!preview && service.includes.length > 0 && (
                <ul className={styles.includes}>
                  {service.includes.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                )}
              </div>
              <div className={styles.side}>
                <div className={styles.price}>
                  <span className={styles.label}>From</span>
                  {discounted ? (
                    <>
                      <span className={styles.amounts}>
                        <s className={styles.was}>
                          <span className="visually-hidden">Was </span>${service.startingAt.toLocaleString("en-US")}
                        </s>
                        <strong className={styles.now}>
                          <span className="visually-hidden">Now </span>${salePrice.toLocaleString("en-US")}
                        </strong>
                      </span>
                      <span className={styles.deal}>{service.discountName}</span>
                    </>
                  ) : (
                    <>${service.startingAt.toLocaleString("en-US")}</>
                  )}
                </div>
                <InquireButton topic={service.id} />
              </div>
            </Reveal>
            );
          })}
        </ol>

        {preview && (
          <Reveal className={styles.more}>
            <Link href="/services" className={styles.moreLink}>
              All services &amp; what&apos;s included <span aria-hidden="true">→</span>
            </Link>
          </Reveal>
        )}
      </div>
    </section>
  );
}

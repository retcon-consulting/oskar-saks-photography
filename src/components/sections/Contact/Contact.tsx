"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import DatePicker from "@/components/ui/DatePicker/DatePicker";
import Reveal from "@/components/ui/Reveal/Reveal";
import { CONTACT_PREFILL_EVENT, type ContactPrefill } from "@/lib/contactPrefill";
import { instagramUrl } from "@/lib/siteConfig";
import styles from "./contact.module.scss";

// Flip to true once the Resend API key is set up (see /api/contact).
const FORM_ENABLED = true;

type Status = "idle" | "sending" | "sent" | "error";

type ContactProps = {
  // The title arrives already rendered (its *emphasis* becomes markup on the server).
  content: { eyebrow: string; title: ReactNode; lede: string; email: string; instagram: string; location: string };
  topics: readonly { value: string; label: string }[];
};

export default function Contact({ topics, content }: ContactProps) {
  const emptyForm = { name: "", email: "", phone: "", topic: topics[0]?.value ?? "other", date: "", message: "", website: "" };
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  // When the form appeared; sent along so the server can tell a person from a script that posts instantly.
  const openedAt = useRef(0);

  useEffect(() => {
    openedAt.current = Date.now();
  }, []);

  useEffect(() => {
    const onPrefill = (event: Event) => {
      const { topic, message } = (event as CustomEvent<ContactPrefill>).detail;
      setStatus("idle");
      setForm((current) => ({
        ...current,
        topic,
        message: message ?? current.message,
      }));
    };
    window.addEventListener(CONTACT_PREFILL_EVENT, onPrefill);
    return () => window.removeEventListener(CONTACT_PREFILL_EVENT, onPrefill);
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, startedAt: openedAt.current }),
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(data?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setForm(emptyForm);
      setStatus("sent");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  };

  return (
    <section id="contact" className={styles.contact} aria-labelledby="contact-title">
      <div className={styles.inner}>
        <div className={styles.intro}>
          <Reveal>
            <p className={styles.eyebrow}>{content.eyebrow}</p>
          </Reveal>
          <Reveal as="h2" delay={80} className={styles.title}>
            <span id="contact-title">
              {content.title}
            </span>
          </Reveal>
          <Reveal as="p" delay={160} className={styles.lede}>
            {content.lede}
          </Reveal>
          <Reveal delay={240} className={styles.details}>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${content.email}`} className={styles.link}>
                    {content.email}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Instagram</dt>
                <dd>
                  <a href={instagramUrl(content.instagram)} target="_blank" rel="noopener noreferrer" className={styles.link}>
                    @{content.instagram}
                  </a>
                </dd>
              </div>
              <div>
                <dt>Based</dt>
                <dd>{content.location}</dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <Reveal delay={120} className={styles.formWrap}>
          {status === "sent" ? (
            <div className={styles.success} role="status">
              <p className={styles.successTitle}>
                Thank <em>you</em>.
              </p>
              <p>Your message is on its way. Oskar will be in touch shortly.</p>
              <button type="button" className={styles.again} onClick={() => setStatus("idle")}>
                Send another
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit} noValidate={false}>
              <div className={styles.field}>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    maxLength={200}
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="phone">
                    Phone <span>(optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    maxLength={30}
                    value={form.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label htmlFor="topic">I&rsquo;m interested in</label>
                  <div className={styles.select}>
                    <select id="topic" name="topic" value={form.topic} onChange={handleChange}>
                      {topics.map((topic) => (
                        <option key={topic.value} value={topic.value}>
                          {topic.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={styles.field}>
                  <label htmlFor="date">
                    Preferred date <span>(optional)</span>
                  </label>
                  <DatePicker id="date" name="date" value={form.date} onChange={(date) => setForm((current) => ({ ...current, date }))} />
                </div>
              </div>
              <div className={styles.field}>
                <label htmlFor="message">Message</label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  minLength={10}
                  maxLength={4000}
                  value={form.message}
                  onChange={handleChange}
                />
              </div>

              <div className={styles.trap} aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={handleChange}
                />
              </div>

              {status === "error" && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className={styles.submit} disabled={!FORM_ENABLED || status === "sending"}>
                <span>{status === "sending" ? "Sending…" : FORM_ENABLED ? "Send message" : "Coming soon"}</span>
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}

"use client";

import { useState } from "react";
import { closestCenter, DndContext, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { updateServicesContentAction } from "@/app/admin/content-actions";
import type { ServicesContent } from "@/lib/contentSchema";
import SaveBar from "./SaveBar";
import { TITLE_HINT } from "./hints";
import { useSave } from "./useSave";
import styles from "./contentEditor.module.scss";

// Edited as strings, then parsed on save: the price input and the one-per-line list are both text until then.
type Draft = {
  id: string;
  title: string;
  description: string;
  startingAt: string;
  includes: string;
  discountActive: boolean;
  discountName: string;
  discountPercent: string;
};

const MAX_SERVICES = 12;

export default function ServicesEditor({ content }: { content: ServicesContent }) {
  const { pending, message, save } = useSave();
  const [items, setItems] = useState<Draft[]>(() =>
    content.items.map((item) => ({
      ...item,
      startingAt: String(item.startingAt),
      includes: item.includes.join("\n"),
      discountPercent: String(item.discountPercent),
    })),
  );
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
  );

  const toggle = (id: string) =>
    setOpen((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const update = (id: string, patch: Partial<Draft>) =>
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const move = (index: number, by: number) => setItems((current) => arrayMove(current, index, index + by));

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    setItems((current) => {
      const from = current.findIndex((item) => item.id === active.id);
      const to = current.findIndex((item) => item.id === over.id);
      return from === -1 || to === -1 ? current : arrayMove(current, from, to);
    });
  };

  return (
    <form
      className={styles.form}
      action={(formData) =>
        save(() =>
          updateServicesContentAction({
            title: String(formData.get("title") ?? ""),
            lede: String(formData.get("lede") ?? ""),
            items: items.map((item) => ({
              id: item.id,
              title: item.title,
              description: item.description,
              startingAt: Number(item.startingAt),
              includes: item.includes
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
              discountActive: item.discountActive,
              discountName: item.discountName,
              discountPercent: Number(item.discountPercent),
            })),
          }),
        )
      }
    >
      <section className={styles.panel}>
        <h2>Heading</h2>
        <p className={styles.hint}>
          Shown above the services on the Services page, and as the heading of the services section on the home page.
        </p>
        <label>
          <span>
            Heading <span className={styles.labelHint}>({TITLE_HINT})</span>
          </span>
          <input name="title" defaultValue={content.title} maxLength={80} required />
        </label>
        <label>
          <span>Intro (Services page only)</span>
          <textarea name="lede" defaultValue={content.lede} rows={3} maxLength={400} required />
        </label>
      </section>

      <p className={styles.hint}>Click a service to edit it. Drag one by its header to reorder.</p>
      {/* A fixed id keeps the library's accessibility ids identical on the server and in the browser. */}
      <DndContext id="services" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
          <ol className={styles.services}>
            {items.map((item, index) => (
              <ServiceCard
                key={item.id}
                item={item}
                index={index}
                count={items.length}
                open={open.has(item.id)}
                onToggle={() => toggle(item.id)}
                onChange={(patch) => update(item.id, patch)}
                onMove={(by) => move(index, by)}
                onRemove={() => {
                  if (window.confirm(`Remove "${item.title || "this service"}"? It also leaves the contact form's topics once you save.`)) {
                    setItems((current) => current.filter((other) => other.id !== item.id));
                  }
                }}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.outline}
          disabled={items.length >= MAX_SERVICES}
          onClick={() => {
            const id = `s${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`;
            setItems((current) => [...current, {
              id,
              title: "",
              description: "",
              startingAt: "0",
              includes: "",
              discountActive: false,
              discountName: "",
              discountPercent: "0",
            }]);
            setOpen((current) => new Set(current).add(id));
          }}
        >
          + Add a service
        </button>
      </div>

      <SaveBar pending={pending} message={message} />
    </form>
  );
}

type ServiceCardProps = {
  item: Draft;
  index: number;
  count: number;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<Draft>) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
};

// The whole header drags (a click without movement still toggles), so it works like a list row rather than a tiny grip.
// Up/down buttons inside the open card cover keyboard users.
function ServiceCard({ item, index, count, open, onToggle, onChange, onMove, onRemove }: ServiceCardProps) {
  const { listeners,setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const name = item.title || "Untitled service";

  return (
    <li
      ref={setNodeRef}
      className={`${styles.panel} ${styles.service} ${isDragging ? styles.dragging : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className={styles.serviceBar} {...listeners}>
        <span className={styles.grip} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
            <circle cx="9" cy="6" r="1.6" />
            <circle cx="15" cy="6" r="1.6" />
            <circle cx="9" cy="12" r="1.6" />
            <circle cx="15" cy="12" r="1.6" />
            <circle cx="9" cy="18" r="1.6" />
            <circle cx="15" cy="18" r="1.6" />
          </svg>
        </span>
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={onToggle}>
          <span className={styles.serviceIndex}>{String(index + 1).padStart(2, "0")}</span>
          <span className={styles.serviceTitle}>{name}</span>
          <span className={styles.servicePrice}>from ${Number(item.startingAt || 0).toLocaleString("en-US")}</span>
          <span className={styles.chevron} data-open={open} aria-hidden="true">
            ▾
          </span>
        </button>
      </div>

      {open && (
        <div className={styles.serviceBody}>
          <div className={styles.row}>
            <label>
              <span>Title</span>
              <input value={item.title} onChange={(event) => onChange({ title: event.target.value })} maxLength={80} required />
            </label>
            <label>
              <span>Starting at ($)</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={item.startingAt}
                onChange={(event) => onChange({ startingAt: event.target.value })}
                required
              />
            </label>
          </div>
          <label>
            <span>Description</span>
            <textarea
              value={item.description}
              onChange={(event) => onChange({ description: event.target.value })}
              rows={3}
              maxLength={600}
              required
            />
          </label>
          <label>
            <span>
              What&rsquo;s included <span className={styles.labelHint}>(one per line; shown on the Services page)</span>
            </span>
            <textarea value={item.includes} onChange={(event) => onChange({ includes: event.target.value })} rows={4} />
          </label>
          <label className={styles.check}>
            {/* defaultChecked, not checked: React resets the form after a save, and that reset restores a checkbox to
                its default, so a controlled `checked` snapped back to its first-render value and showed the opposite. */}
            <input
              type="checkbox"
              defaultChecked={item.discountActive}
              onChange={(event) => onChange({ discountActive: event.target.checked })}
            />
            <span>Active discount</span>
          </label>
          {item.discountActive && (
            <div className={styles.row}>
              <label>
                <span>Discount Name</span>
                <input
                  value={item.discountName}
                  onChange={(event) => onChange({ discountName: event.target.value })}
                  maxLength={100}
                  required
                />
              </label>
              <label>
                <span>Discount %</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  value={item.discountPercent}
                  onChange={(event) => onChange({ discountPercent: event.target.value })}
                  required
                />
              </label>
            </div>
          )}
          <div className={styles.tools}>
            <button type="button" className={styles.outline} disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${name} up`}>
              ↑
            </button>
            <button
              type="button"
              className={styles.outline}
              disabled={index === count - 1}
              onClick={() => onMove(1)}
              aria-label={`Move ${name} down`}
            >
              ↓
            </button>
            <button type="button" className={styles.danger} disabled={count === 1} onClick={onRemove}>
              Remove
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

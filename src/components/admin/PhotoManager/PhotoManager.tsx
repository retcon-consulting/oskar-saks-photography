"use client";

import { memo, useCallback, useEffect, useId, useRef, useState, useTransition, type ChangeEvent } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addPhotoAction,
  createCategoryAction,
  deleteCategoryAction,
  deletePhotoAction,
  deletePhotosAction,
  movePhotosAction,
  reorderPhotosAction,
  signUploadAction,
  updateCategoryAction,
  updatePhotoAction,
  type ActionResult,
} from "@/app/admin/actions";
import { MAX_MEDIA_BYTES, MEDIA_ACCEPT } from "@/lib/media";
import styles from "./photoManager.module.scss";

type AdminPhoto = {
  id: string;
  url: string;
  alt: string;
  title: string;
  cover: boolean;
};

type AdminCategory = {
  slug: string;
  label: string;
  heading: string;
  tagline: string;
  description: string;
  // The "Unassigned photos" holding gallery: no page of its own, just somewhere to sort photos out from.
  hidden: boolean;
  photos: AdminPhoto[];
};

export default function PhotoManager({ categories }: { categories: AdminCategory[] }) {
  const [active, setActive] = useState(categories[0]?.slug ?? "");
  // Lives here, not in the grid, because the grid remounts when its photos change (e.g. after a delete).
  const [notice, setNotice] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const category = categories.find((item) => item.slug === active) ?? categories[0];
  if (!category) return null;

  const galleries = categories.filter((item) => !item.hidden);
  const unassigned = categories.find((item) => item.hidden);

  const select = (slug: string) => {
    setActive(slug);
    setNotice(null);
    setAdding(false);
  };

  return (
    <div className={styles.manager}>
      <div className={styles.tabs} role="tablist" aria-label="Galleries">
        {galleries.map((item) => (
          <button
            key={item.slug}
            type="button"
            role="tab"
            aria-selected={item.slug === category.slug && !adding}
            className={item.slug === category.slug && !adding ? styles.tabActive : styles.tab}
            onClick={() => select(item.slug)}
          >
            {item.label} <span>{item.photos.length}</span>
          </button>
        ))}
        <button
          type="button"
          className={`${styles.tab} ${styles.tabAdd}`}
          aria-expanded={adding}
          onClick={() => {
            setAdding((open) => !open);
            setNotice(null);
          }}
        >
          + Add new
        </button>
        {unassigned && (
          <button
            type="button"
            role="tab"
            aria-selected={unassigned.slug === category.slug && !adding}
            className={`${styles.tab} ${styles.tabUnassigned}`}
            onClick={() => select(unassigned.slug)}
          >
            {unassigned.label} <span>{unassigned.photos.length}</span>
          </button>
        )}
      </div>

      {adding && (
        <AddGallery
          onCancel={() => setAdding(false)}
          onCreated={(slug) => {
            select(slug);
            setNotice("Gallery created. Add its copy and photos below; it shows on the site once it has a photo.");
          }}
        />
      )}

      {category.hidden ? (
        <p className={styles.hint}>
          These photos came from galleries that were deleted. They aren&rsquo;t shown on the site. Tick the photos you want, then
          move them into a gallery or delete them.
        </p>
      ) : (
        <>
          <CopyEditor
            key={`copy-${category.slug}`}
            category={category}
            canDelete={galleries.length > 1}
            onDeleted={(moved) => {
              const next = galleries.find((item) => item.slug !== category.slug);
              if (next) setActive(next.slug);
              setNotice(
                moved > 0
                  ? `Gallery deleted. Its ${moved} ${moved === 1 ? "photo is" : "photos are"} now under Unassigned photos.`
                  : "Gallery deleted.",
              );
            }}
          />
          <Uploader key={`up-${category.slug}`} slug={category.slug} />
          <p className={styles.hint}>
            <strong>Drag a photo by its image</strong> to reorder; the others shift to make room. The gallery shows photos in
            three columns at their natural shape, uncropped, placing each one in the shortest column, so the order reads
            left to right. The <strong>cover</strong> is the photo shown on the gallery cards. Tick the box on a photo to select
            several (shift-click selects a range), then move or delete them together.
          </p>
        </>
      )}
      {notice && <p className={styles.ok}>{notice}</p>}
      {category.photos.length === 0 ? (
        <p className={styles.empty}>
          {category.hidden ? "Nothing left to sort out." : "No photos in this gallery yet. Upload some above."}
        </p>
      ) : (
        <SortableGrid
          key={`${category.slug}:${category.photos.map((photo) => `${photo.id}.${photo.alt}.${photo.title}.${photo.cover}`).join("|")}`}
          slug={category.slug}
          photos={category.photos}
          moveTargets={galleries.filter((item) => item.slug !== category.slug).map(({ slug, label }) => ({ slug, label }))}
          onNotice={setNotice}
        />
      )}
    </div>
  );
}

// Names a new gallery. Its address (/gallery/<name>) is made from the name and stays the same if the name is changed later.
function AddGallery({ onCreated, onCancel }: { onCreated: (slug: string) => void; onCancel: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => input.current?.focus(), []);

  return (
    <form
      className={styles.copy}
      action={(formData) =>
        startTransition(async () => {
          setError(null);
          const result = await createCategoryAction({ label: String(formData.get("label") ?? "") });
          if (result.ok) onCreated(result.slug);
          else setError(result.error);
        })
      }
    >
      <h2>New gallery</h2>
      <label>
        <span>
          Name <span className={styles.labelHint}>(shown on its tab, in the menu and on its card)</span>
        </span>
        <input ref={input} name="label" maxLength={40} required />
      </label>
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "Creating…" : "Create gallery"}
        </button>
        <button type="button" className={styles.outline} disabled={pending} onClick={onCancel}>
          Cancel
        </button>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

function useResult() {
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const report = (result: ActionResult, success = "Saved") =>
    setMessage(result.ok ? { text: success, error: false } : { text: result.error, error: true });
  return { message, report, setMessage };
}

function CopyEditor({
  category,
  canDelete,
  onDeleted,
}: {
  category: AdminCategory;
  // False when this is the only gallery: the site always keeps at least one.
  canDelete: boolean;
  onDeleted: (moved: number) => void;
}) {
  const [pending, startTransition] = useTransition();
  const { message, report } = useResult();
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function confirmDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deleteCategoryAction(category.slug);
      if (result.ok) {
        setConfirming(false);
        onDeleted(result.moved);
      } else {
        setDeleteError(result.error);
      }
    });
  }

  const count = category.photos.length;

  return (
    <>
    <form
      className={styles.copy}
      action={(formData) =>
        startTransition(async () => {
          report(
            await updateCategoryAction({
              slug: category.slug,
              label: String(formData.get("label") ?? ""),
              heading: String(formData.get("heading") ?? ""),
              tagline: String(formData.get("tagline") ?? ""),
              description: String(formData.get("description") ?? ""),
            }),
            "Copy saved",
          );
        })
      }
    >
      <h2>Page copy</h2>
      <label>
        <span>
          Name <span className={styles.labelHint}>(shown on its tab, in the menu and on its card)</span>
        </span>
        <input name="label" defaultValue={category.label} maxLength={40} required />
      </label>
      <label>
        <span>Heading</span>
        <input name="heading" defaultValue={category.heading} maxLength={120} required />
      </label>
      <label>
        <span>
          Tagline <span className={styles.labelHint}>(the short line under the gallery name on its card)</span>
        </span>
        <input name="tagline" defaultValue={category.tagline} maxLength={160} required />
      </label>
      <label>
        <span>Description</span>
        <textarea name="description" defaultValue={category.description} rows={4} maxLength={1200} required />
      </label>
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={pending}>
          {pending ? "Saving…" : "Save copy"}
        </button>
        <button
          type="button"
          className={styles.danger}
          disabled={pending || !canDelete}
          title={canDelete ? undefined : "There must always be at least one gallery"}
          onClick={() => {
            setDeleteError(null);
            setConfirming(true);
          }}
        >
          Delete gallery
        </button>
        {message && <p className={message.error ? styles.error : styles.ok}>{message.text}</p>}
      </div>
      {!canDelete && <p className={styles.hint}>This is the only gallery, and the site always keeps at least one.</p>}
    </form>
    <DeleteDialog
      open={confirming}
      title={`Delete the ${category.label} gallery?`}
      text={
        count > 0
          ? `Its page is removed from the site. Its ${count} ${count === 1 ? "photo moves" : "photos move"} to Unassigned photos, where you can add ${count === 1 ? "it" : "them"} to another gallery or delete ${count === 1 ? "it" : "them"}.`
          : "Its page is removed from the site. It has no photos."
      }
      deleting={deleting}
      error={deleteError}
      onCancel={() => {
        if (deleting) return;
        setConfirming(false);
        setDeleteError(null);
      }}
      onConfirm={confirmDelete}
    />
    </>
  );
}

type UploadItem = { name: string; status: "uploading" | "done" | "error"; error?: string };

function Uploader({ slug }: { slug: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<UploadItem[]>([]);

  const update = (index: number, patch: Partial<UploadItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  async function uploadOne(file: File, index: number) {
    if (!MEDIA_ACCEPT.split(",").includes(file.type)) return update(index, { status: "error", error: "Use a JPG, PNG or WebP" });
    if (file.size > MAX_MEDIA_BYTES) return update(index, { status: "error", error: "Over 10 MB" });

    const signed = await signUploadAction(slug);
    if (!signed) return update(index, { status: "error", error: "Uploads are unavailable" });

    const body = new FormData();
    body.append("file", file);
    body.append("api_key", signed.apiKey);
    body.append("signature", signed.signature);
    for (const [key, value] of Object.entries(signed.params)) body.append(key, String(value));

    const response = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, { method: "POST", body });
    if (!response.ok) return update(index, { status: "error", error: "Upload to Cloudinary failed" });
    const uploaded: { public_id: string } = await response.json();

    const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || "Photograph";
    const result = await addPhotoAction({ category: slug, publicId: uploaded.public_id, alt });
    update(index, result.ok ? { status: "done" } : { status: "error", error: result.error });
  }

  async function onChange(files: FileList | null) {
    if (!files || files.length === 0) return;
    const list = Array.from(files);
    setItems(list.map((file) => ({ name: file.name, status: "uploading" })));
    for (const [index, file] of list.entries()) {
      try {
        await uploadOne(file, index);
      } catch {
        update(index, { status: "error", error: "Something went wrong" });
      }
    }
    if (input.current) input.current.value = "";
  }

  return (
    <section className={styles.upload}>
      <h2>Add photos</h2>
      <input ref={input} type="file" accept={MEDIA_ACCEPT} multiple onChange={(event) => onChange(event.target.files)} />
      <p className={styles.hint}>JPG, PNG or WebP, up to 10 MB each. New photos are added to the end; edit the alt text afterwards.</p>
      {items.length > 0 && (
        <ul className={styles.uploads}>
          {items.map((item, index) => (
            <li key={`${item.name}-${index}`} data-status={item.status}>
              {item.name} — {item.status === "uploading" ? "uploading…" : item.status === "done" ? "added" : item.error}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type SortableGridProps = {
  slug: string;
  photos: AdminPhoto[];
  // The other public galleries a selection can be moved into.
  moveTargets: { slug: string; label: string }[];
  onNotice: (message: string | null) => void;
};

function SortableGrid({ slug, photos, moveTargets, onNotice }: SortableGridProps) {
  const [items, setItems] = useState(photos);
  const [moveTo, setMoveTo] = useState(moveTargets[0]?.slug ?? "");
  const [moving, startMove] = useTransition();
  const [moveError, setMoveError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastToggled = useRef<string | null>(null);
  // Read by `toggle`, so it can keep one identity across renders and let the memoised cards skip re-rendering.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const [confirming, setConfirming] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Mouse drags start after a few pixels (so clicks still work); touch needs a short press so scrolling isn't hijacked.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((photo) => photo.id === active.id);
    const to = items.findIndex((photo) => photo.id === over.id);
    if (from === -1 || to === -1) return;

    const previous = items;
    const next = arrayMove(items, from, to);
    setItems(next);
    setError(null);
    startTransition(async () => {
      const result = await reorderPhotosAction({ category: slug, ids: next.map((photo) => photo.id) });
      if (!result.ok) {
        setItems(previous);
        setError(result.error);
      }
    });
  }

  // Shift-clicking selects (or clears) everything between the last ticked photo and this one.
  const toggle = useCallback((id: string, shift: boolean) => {
    const items = itemsRef.current;
    const anchor = lastToggled.current;
    lastToggled.current = id;
    setSelected((current) => {
      const next = new Set(current);
      const from = anchor ? items.findIndex((photo) => photo.id === anchor) : -1;
      const to = items.findIndex((photo) => photo.id === id);
      if (shift && from !== -1 && to !== -1) {
        const select = !current.has(id);
        for (let index = Math.min(from, to); index <= Math.max(from, to); index += 1) {
          if (select) next.add(items[index].id);
          else next.delete(items[index].id);
        }
      } else if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  function moveSelected() {
    setMoveError(null);
    startMove(async () => {
      const result = await movePhotosAction({ ids: [...selected], to: moveTo });
      if (!result.ok) {
        setMoveError(result.error);
        return;
      }
      setSelected(new Set());
      const target = moveTargets.find((item) => item.slug === moveTo);
      onNotice(`Moved ${result.moved} ${result.moved === 1 ? "photo" : "photos"} to ${target?.label ?? "the gallery"}.`);
    });
  }

  function confirmBulkDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deletePhotosAction([...selected]);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      setConfirming(false);
      setSelected(new Set());
      const noun = result.deleted === 1 ? "photo" : "photos";
      onNotice(
        result.failedFiles > 0
          ? `Deleted ${result.deleted} ${noun}. ${result.failedFiles} file(s) couldn\u2019t be removed from Cloudinary; they no longer appear on the site but may need deleting there.`
          : `Deleted ${result.deleted} ${noun}.`,
      );
    });
  }

  return (
    <>
      {error && <p className={styles.error}>{error}</p>}
      {/* A fixed id keeps the library's accessibility ids identical on the server and in the browser. */}
      <DndContext id={`photos-${slug}`} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={items.map((photo) => photo.id)} strategy={rectSortingStrategy}>
          <ul className={styles.grid}>
            {items.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                selected={selected.has(photo.id)}
                onToggle={toggle}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {selected.size > 0 && (
        <div className={styles.selectionBar} role="region" aria-label="Selected photos">
          <span className={styles.selectionCount}>{selected.size} selected</span>
          <button type="button" className={styles.outline} onClick={() => setSelected(new Set(items.map((photo) => photo.id)))}>
            Select all
          </button>
          <button type="button" className={styles.outline} onClick={() => setSelected(new Set())}>
            Clear
          </button>
          {moveTargets.length > 0 && (
            <>
              <select
                className={styles.moveSelect}
                aria-label="Move the selected photos to"
                value={moveTo}
                disabled={moving}
                onChange={(event) => setMoveTo(event.target.value)}
              >
                {moveTargets.map((item) => (
                  <option key={item.slug} value={item.slug}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.outline} disabled={moving || !moveTo} onClick={moveSelected}>
                {moving ? "Moving…" : "Move"}
              </button>
            </>
          )}
          {moveError && (
            <span className={styles.error} role="alert">
              {moveError}
            </span>
          )}
          <button
            type="button"
            className={styles.dangerSolid}
            onClick={() => {
              setDeleteError(null);
              setConfirming(true);
            }}
          >
            Delete {selected.size}
          </button>
        </div>
      )}
      <DeleteDialog
        open={confirming}
        title={`Delete ${selected.size} ${selected.size === 1 ? "photo" : "photos"}?`}
        text="This permanently removes them from the gallery and from Cloudinary. It can’t be undone."
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          if (deleting) return;
          setConfirming(false);
          setDeleteError(null);
        }}
        onConfirm={confirmBulkDelete}
      />
    </>
  );
}

// Memoised: with hundreds of photos, ticking one or typing elsewhere shouldn't re-render every card.
const PhotoCard = memo(function PhotoCard({
  photo,
  selected,
  onToggle,
}: {
  photo: AdminPhoto;
  selected: boolean;
  onToggle: (id: string, shift: boolean) => void;
}) {
  const [pending, startTransition] = useTransition();
  const { message, report } = useResult();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: photo.id });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  function confirmDelete() {
    setDeleteError(null);
    startDelete(async () => {
      const result = await deletePhotoAction(photo.id);
      if (result.ok) setConfirmingDelete(false);
      else setDeleteError(result.error);
    });
  }

  // Checkboxes save as soon as they change, so there's no separate step to forget.
  const saveNow = (event: ChangeEvent<HTMLInputElement>) => event.currentTarget.form?.requestSubmit();

  return (
    <li
      ref={setNodeRef}
      className={`${styles.card} ${isDragging ? styles.dragging : ""} ${selected ? styles.selected : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <label className={styles.select}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => undefined}
          onClick={(event) => onToggle(photo.id, event.shiftKey)}
          aria-label="Select photo"
        />
      </label>
      <div className={styles.handle} {...attributes} {...listeners} aria-label="Drag to reorder">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin previews use Cloudinary resizing directly */}
        <img
          src={photo.url.replace("/upload/", "/upload/f_auto,q_auto,c_limit,w_600/")}
          alt={photo.alt}
          loading="lazy"
          draggable={false}
        />
        <span className={styles.moveIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />
          </svg>
        </span>
      </div>
      <form
        action={(formData) =>
          startTransition(async () => {
            report(
              await updatePhotoAction({
                id: photo.id,
                alt: String(formData.get("alt") ?? ""),
                title: String(formData.get("title") ?? ""),
                cover: formData.get("cover") === "on",
              }),
            );
          })
        }
      >
        <label>
          <span>Alt text</span>
          <textarea name="alt" defaultValue={photo.alt} rows={3} maxLength={300} required />
        </label>
        <label>
          <span>Title (optional)</span>
          <input name="title" defaultValue={photo.title} maxLength={120} />
        </label>
        <div className={styles.checks}>
          <label className={styles.check}>
            <input name="cover" type="checkbox" defaultChecked={photo.cover} onChange={saveNow} />
            <span>Cover</span>
          </label>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.primary} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className={styles.danger}
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        </div>
        {message && <p className={message.error ? styles.error : styles.ok}>{message.text}</p>}
      </form>
      <DeleteDialog
        open={confirmingDelete}
        title="Delete this photo?"
        text="This permanently removes it from the gallery and from Cloudinary. It can’t be undone."
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          if (deleting) return;
          setConfirmingDelete(false);
          setDeleteError(null);
        }}
        onConfirm={confirmDelete}
      />
    </li>
  );
});

type DeleteDialogProps = {
  open: boolean;
  title: string;
  text: string;
  deleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

function DeleteDialog({ open, title, text, deleting, error, onCancel, onConfirm }: DeleteDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onClose={onCancel}
      onCancel={(event) => {
        if (deleting) event.preventDefault();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <h2 id={titleId} className={styles.dialogTitle}>
        {title}
      </h2>
      <p className={styles.dialogText}>{text}</p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.dialogActions}>
        <button type="button" className={styles.outline} disabled={deleting} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.dangerSolid} disabled={deleting} onClick={onConfirm}>
          {deleting ? "Deleting…" : "Delete"}
        </button>
      </div>
    </dialog>
  );
}

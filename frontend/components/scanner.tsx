"use client";

import Link from "next/link";
import { ArrowRight, CloudUpload, ScanLine, X } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { saveObservation } from "@/lib/farm-actions";
import {
  MAX_PHOTOS,
  photoExtensions,
  type FarmFeedback,
  type SavedField,
} from "@/lib/farm-types";
import { validatePhoto } from "@/lib/farm-validation";
import { CropPhoto, EmptyState, PageHeader, SectionTitle } from "./shared";

interface Preview {
  id: string;
  file: File;
  url: string;
}

export function Scanner({
  fields,
  initialField,
}: {
  fields: SavedField[];
  initialField?: string;
}) {
  const [field, setField] = useState(
    fields.find(({ id }) => id === initialField)?.id ?? fields[0]?.id ?? "",
  );
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [photos, setPhotos] = useState<Preview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const request = useRef<string | null>(null);
  const urls = useRef(new Set<string>());

  const [feedback, submit, pending] = useActionState(
    async (previous: FarmFeedback, form: FormData) => {
      request.current ??= crypto.randomUUID();
      form.set("request", request.current);
      for (const photo of photos) form.append("photos", photo.file);
      return await saveObservation(previous, form);
    },
    {},
  );
  useEffect(() => {
    const active = urls.current;
    return () => {
      active.forEach((url) => URL.revokeObjectURL(url));
      active.clear();
    };
  }, []);

  function add(files: FileList) {
    const added: Preview[] = [];
    const rejected: string[] = [];
    for (const file of files) {
      const error = validatePhoto(file);
      if (error) {
        rejected.push(`${file.name}: ${error}`);
        continue;
      }
      if (photos.length + added.length >= MAX_PHOTOS) {
        rejected.push("Choose up to three photos per observation.");
        break;
      }
      const url = URL.createObjectURL(file);
      urls.current.add(url);
      added.push({ id: crypto.randomUUID(), file, url });
    }
    if (added.length) request.current = null;
    setPhotos([...photos, ...added]);
    setErrors(rejected);
  }

  function remove(photo: Preview) {
    URL.revokeObjectURL(photo.url);
    urls.current.delete(photo.url);
    request.current = null;
    setPhotos(photos.filter(({ id }) => id !== photo.id));
  }

  return (
    <>
      <PageHeader
        title="Crop Scanner"
        description="Save dated crop photos and notes to your private field history."
        icon={ScanLine}
      />
      {!fields.length ? (
        <section className="card panel">
          <EmptyState title="No active fields">
            Add or restore a field before saving photos.
          </EmptyState>
          <Link className="button" href="/fields">
            Go to My Fields <ArrowRight size={17} />
          </Link>
        </section>
      ) : feedback.id ? (
        <section className="card panel stack">
          <h2>Observation saved</h2>
          <p className="insight" role="status">
            {feedback.message}
          </p>
          <Link
            className="text-link"
            href={`/fields/${field}?tab=observations#${feedback.id}`}
          >
            View saved observation <ArrowRight size={16} />
          </Link>
          <Link className="text-link" href={"/crop-doctor?observation=" + feedback.id}>
            Open in Crop Doctor <ArrowRight size={16} />
          </Link>
          <button
            className="button button-outline"
            onClick={() => window.location.reload()}
          >
            Save another observation
          </button>
        </section>
      ) : (
        <form action={submit} className="stack">
          <ol className="card panel stepper" aria-label="Observation workflow">
            <li aria-current={!date ? "step" : undefined}>
              <span>1</span> Select field
            </li>
            <li aria-current={date && !photos.length ? "step" : undefined}>
              <span>2</span> Upload photos
            </li>
            <li aria-current={photos.length ? "step" : undefined}>
              <span>3</span> Save observation
            </li>
          </ol>
          <div className="grid-two">
            <section className="card panel stack">
              <SectionTitle title="Observation details" />
              <label>
                Field
                <select
                  name="field"
                  aria-label="Field"
                  value={field}
                  disabled={pending}
                  onChange={(event) => {
                    request.current = null;
                    setField(event.target.value);
                  }}
                >
                  {fields.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.crop_type}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Observation date
                <input
                  name="date"
                  type="date"
                  required
                  value={date}
                  disabled={pending}
                  onChange={(event) => {
                    request.current = null;
                    setDate(event.target.value);
                  }}
                />
              </label>
              <label>
                Farmer notes
                <textarea
                  name="notes"
                  maxLength={2000}
                  value={notes}
                  disabled={pending}
                  onChange={(event) => {
                    request.current = null;
                    setNotes(event.target.value);
                  }}
                />
              </label>
            </section>
            <section className="card panel stack">
              <SectionTitle title={`Crop photographs (${photos.length})`} />
              <input
                ref={picker}
                type="file"
                accept={Object.keys(photoExtensions).join(",")}
                multiple
                hidden
                onChange={(event) => {
                  if (event.target.files) add(event.target.files);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className={`dropzone ${dragging ? "dragging" : ""}`}
                disabled={pending}
                onClick={() => picker.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!pending) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  if (!pending) add(event.dataTransfer.files);
                }}
              >
                <CloudUpload size={32} />
                <strong>Drop photos or browse files</strong>
                <small>JPEG, PNG, WebP · Up to three photos, 10 MB each</small>
              </button>
              {errors.length > 0 && (
                <p className="message-error" role="alert">
                  {errors.join(" ")}
                </p>
              )}
              {!!photos.length && (
                <div className="grid-three">
                  {photos.map((photo) => (
                    <div className="file-tile" key={photo.id}>
                      <CropPhoto src={photo.url} alt={photo.file.name} />
                      <button
                        type="button"
                        className="icon-button"
                        disabled={pending}
                        aria-label={`Remove ${photo.file.name}`}
                        onClick={() => remove(photo)}
                      >
                        <X size={17} />
                      </button>
                      <small>{photo.file.name}</small>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
          {feedback.error && (
            <p className="message-error" role="alert">
              {feedback.error}
            </p>
          )}
          <div className="actions">
            <button
              className="button"
              disabled={pending || !photos.length || !date}
            >
              {pending ? "Saving photos…" : "Save observation"}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

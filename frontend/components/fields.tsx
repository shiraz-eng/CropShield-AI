"use client";

import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  MapPin,
  Pencil,
  Plus,
  Sprout,
} from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { formatDate, intervalDays } from "@/lib/data";
import { archiveField, saveField } from "@/lib/farm-actions";
import type {
  FarmFeedback,
  SavedField,
  SavedObservation,
} from "@/lib/farm-types";
import { CropPhoto, EmptyState, PageHeader, SectionTitle } from "./shared";
import { Dialog } from "./ui/dialog";
import { PhotoEvidence } from "./crop-evidence";

function FieldForm({
  field,
  onSaved,
}: {
  field?: SavedField;
  onSaved: (message: string) => void;
}) {
  const [state, submit, pending] = useActionState(
    async (previous: FarmFeedback, form: FormData) => {
      const result = await saveField(field?.id ?? null, previous, form);
      if (result.message) onSaved(result.message);
      return result;
    },
    {},
  );
  return (
    <form action={submit} className="stack">
      <label>
        Field name
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={field?.name}
        />
      </label>
      <div className="grid-two">
        <label>
          Crop type
          <input
            name="crop_type"
            required
            maxLength={60}
            defaultValue={field?.crop_type ?? "Wheat"}
          />
        </label>
        <label>
          Variety
          <input
            name="crop_variety"
            maxLength={100}
            defaultValue={field?.crop_variety}
          />
        </label>
        <label>
          Planting date
          <input
            name="planting_date"
            type="date"
            required
            defaultValue={field?.planting_date}
          />
        </label>
        <label>
          Area
          <input
            name="area"
            type="number"
            min="0.01"
            max="1000000000"
            step="0.01"
            required
            defaultValue={field?.area}
          />
        </label>
        <label>
          Area unit
          <select
            name="area_unit"
            aria-label="Area unit"
            defaultValue={field?.area_unit ?? "acres"}
          >
            <option value="acres">Acres</option>
            <option value="hectares">Hectares</option>
          </select>
        </label>
        <label>
          Country
          <input
            name="country"
            required
            maxLength={100}
            defaultValue={field?.country}
          />
        </label>
        <label>
          Region
          <input name="region" maxLength={100} defaultValue={field?.region} />
        </label>
        <label>
          District
          <input
            name="district"
            maxLength={100}
            defaultValue={field?.district}
          />
        </label>
        <label>
          Latitude
          <input
            name="latitude"
            type="number"
            min="-90"
            max="90"
            step="any"
            defaultValue={field?.latitude ?? undefined}
          />
        </label>
        <label>
          Longitude
          <input
            name="longitude"
            type="number"
            min="-180"
            max="180"
            step="any"
            defaultValue={field?.longitude ?? undefined}
          />
        </label>
      </div>
      <label>
        Notes
        <textarea name="notes" maxLength={2000} defaultValue={field?.notes} />
      </label>
      {state.error && (
        <p className="message-error" role="alert">
          {state.error}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? "Saving…" : "Save field"}
      </button>
    </form>
  );
}

function FieldEditor({
  field,
  onSaved,
}: {
  field?: SavedField;
  onSaved: (message: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={field ? "Edit field" : "Add field"}
      description="Enter the crop, planting date, and location."
      trigger={
        <button className={field ? "button button-outline" : "button"}>
          {field ? <Pencil size={16} /> : <Plus size={16} />}
          {field ? "Edit field" : "Add field"}
        </button>
      }
    >
      <FieldForm
        field={field}
        onSaved={(message) => {
          setOpen(false);
          onSaved(message);
        }}
      />
    </Dialog>
  );
}

export function SavedFieldCard({
  field,
  image,
  lastDate,
}: {
  field: SavedField;
  image?: string | null;
  lastDate?: string;
}) {
  return (
    <article className="card field-card">
      <div className="field-photo">
        {image ? (
          <CropPhoto src={image} alt={`Saved photo of ${field.name}`} />
        ) : (
          <div className="crop-photo field-placeholder">
            <Sprout size={28} />
          </div>
        )}
        <span className="photo-chip">{field.crop_type}</span>
      </div>
      <div className="field-info">
        <h3>{field.name}</h3>
        <p>
          <MapPin size={14} />
          {[field.district, field.region, field.country]
            .filter(Boolean)
            .join(", ")}{" "}
          · {field.area} {field.area_unit}
        </p>
        <p>
          <CalendarDays size={14} />
          Planted {formatDate(field.planting_date)}
        </p>
        {lastDate && <p>Last observed {formatDate(lastDate)}</p>}
        <div className="field-bottom">
          <span className="badge">
            {field.is_archived ? "Archived" : "Active"}
          </span>
          <Link
            href={`/fields/${field.id}`}
            className="round-link"
            aria-label={`View details for ${field.name}`}
          >
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function Fields({ fields }: { fields: SavedField[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("active");
  const [message, setMessage] = useState("");
  const results = fields.filter(
    (field) =>
      (filter === "all" || field.is_archived === (filter === "archived")) &&
      [
        field.name,
        field.crop_type,
        field.crop_variety,
        field.country,
        field.region,
        field.district,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="My Fields"
        description="Manage your fields and explore their observation history."
        icon={Sprout}
        action={<FieldEditor onSaved={setMessage} />}
      />
      {message && (
        <p className="insight" role="status">
          {message}
        </p>
      )}
      <section className="card panel filter-bar" aria-label="Field filters">
        <label>
          Search fields
          <input
            type="search"
            placeholder="Field name, crop, or location"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Status
          <select
            aria-label="Status"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="active">Active fields</option>
            <option value="archived">Archived fields</option>
            <option value="all">All fields</option>
          </select>
        </label>
      </section>
      {results.length ? (
        <div className="fields-grid all-fields">
          {results.map((field) => (
            <SavedFieldCard key={field.id} field={field} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={fields.length ? "No matching fields" : "Add your first field"}
        >
          {fields.length
            ? "Change the search or status filter."
            : "Enter planting and location details to begin recording observations."}
        </EmptyState>
      )}
    </>
  );
}

function ObservationTimeline({
  observations,
}: {
  observations: SavedObservation[];
}) {
  if (!observations.length)
    return (
      <EmptyState title="No observations yet">
        Save photos and notes in Crop Scanner to start the timeline.
      </EmptyState>
    );
  return (
    <ol className="stack dated-observations">
      {observations.map((entry, index) => {
        const previous = observations[index + 1];
        return (
          <li key={entry.id} id={entry.id} className="card panel stack">
            <div>
              <h3>
                <time dateTime={entry.observed_at}>
                  {formatDate(entry.observed_at)}
                </time>
              </h3>
              {previous && (
                <small>
                  {intervalDays(previous.observed_at, entry.observed_at)} days
                  since the previous observation
                </small>
              )}
            </div>
            {entry.notes && <p className="farmer-notes">{entry.notes}</p>}
            <div className="grid-three">
              {entry.images.map((image) => (
                <figure key={image.id} className="observation">
                  {image.url ? (
                    <a href={image.url} target="_blank" rel="noreferrer">
                      <CropPhoto
                        src={image.url}
                        alt={image.original_filename}
                      />
                    </a>
                  ) : (
                    <p className="panel">
                      Photo unavailable. Refresh to retry.
                    </p>
                  )}
                  <figcaption>
                    {image.original_filename} ·{" "}
                    {Math.ceil(image.file_size / 1024)} KB
                  </figcaption>
                  <PhotoEvidence quality={image.photo_quality} />
                </figure>
              ))}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

const tabs = [
  "Overview",
  "Timeline",
  "Observations",
  "Comparisons",
  "Weather",
] as const;
export function FieldDetail({
  field,
  observations,
  initialTab,
}: {
  field: SavedField;
  observations: SavedObservation[];
  initialTab?: string;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]>(
    initialTab === "timeline"
      ? "Timeline"
      : initialTab === "observations"
        ? "Observations"
        : "Overview",
  );
  const [feedback, setFeedback] = useState<FarmFeedback>({});
  const [pending, start] = useTransition();
  const cover = observations[0]?.images.find((image) => image.url)?.url;
  return (
    <>
      <PageHeader
        title={field.name}
        description={`${field.crop_type} · ${field.area} ${field.area_unit} · ${field.country}`}
        icon={Sprout}
        action={
          <div className="actions">
            <FieldEditor
              field={field}
              onSaved={(message) => setFeedback({ message })}
            />
            <button
              disabled={pending}
              className="button button-outline"
              onClick={() =>
                start(async () =>
                  setFeedback(await archiveField(field.id, !field.is_archived)),
                )
              }
            >
              <Archive size={16} />
              {pending
                ? "Updating…"
                : field.is_archived
                  ? "Restore field"
                  : "Archive field"}
            </button>
          </div>
        }
      />
      {feedback.error && (
        <p className="message-error" role="alert">
          {feedback.error}
        </p>
      )}
      {feedback.message && (
        <p className="insight" role="status">
          {feedback.message}
        </p>
      )}
      {field.is_archived && (
        <p className="message-caution">
          This field is archived. Existing observations remain available.
        </p>
      )}
      {cover && (
        <div className="card field-cover">
          <CropPhoto src={cover} alt={`Latest photo of ${field.name}`} />
        </div>
      )}
      <nav className="tabs" aria-label="Field views">
        {tabs.map((item) => (
          <button
            key={item}
            className="tab"
            aria-pressed={tab === item}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === "Overview" && (
        <section className="card panel stack">
          <SectionTitle title="Field details" />
          <div className="grid-three">
            <div className="metric">
              <small>Planting date</small>
              <strong>{formatDate(field.planting_date)}</strong>
            </div>
            <div className="metric">
              <small>Latest observation</small>
              <strong>
                {observations.length
                  ? formatDate(observations[0].observed_at)
                  : "No observations"}
              </strong>
            </div>
            <div className="metric">
              <small>Observations</small>
              <strong>{observations.length}</strong>
            </div>
            <div className="metric">
              <small>Crop variety</small>
              <strong>{field.crop_variety || "Unspecified"}</strong>
            </div>
            <div className="metric">
              <small>Location</small>
              <strong>
                {[field.district, field.region, field.country]
                  .filter(Boolean)
                  .join(", ")}
              </strong>
            </div>
            <div className="metric">
              <small>Coordinates</small>
              <strong>
                {field.latitude === null
                  ? "Unspecified"
                  : `${field.latitude}, ${field.longitude}`}
              </strong>
            </div>
          </div>
          {field.notes && <p className="farmer-notes">{field.notes}</p>}
          {!field.is_archived && (
            <div className="actions">
              <Link className="button" href={`/scanner?field=${field.id}`}>
                Save an observation
              </Link>
            </div>
          )}
        </section>
      )}
      {(tab === "Timeline" || tab === "Observations") && (
        <ObservationTimeline observations={observations} />
      )}
      {tab === "Comparisons" && (
        <EmptyState title="Field comparisons are unavailable">
          The comparison page currently uses demonstration data.
        </EmptyState>
      )}
      {tab === "Weather" && (
        <EmptyState title="Field weather is unavailable">
          Weather Guardian currently uses a sample forecast.
        </EmptyState>
      )}
    </>
  );
}

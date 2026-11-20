"use client";

import Link from "next/link";
import { ArrowLeftRight, CloudSun, Pencil, Plus, Sprout } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  fieldObservations,
  currentConditions,
  formatDate,
  photos,
  stages,
  type Field,
} from "@/lib/data";
import { useDemo } from "@/lib/state";
import { convertTemp, GrowthTimelineChart } from "./charts";
import {
  CropPhoto,
  CropStageBadge,
  EmptyState,
  FieldCard,
  MockDataNotice,
  ObservationCard,
  PageHeader,
  SectionTitle,
} from "./shared";
import { Dialog } from "./ui/dialog";

function FieldEditor({ field }: { field?: Field }) {
  const { setFields } = useDemo();
  const [open, setOpen] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name")).trim();
    const location = String(form.get("location")).trim();
    const acres = Number(form.get("acres"));
    if (!name || !location || !Number.isFinite(acres) || acres <= 0) return;
    const record: Field = {
      id: field?.id ?? crypto.randomUUID(),
      name,
      location,
      acres,
      crop: "Wheat",
      photo: field?.photo ?? photos.green,
    };
    setFields((items) =>
      field
        ? items.map((item) => (item.id === field.id ? record : item))
        : [...items, record],
    );
    setOpen(false);
  }
  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={field ? "Edit field" : "Add field"}
      description="Field details are kept for this app session."
      trigger={
        <button className={field ? "button button-outline" : "button"}>
          {field ? <Pencil size={17} /> : <Plus size={17} />}
          {field ? "Edit field" : "Add field"}
        </button>
      }
    >
      <form className="stack" onSubmit={submit}>
        <label>
          Field name
          <input
            name="name"
            required
            pattern=".*\S.*"
            maxLength={60}
            defaultValue={field?.name}
          />
        </label>
        <label>
          Location
          <input
            name="location"
            required
            pattern=".*\S.*"
            maxLength={60}
            defaultValue={field?.location}
          />
        </label>
        <label>
          Area (acres)
          <input
            name="acres"
            required
            type="number"
            min="0.01"
            max="100000"
            step="0.01"
            defaultValue={field?.acres}
          />
        </label>
        <button className="button" type="submit">
          Save field
        </button>
      </form>
    </Dialog>
  );
}

export function Fields() {
  const { fields } = useDemo();
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState("");
  const filtered = fields.filter(
    (field) =>
      `${field.name} ${field.location}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (!stage || fieldObservations(field.id).at(-1)?.stage === stage),
  );
  return (
    <>
      <PageHeader
        title="My Fields"
        description="Manage wheat fields and explore their observation history."
        icon={Sprout}
        action={<FieldEditor />}
      />
      <MockDataNotice>
        Sample fields and observations. Field edits last for this app session.
      </MockDataNotice>
      <section className="card panel filter-bar" aria-label="Field filters">
        <label>
          Search fields
          <input
            type="search"
            placeholder="Field name or location"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Growth stage
          <select
            aria-label="Growth stage"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            <option value="">All stages</option>
            {stages.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </section>
      {filtered.length ? (
        <div className="fields-grid all-fields">
          {filtered.map((field) => (
            <FieldCard key={field.id} field={field} />
          ))}
        </div>
      ) : (
        <EmptyState title="No matching fields">
          Try a different search or stage.
        </EmptyState>
      )}
    </>
  );
}

const fieldTabs = [
  "Overview",
  "Timeline",
  "Observations",
  "Comparisons",
  "Weather",
] as const;

export function FieldDetail({
  id,
  initialTab,
}: {
  id: string;
  initialTab?: string;
}) {
  const { fields, comparisons, user } = useDemo();
  const [tab, setTab] = useState<(typeof fieldTabs)[number]>(
    initialTab === "timeline" ? "Timeline" : "Overview",
  );
  const field = fields.find((item) => item.id === id);
  if (!field)
    return (
      <>
        <PageHeader
          title="Field unavailable"
          description="This field is missing from the current demo session."
          icon={Sprout}
        />
        <Link className="text-link" href="/fields">
          Back to fields
        </Link>
      </>
    );
  const history = fieldObservations(id);
  const last = history.at(-1);
  const saved = comparisons.filter((item) => item.fieldId === id);
  const forecast = currentConditions[id];
  const timeline = (
    <section className="card panel">
      <SectionTitle title="Crop timeline" />
      {history.length ? (
        <>
          <p>Illustrative categorical stages by observation date.</p>
          <GrowthTimelineChart observations={history} />
        </>
      ) : (
        <EmptyState title="No observations">
          A timeline needs dated observations.
        </EmptyState>
      )}
    </section>
  );
  const gallery = (
    <section className="card panel">
      <SectionTitle title="Observation gallery" />
      {history.length ? (
        <div className="grid-two">
          {history.map((item) => (
            <ObservationCard key={item.id} observation={item} />
          ))}
        </div>
      ) : (
        <EmptyState title="No photos yet">
          Use the Crop Scanner to try a local photo preview.
        </EmptyState>
      )}
    </section>
  );
  const comparisonHistory = (
    <section className="card panel">
      <SectionTitle
        title="Comparison history"
        href={`/comparison?field=${id}`}
        link="Compare"
      />
      {saved.length ? (
        saved.map((item) => (
          <div className="list-row" key={item.id}>
            <span className="soft-icon">
              <ArrowLeftRight size={17} />
            </span>
            <div className="grow">
              <strong>
                {formatDate(item.before.date)} → {formatDate(item.after.date)}
              </strong>
              <small>
                {item.before.stage} → {item.after.stage}
              </small>
            </div>
            <span className="badge">{item.days} days</span>
          </div>
        ))
      ) : (
        <EmptyState title="No saved comparisons">
          Save a sample comparison to include it here.
        </EmptyState>
      )}
    </section>
  );
  const weather = (
    <section className="card panel">
      <SectionTitle
        title="Field weather"
        href={`/weather?field=${id}`}
        link="Forecast"
      />
      {forecast ? (
        <div className="weather-now">
          <CloudSun size={36} />
          <div>
            <strong>
              {convertTemp(forecast.temperature, user.units)}°{user.units}
            </strong>
            <p>{forecast.condition} · Sample conditions</p>
          </div>
        </div>
      ) : (
        <p>A sample forecast is unavailable for this field.</p>
      )}
    </section>
  );
  return (
    <>
      <PageHeader
        title={field.name}
        description={`Wheat · ${field.acres} acres · ${field.location}`}
        icon={Sprout}
        action={<FieldEditor field={field} />}
      />
      <MockDataNotice>
        Illustrative field history. Changes last for this app session.
      </MockDataNotice>
      <div className="card field-cover">
        <CropPhoto src={field.photo} alt="Illustrative wheat crop" />
      </div>
      <nav className="tabs" aria-label="Field views">
        {fieldTabs.map((item) => (
          <button
            className="tab"
            key={item}
            aria-pressed={item === tab}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      {tab === "Overview" && (
        <>
          <section className="card panel grid-three">
            <div className="metric">
              <small>Latest stage</small>
              {last ? (
                <CropStageBadge stage={last.stage} />
              ) : (
                <strong>Awaiting observation</strong>
              )}
            </div>
            <div className="metric">
              <small>Observations</small>
              <strong>{history.length}</strong>
            </div>
            <div className="metric">
              <small>Saved comparisons</small>
              <strong>{saved.length}</strong>
            </div>
          </section>
          <div className="grid-two">
            {timeline}
            {weather}
          </div>
          <div className="grid-two">
            {gallery}
            {comparisonHistory}
          </div>
        </>
      )}
      {tab === "Timeline" && timeline}
      {tab === "Observations" && gallery}
      {tab === "Comparisons" && comparisonHistory}
      {tab === "Weather" && weather}
    </>
  );
}

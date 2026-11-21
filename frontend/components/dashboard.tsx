"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Camera,
  CloudSun,
  ScanLine,
  Sprout,
} from "lucide-react";
import { formatDate, photos } from "@/lib/data";
import type { SavedField, SavedObservation } from "@/lib/farm-types";
import { useDemo } from "@/lib/state";
import { SavedFieldCard } from "./fields";
import {
  CropPhoto,
  EmptyState,
  SectionTitle,
  StatCard,
} from "./shared";

export function Dashboard({
  fields,
  observations,
  stats,
}: {
  fields: SavedField[];
  observations: SavedObservation[];
  stats: { fields: number; active: number; observations: number; comparisons: number; dueReminders: number };
}) {
  const { user } = useDemo();
  return (
    <>
      <section className="hero">
        <CropPhoto src={photos.golden} alt="" className="hero-photo" priority />
        <div className="hero-copy">
          <h1>Welcome back, {user.name.split(" ")[0]}.</h1>
          <p>
            Review your fields, track visible changes, and plan your next
            inspection.
          </p>
          <div className="actions">
            <Link className="button" href="/scanner">
              <ScanLine size={17} />
              Scan Crop
            </Link>
            <Link className="button button-outline" href="/fields">
              <Sprout size={17} />
              My Fields
            </Link>
          </div>
        </div>
      </section>
      <section className="stats-grid" aria-label="Workspace totals">
        <StatCard
          label="Total fields"
          value={stats.fields}
          icon={Sprout}
          detail={`${stats.active} active`}
        />
        <StatCard
          label="Saved observations"
          value={stats.observations}
          icon={Camera}
          tone="mint"
          detail="Dated field records"
        />
        <StatCard
          label="Comparisons"
          value={stats.comparisons}
          icon={ArrowLeftRight}
          tone="blue"
          detail="Saved Crop Memory results"
        />
        <StatCard
          label="Reminders due"
          value={stats.dueReminders}
          icon={CloudSun}
          detail="Open, within 7 days"
        />
      </section>
      <div className="dashboard-grid">
        <div className="stack">
          <section className="card panel">
            <SectionTitle title="Recently updated fields" href="/fields" />
            {fields.length ? (
              <div className="fields-grid">
                {fields.slice(0, 4).map((field) => {
                  const last = observations.find(
                    (item) => item.field_id === field.id,
                  );
                  return (
                    <SavedFieldCard
                      field={field}
                      key={field.id}
                      image={last?.images.find((image) => image.url)?.url}
                      lastDate={last?.observed_at}
                    />
                  );
                })}
              </div>
            ) : (
              <EmptyState title="Your workspace is ready">
                Add your first field from My Fields.
              </EmptyState>
            )}
          </section>
          <section className="card panel">
            <SectionTitle
              title="Latest observations"
              href="/scanner"
              link="Save observation"
            />
            {observations.length ? (
              <div className="grid-three">
                {observations.slice(0, 6).map((item) => {
                  const image = item.images.find(({ url }) => url);
                  const field = fields.find(({ id }) => id === item.field_id);
                  return (
                    <article key={item.id} className="observation">
                      {image?.url && (
                        <CropPhoto
                          src={image.url}
                          alt={image.original_filename}
                        />
                      )}
                      <figcaption>
                        <Link
                          className="text-link"
                          href={`/fields/${item.field_id}?tab=observations#${item.id}`}
                        >
                          {field?.name ?? "Field observation"}
                        </Link>
                        <time dateTime={item.observed_at}>
                          {formatDate(item.observed_at)}
                        </time>
                      </figcaption>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No observations yet">
                Use Crop Scanner to save a dated photo and notes.
              </EmptyState>
            )}
          </section>
        </div>
        <div className="stack">
          <section className="card panel stack">
            <SectionTitle title="Crop Memory Engine" href="/comparison" link="Open" />
            <p>Compare two dated photo observations of the same field.</p>
          </section>
          <section className="card panel stack">
            <SectionTitle title="Weather Guardian" href="/weather" link="Open" />
            <p>Live Open-Meteo forecasts for fields with coordinates.</p>
          </section>
          <section className="card panel">
            <SectionTitle
              title="AI Farmer Assistant"
              href="/assistant"
              link="Open"
            />
          </section>
        </div>
      </div>
    </>
  );
}

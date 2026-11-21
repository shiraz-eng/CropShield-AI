"use client";

import Link from "next/link";
import { ArrowLeftRight, ArrowRight, Info } from "lucide-react";
import { useActionState, useState } from "react";
import samples from "@/lib/comparison-samples.json";
import {
  compareObservations,
  compareSamples,
  type ComparisonFeedback,
} from "@/lib/crop-analysis-action";
import type { ComparisonFindings } from "@/lib/ai-types";
import type { SavedField, SavedObservation } from "@/lib/farm-types";
import type { SavedComparison } from "@/lib/farm-data";
import { CropPhoto, EmptyState, PageHeader, SectionTitle } from "./shared";

type Mode = "illustrative" | "historical";
const label = (value: string) => value.replaceAll("_", " ");
const days = (a: string, b: string) =>
  Math.round(Math.abs(Date.parse(b) - Date.parse(a)) / 86_400_000);

function Findings({ result }: { result: ComparisonFindings }) {
  const lists = [
    ["Visible differences", result.observed_changes],
    ["Newly visible symptoms", result.newly_visible_symptoms],
    ["Symptoms no longer visible", result.no_longer_visible_symptoms],
    ["Possible concerns", result.possible_concerns],
    ["Uncertainty", result.uncertainty_notes],
    ["Suggested follow-up", result.suggested_followup],
  ] as const;
  return (
    <div className="stack" role="status" aria-live="polite">
      <SectionTitle title="Gemini comparison" />
      {result.interval_days != null && <p>Verified interval: {result.interval_days} days</p>}
      <p>
        Stage: {label(result.previous_growth_stage)} → {label(result.current_growth_stage)}
      </p>
      <p>Image comparability: {result.image_comparability}</p>
      {lists
        .filter(([, items]) => items.length)
        .map(([title, items]) => (
          <section key={title}>
            <SectionTitle title={title} />
            <ul>
              {items.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      <small>AI interpretation of visible evidence. Not a confirmed diagnosis.</small>
      <a className="button button-outline" href={`/api/reports/comparison/${result.comparison_id}`}>
        Download Growth Comparison PDF
      </a>
    </div>
  );
}

export function Comparison({
  fields,
  observations,
  comparisons,
}: {
  fields: SavedField[];
  observations: SavedObservation[];
  comparisons: SavedComparison[];
}) {
  const [mode, setMode] = useState<Mode>("historical");
  const withPhotos = observations.filter(({ images }) => images.length);
  const eligible = fields.filter(
    (field) => withPhotos.filter(({ field_id }) => field_id === field.id).length >= 2,
  );
  const [fieldId, setFieldId] = useState(eligible[0]?.id ?? "");
  const choices = withPhotos
    .filter(({ field_id }) => field_id === fieldId)
    .toSorted((a, b) => a.observed_at.localeCompare(b.observed_at));
  const [first, setFirst] = useState(choices[0]?.id ?? "");
  const [second, setSecond] = useState(choices.at(-1)?.id ?? "");
  const earlier = choices.find(({ id }) => id === first);
  const later = choices.find(({ id }) => id === second);
  const [historical, runHistorical, historicalPending] = useActionState(compareObservations, {});
  const [sample, runSample, samplePending] = useActionState(
    async (): Promise<ComparisonFeedback> => compareSamples(),
    {},
  );
  const fieldName = (id: string | null) => fields.find((field) => field.id === id)?.name ?? "Field";

  return (
    <>
      <PageHeader
        title="Crop Memory Engine"
        description="Compare dated wheat photographs from the same field."
        icon={ArrowLeftRight}
      />
      <nav className="tabs" aria-label="Comparison mode">
        <button className="tab" aria-pressed={mode === "historical"} onClick={() => setMode("historical")}>
          Verified historical
        </button>
        <button className="tab" aria-pressed={mode === "illustrative"} onClick={() => setMode("illustrative")}>
          Illustrative dataset
        </button>
      </nav>
      {mode === "historical" ? (
        eligible.length ? (
          <form action={runHistorical} className="card panel stack">
            <SectionTitle title="Choose two observations" />
            <label>
              Field
              <select
                aria-label="Field"
                value={fieldId}
                onChange={(event) => {
                  const next = withPhotos
                    .filter(({ field_id }) => field_id === event.target.value)
                    .toSorted((a, b) => a.observed_at.localeCompare(b.observed_at));
                  setFieldId(event.target.value);
                  setFirst(next[0]?.id ?? "");
                  setSecond(next.at(-1)?.id ?? "");
                }}
              >
                {eligible.map(({ id, name }) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid-two">
              {[
                { name: "first", text: "Earlier observation", value: first, set: setFirst, pick: earlier },
                { name: "second", text: "Later observation", value: second, set: setSecond, pick: later },
              ].map(({ name, text, value, set, pick }) => (
                <div className="stack" key={name}>
                  <label>
                    {text}
                    <select name={name} aria-label={text} value={value} onChange={(e) => set(e.target.value)}>
                      {choices.map(({ id, observed_at, images }) => (
                        <option key={id} value={id}>
                          {observed_at} · {images.length} photo(s)
                        </option>
                      ))}
                    </select>
                  </label>
                  {pick?.images[0]?.url && (
                    <CropPhoto src={pick.images[0].url} alt={`${fieldName(fieldId)} on ${pick.observed_at}`} />
                  )}
                </div>
              ))}
            </div>
            {earlier && later && (
              <p>
                Interval from saved dates: {days(earlier.observed_at, later.observed_at)} days. The
                recommended window is 15–25 days.
              </p>
            )}
            <button
              className="button"
              disabled={historicalPending || !earlier || !later || earlier.observed_at === later.observed_at}
            >
              {historicalPending ? "Comparing photos…" : "Compare with Gemini"}
            </button>
            {earlier && later && earlier.observed_at === later.observed_at && (
              <p className="message-caution">Choose observations from different dates.</p>
            )}
            {historical.error && <p className="message-error" role="alert">{historical.error}</p>}
            {historical.result && <Findings result={historical.result} />}
          </form>
        ) : (
          <section className="card panel stack">
            <EmptyState title="Two dated observations needed">
              Save at least two photo observations of the same field on different dates. A 15–25 day
              interval is recommended.
            </EmptyState>
            <div className="actions">
              <Link className="button button-outline" href="/scanner">
                Open Crop Scanner <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        )
      ) : (
        <>
          <p className="mock-notice" role="status">
            <Info size={16} />
            Illustrative growth-stage comparison — not verified historical field progression.
          </p>
          <div className="comparison-layout">
            <section className="card panel comparison-large">
              <SectionTitle title="Wheat sample photographs" />
              <div className="before-after">
                {samples.photos.map((photo) => (
                  <figure key={photo.source_url} className="observation">
                    <CropPhoto src={`/crops/${photo.filename}`} alt={photo.label} />
                    <figcaption>
                      <span>{photo.label}</span>
                      <a className="text-link" href={photo.source_url}>
                        {photo.attribution} · Unsplash
                      </a>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </section>
            <form action={runSample} className="card panel stack">
              <SectionTitle title="Source and limitations" />
              <p>
                {samples.dataset_name}. Capture dates, plot identities, and growth-stage labels are
                unverified, so no interval or progression is claimed.
              </p>
              <a className="text-link" href={samples.license_url}>
                {samples.license} <ArrowRight size={15} />
              </a>
              <button className="button" disabled={samplePending}>
                {samplePending ? "Comparing samples…" : "Run illustrative comparison"}
              </button>
              {sample.error && <p className="message-error" role="alert">{sample.error}</p>}
              {sample.result && <Findings result={sample.result} />}
            </form>
          </div>
        </>
      )}
      <section className="card panel">
        <SectionTitle title="Saved comparisons" />
        {comparisons.length ? (
          comparisons.map((item) => (
            <div className="list-row" key={item.id}>
              <div className="grow">
                <strong>
                  {item.comparison_mode === "verified_historical" ? fieldName(item.field_id) : "Illustrative samples"}
                </strong>
                <small>
                  {new Date(item.created_at).toLocaleDateString()}
                  {item.interval_days ? ` · ${item.interval_days} days` : " · no interval claimed"}
                  {` · ${label(item.result.previous_growth_stage)} → ${label(item.result.current_growth_stage)}`}
                </small>
              </div>
              <a className="button button-outline" href={`/api/reports/comparison/${item.id}`}>
                PDF
              </a>
            </div>
          ))
        ) : (
          <EmptyState title="No saved comparisons">Run a comparison to save it here.</EmptyState>
        )}
      </section>
    </>
  );
}

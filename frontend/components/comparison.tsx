"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import {
  fieldObservations,
  formatDate,
  initialComparisons,
  intervalDays,
  type CropComparison,
} from "@/lib/data";
import { compareExamples } from "@/lib/mock-service";
import { useDemo } from "@/lib/state";
import { GrowthTimelineChart } from "./charts";
import {
  BeforeAfterViewer,
  EmptyState,
  FieldSelect,
  LoadingSkeleton,
  MockDataNotice,
  PageHeader,
  SectionTitle,
} from "./shared";
import { Dialog } from "./ui/dialog";

export function Comparison({ initialField }: { initialField?: string }) {
  const { fields, comparisons, setComparisons } = useDemo();
  const [field, setField] = useState(
    fields.find(({ id }) => id === initialField)?.id ?? fields[0].id,
  );
  const initial = initialComparisons.find((item) => item.fieldId === field);
  const [beforeId, setBeforeId] = useState(initial?.before.id ?? "");
  const [afterId, setAfterId] = useState(initial?.after.id ?? "");
  const [result, setResult] = useState<CropComparison | undefined>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const history = fieldObservations(field);
  const before = history.find(({ id }) => id === beforeId);
  const after = history.find(({ id }) => id === afterId);
  const days =
    before && after ? intervalDays(before.date, after.date) : undefined;
  const valid = days !== undefined && days > 0;
  const saved = result && comparisons.some(({ id }) => id === result.id);

  function changeField(id: string) {
    const choices = fieldObservations(id);
    setField(id);
    setBeforeId(choices[0]?.id ?? "");
    setAfterId(choices.at(-1)?.id ?? "");
    setResult(undefined);
    setError("");
  }

  async function compare() {
    if (!before || !after || !valid) return;
    setLoading(true);
    setError("");
    try {
      setResult(await compareExamples(before, after));
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Could not compare observations.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Crop Comparison"
        description="Compare dated observations from the same field in the Crop Memory Engine."
        icon={ArrowLeftRight}
      />
      <MockDataNotice>
        Illustrative observations and example interpretations. The timeline
        shows recorded stages.
      </MockDataNotice>
      <section className="card panel stack">
        <div className="filter-bar">
          <fieldset disabled={loading} className="comparison-inputs">
            <FieldSelect fields={fields} value={field} onChange={changeField} />
            <label>
              Previous observation
              <select
                aria-label="Previous observation"
                value={beforeId}
                onChange={(event) => {
                  setBeforeId(event.target.value);
                  setResult(undefined);
                  setError("");
                }}
              >
                <option value="">Choose date</option>
                {history.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatDate(item.date)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Current observation
              <select
                aria-label="Current observation"
                value={afterId}
                onChange={(event) => {
                  setAfterId(event.target.value);
                  setResult(undefined);
                  setError("");
                }}
              >
                <option value="">Choose date</option>
                {history.map((item) => (
                  <option key={item.id} value={item.id}>
                    {formatDate(item.date)}
                  </option>
                ))}
              </select>
            </label>
          </fieldset>
          <span className="badge interval" aria-live="polite">
            <CalendarDays size={16} />
            {valid ? `${days} days` : "Interval unavailable"}
          </span>
          <button
            className="button"
            onClick={compare}
            disabled={!valid || loading}
          >
            <ArrowLeftRight size={17} />
            Compare
          </button>
        </div>
        {days !== undefined && days <= 0 && (
          <p className="message-error" role="alert">
            Choose a current observation later than the previous observation.
          </p>
        )}
        {valid && (days < 15 || days > 25) && (
          <p className="message-caution">
            This pair falls outside the suggested 15–25 day window.
          </p>
        )}
        {error && (
          <p className="message-error" role="alert">
            {error}
          </p>
        )}
      </section>
      {loading && <LoadingSkeleton label="Preparing sample comparison…" />}
      {!loading && !result && (
        <EmptyState
          title={
            history.length < 2
              ? "More observations needed"
              : "Choose an observation pair"
          }
        >
          {history.length < 2
            ? "This field needs at least two dated sample observations."
            : "Select two dates and choose Compare to see the example report."}
        </EmptyState>
      )}
      {!loading && result && (
        <div className="comparison-layout">
          <div className="stack">
            <section className="card panel comparison-large">
              <SectionTitle title="Before and after" />
              <BeforeAfterViewer comparison={result} />
            </section>
            <section className="card panel grid-three">
              <div className="metric">
                <small>Previous stage</small>
                <strong>{result.before.stage}</strong>
              </div>
              <div className="metric">
                <small>Current stage</small>
                <strong>{result.after.stage}</strong>
              </div>
              <div className="metric">
                <small>Observation interval</small>
                <strong>{result.days} days</strong>
              </div>
            </section>
            <section className="card panel">
              <SectionTitle title="Growth timeline" />
              <p className="chart-note">
                Illustrative categorical stage progression across all sample
                observations for this field.
              </p>
              <GrowthTimelineChart observations={history} />
            </section>
            <div className="actions">
              <button
                className="button"
                disabled={saved}
                onClick={() =>
                  setComparisons((items) =>
                    items.some(({ id }) => id === result.id)
                      ? items
                      : [...items, result],
                  )
                }
              >
                <Bookmark size={17} />
                {saved ? "Saved in session" : "Save comparison"}
              </button>
              <Link
                className="button button-outline"
                href={`/fields/${field}?tab=timeline`}
              >
                View field timeline
              </Link>
              <button
                className="button button-outline"
                onClick={() => {
                  setAfterId("");
                  setResult(undefined);
                  document.getElementById("main-content")?.focus();
                }}
              >
                Compare another
              </button>
            </div>
          </div>
          <section className="card panel stack">
            <SectionTitle title="Sample comparison report" />
            <div className="insight">
              <Sparkles size={18} />
              <div>
                <strong>Executive summary</strong>
                <p>
                  The sample observations were captured {result.days} days
                  apart, moving from {result.before.stage.toLowerCase()} to{" "}
                  {result.after.stage.toLowerCase()}.
                </p>
              </div>
            </div>
            {[
              [
                "Observed improvements",
                "The example illustrates how fuller canopy coverage could be documented.",
              ],
              [
                "Possible deterioration",
                "Check whether any new discoloration is visible in comparable areas.",
              ],
              [
                "Growth-stage changes",
                `${result.before.stage} → ${result.after.stage}`,
              ],
              [
                "Weather context",
                "Weather for these observation dates is unavailable in the demo.",
              ],
              [
                "Follow-up observations",
                "Repeat the photo from the same location and verify the stage on several plants.",
              ],
              [
                "Uncertainty and limitations",
                "Lighting, camera angle, and framing can affect comparisons. Visual examples cannot establish measured growth.",
              ],
            ].map(([title, detail]) => (
              <div
                className={`report-section ${title === "Possible deterioration" ? "caution" : ""}`}
                key={title}
              >
                <h3>{title}</h3>
                <p>{detail}</p>
              </div>
            ))}
            {saved ? (
              <Link
                className="text-link"
                href={`/reports/${result.id === "n1-n3" ? "growth" : result.id}`}
              >
                Open report <ArrowRight size={15} />
              </Link>
            ) : (
              <Dialog
                title="Growth Comparison Report"
                description="Illustrative comparison for the selected observation pair."
                trigger={
                  <button className="button button-outline">
                    Open report <ArrowRight size={15} />
                  </button>
                }
              >
                <p>
                  {formatDate(result.before.date)} →{" "}
                  {formatDate(result.after.date)} · {result.days} days
                </p>
                <p>
                  {result.before.stage} → {result.after.stage}
                </p>
                <p>
                  Verify any apparent changes during a field inspection.
                  Lighting and framing can affect the comparison.
                </p>
              </Dialog>
            )}
          </section>
        </div>
      )}
    </>
  );
}

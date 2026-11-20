"use client";

import Link from "next/link";
import { ClipboardList, Printer } from "lucide-react";
import { useState } from "react";
import { formatDate, reports as fixtures, type Report } from "@/lib/data";
import { useDemo } from "@/lib/state";
import { EmptyState, MockDataNotice, PageHeader, SectionTitle } from "./shared";

const categories = [
  "Crop Health Report",
  "Growth Comparison Report",
  "Weather Risk Summary",
] as const;

function useReports() {
  const { fields, comparisons } = useDemo();
  const saved: Report[] = comparisons
    .filter(({ id }) => id !== "n1-n3")
    .map(({ id, fieldId, days, before, after }) => ({
      id,
      fieldId,
      date: after.date,
      interval: days,
      type: "Growth Comparison Report",
      summary: `This illustrative pair spans ${days} days and shows recorded stages of ${before.stage.toLowerCase()} and ${after.stage.toLowerCase()}.`,
    }));
  return {
    reports: [...fixtures, ...saved],
    fieldName: (id: string) =>
      fields.find((field) => field.id === id)?.name ?? "Field",
  };
}

export function Reports() {
  const { reports, fieldName } = useReports();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const filtered = reports.filter(
    (report) =>
      (!type || report.type === type) &&
      `${report.type} ${fieldName(report.fieldId)}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Reports"
        description="Review illustrative crop health, growth, and weather summaries."
        icon={ClipboardList}
      />
      <MockDataNotice>
        Reports contain sample scenarios and comparisons saved in this session.
      </MockDataNotice>
      <div className="card panel filter-bar">
        <label>
          Search reports
          <input
            type="search"
            placeholder="Report or field name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Report category
          <select
            aria-label="Report category"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>
      <section className="card panel">
        <SectionTitle title="Report library" />
        {filtered.length ? (
          filtered.map((report) => (
            <div className="list-row report-row" key={report.id}>
              <span className="soft-icon">
                <ClipboardList size={16} />
              </span>
              <div className="grow">
                <strong>{report.type}</strong>
                <small>
                  {fieldName(report.fieldId)} · {formatDate(report.date)}
                  {report.interval ? ` · ${report.interval} days` : ""}
                </small>
              </div>
              <Link
                className="button button-outline"
                href={`/reports/${report.id}`}
                aria-label={`View ${report.type} for ${fieldName(report.fieldId)}`}
              >
                View
              </Link>
            </div>
          ))
        ) : (
          <EmptyState title="No matching reports">
            Try a different category or search term.
          </EmptyState>
        )}
      </section>
    </>
  );
}

export function ReportDetail({ id }: { id: string }) {
  const { reports, fieldName } = useReports();
  const report = reports.find((item) => item.id === id);
  if (!report)
    return (
      <>
        <PageHeader
          title="Report unavailable"
          description="This report is missing from the current app session."
          icon={ClipboardList}
        />
        <Link className="text-link" href="/reports">
          Back to reports
        </Link>
      </>
    );
  return (
    <>
      <div className="no-print">
        <Link className="text-link" href="/reports">
          Back to reports
        </Link>
      </div>
      <PageHeader
        title={report.type}
        description={fieldName(report.fieldId)}
        icon={ClipboardList}
        action={
          <button
            className="button button-outline no-print"
            onClick={() => window.print()}
          >
            <Printer size={17} />
            Print report
          </button>
        }
      />
      <MockDataNotice>Illustrative Phase 1 report.</MockDataNotice>
      <article className="card panel stack print-report">
        <div className="grid-two">
          <div className="metric">
            <small>Report date</small>
            <strong>{formatDate(report.date)}</strong>
          </div>
          <div className="metric">
            <small>Observation interval</small>
            <strong>
              {report.interval ? `${report.interval} days` : "Not applicable"}
            </strong>
          </div>
        </div>
        <div>
          <h2>Summary</h2>
          <p>{report.summary}</p>
        </div>
        <div className="report-section">
          <h3>Review notes</h3>
          <p>
            Validate field conditions during the next inspection. This report
            illustrates the format for a future field assessment.
          </p>
        </div>
      </article>
    </>
  );
}

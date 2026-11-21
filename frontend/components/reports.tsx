"use client";

import Link from "next/link";
import { ClipboardList, Download } from "lucide-react";
import type { SavedField, SavedObservation } from "@/lib/farm-types";
import type { SavedComparison } from "@/lib/farm-data";
import { EmptyState, PageHeader, SectionTitle } from "./shared";

function Row({ title, detail, href }: { title: string; detail: string; href: string }) {
  return (
    <div className="list-row report-row">
      <span className="soft-icon">
        <ClipboardList size={16} />
      </span>
      <div className="grow">
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <a className="button button-outline" href={href} aria-label={`Download PDF: ${title}, ${detail}`}>
        <Download size={15} /> PDF
      </a>
    </div>
  );
}

export function Reports({
  fields,
  analyzed,
  comparisons,
}: {
  fields: SavedField[];
  analyzed: SavedObservation[];
  comparisons: SavedComparison[];
}) {
  const fieldName = (id: string | null) => fields.find((field) => field.id === id)?.name ?? "Field";
  const located = fields.filter((field) => !field.is_archived && field.latitude != null);
  return (
    <>
      <PageHeader
        title="Reports"
        description="Download PDF reports built from your saved observations, analyses, comparisons, and forecasts."
        icon={ClipboardList}
      />
      <section className="card panel">
        <SectionTitle title="Crop Health Reports" />
        {analyzed.length ? (
          analyzed.map((item) => (
            <Row
              key={item.id}
              title={fieldName(item.field_id)}
              detail={`Observation ${item.observed_at} · ${item.images.length} photo(s)`}
              href={`/api/reports/health/${item.id}`}
            />
          ))
        ) : (
          <EmptyState title="No analyzed observations">
            <Link href="/crop-doctor">Analyze a saved observation in Crop Doctor first.</Link>
          </EmptyState>
        )}
      </section>
      <section className="card panel">
        <SectionTitle title="Growth Comparison Reports" />
        {comparisons.length ? (
          comparisons.map((item) => (
            <Row
              key={item.id}
              title={item.comparison_mode === "verified_historical" ? fieldName(item.field_id) : "Illustrative samples"}
              detail={
                item.comparison_mode === "verified_historical"
                  ? `${item.interval_days} day interval · ${new Date(item.created_at).toLocaleDateString()}`
                  : `Not field history · ${new Date(item.created_at).toLocaleDateString()}`
              }
              href={`/api/reports/comparison/${item.id}`}
            />
          ))
        ) : (
          <EmptyState title="No saved comparisons">
            <Link href="/comparison">Run a comparison in Crop Memory first.</Link>
          </EmptyState>
        )}
      </section>
      <section className="card panel">
        <SectionTitle title="Weather Risk Summaries" />
        {located.length ? (
          located.map((field) => (
            <Row
              key={field.id}
              title={field.name}
              detail="Live Open-Meteo 7-day forecast, generated when downloaded"
              href={`/api/reports/weather/${field.id}`}
            />
          ))
        ) : (
          <EmptyState title="No fields with coordinates">
            <Link href="/fields">Add latitude and longitude to a field.</Link>
          </EmptyState>
        )}
      </section>
    </>
  );
}

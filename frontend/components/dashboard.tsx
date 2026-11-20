"use client";

import Link from "next/link";
import {
  ArrowLeftRight,
  Camera,
  ClipboardList,
  CloudSun,
  ScanLine,
  Sparkles,
  Sprout,
  TriangleAlert,
} from "lucide-react";
import {
  alerts,
  currentConditions,
  fieldObservations,
  forecastIssued,
  forecasts,
  formatDate,
  observations,
  photos,
  reports,
} from "@/lib/data";
import { useDemo } from "@/lib/state";
import {
  BeforeAfterViewer,
  CropPhoto,
  FieldCard,
  MockDataNotice,
  ReminderCard,
  SectionTitle,
  StatCard,
  WeatherAlertCard,
} from "./shared";
import { convertTemp, GrowthTimelineChart } from "./charts";

export function Dashboard() {
  const { fields, reminders, comparisons, user } = useDemo();
  const north = fieldObservations("north");
  const comparison = comparisons[0];
  const weather = currentConditions.north;
  const next = forecasts.north[1];
  const northName =
    fields.find(({ id }) => id === "north")?.name ?? "North Field";
  return (
    <>
      <section className="hero">
        <CropPhoto src={photos.golden} alt="" className="hero-photo" priority />
        <div className="hero-copy">
          <h1>Welcome back, {user.name.split(" ")[0]}.</h1>
          <p>
            Review your wheat fields, track visible changes, and plan your next
            inspection.
          </p>
          <div className="actions">
            <Link className="button" href="/scanner">
              <ScanLine size={17} />
              Scan Crop
            </Link>
            <Link className="button button-outline" href="/comparison">
              <ArrowLeftRight size={17} />
              Compare Growth
            </Link>
          </div>
        </div>
      </section>
      <MockDataNotice>
        Sample field observations, weather, and activity for the Phase 1 demo.
      </MockDataNotice>
      <div className="dashboard-grid">
        <div className="dashboard-main">
          <section aria-label="Workspace totals" className="stats-grid">
            <StatCard
              label="Total fields"
              value={fields.length}
              icon={Sprout}
              detail="In this workspace"
            />
            <StatCard
              label="Sample scans"
              value={observations.length}
              icon={Camera}
              tone="mint"
              detail="Dated observations"
            />
            <StatCard
              label="Comparisons"
              value={comparisons.length}
              icon={ArrowLeftRight}
              tone="blue"
              detail="Saved field comparisons"
            />
            <StatCard
              label="Weather alerts"
              value={alerts.length}
              icon={TriangleAlert}
              tone="amber"
              detail="Sample conditions"
            />
          </section>
          <div className="dashboard-center">
            <div className="stack">
              <section className="card panel">
                <SectionTitle title="My fields" href="/fields" />
                <div className="fields-grid">
                  {fields.slice(0, 4).map((field) => (
                    <FieldCard key={field.id} field={field} />
                  ))}
                </div>
              </section>
              <section className="card panel assistant-preview">
                <span className="soft-icon">
                  <Sparkles size={19} />
                </span>
                <div>
                  <h3>AI Farmer Assistant</h3>
                  <small>Try a demo question about wheat.</small>
                </div>
                <Link className="text-link" href="/assistant">
                  Ask a question
                </Link>
              </section>
            </div>
            <div className="stack">
              <section className="card panel">
                <SectionTitle
                  title="Crop progress"
                  href="/comparison"
                  link="Compare"
                />
                <BeforeAfterViewer comparison={comparison} />
                <div className="insight">
                  <Sparkles size={17} />
                  <div>
                    <strong>{comparison.days} days · Sample comparison</strong>
                    <p>
                      The example moves from tillering to stem elongation. Photo
                      framing limits what can be compared.
                    </p>
                  </div>
                </div>
              </section>
              <section className="card panel">
                <SectionTitle title="Growth timeline" />
                <p className="chart-note">
                  North Field · Illustrative observation stages
                </p>
                <GrowthTimelineChart observations={north} />
              </section>
            </div>
          </div>
        </div>
        <div className="stack dashboard-side">
          <section className="card panel">
            <SectionTitle
              title="Weather Guardian"
              href="/weather"
              link="Forecast"
            />
            <div className="weather-inline">
              <CloudSun size={30} />
              <div>
                <strong>
                  {convertTemp(weather.temperature, user.units)}°{user.units}
                </strong>
                <small>{northName} · Sample conditions</small>
              </div>
            </div>
            <WeatherAlertCard alert={alerts[0]} fieldName={northName} compact />
            <p className="chart-note">
              {formatDate(next.date)} outlook · {next.chance}% chance of rain
            </p>
            <p className="chart-note">Issued {forecastIssued}</p>
          </section>
          <section className="card panel">
            <SectionTitle title="Upcoming reminders" href="/reminders" />
            {reminders.some((item) => !item.completed) ? (
              reminders
                .filter((item) => !item.completed)
                .slice(0, 3)
                .map((item) => (
                  <ReminderCard
                    key={item.id}
                    reminder={item}
                    fieldName={
                      fields.find(({ id }) => id === item.fieldId)?.name ??
                      "Field"
                    }
                  />
                ))
            ) : (
              <p>No upcoming reminders.</p>
            )}
          </section>
          <section className="card panel">
            <SectionTitle
              title="Recent activity"
              href="/reports"
              link="Reports"
            />
            {[
              {
                title: "Observation recorded",
                detail: "North Field · 26 Mar",
                Icon: Camera,
              },
              {
                title: reports[1].type,
                detail: "East Field · 25 Mar",
                Icon: ClipboardList,
              },
              {
                title: "Comparison saved",
                detail: "North Field · 21 Mar",
                Icon: ArrowLeftRight,
              },
            ].map(({ title, detail, Icon }) => (
              <div className="list-row" key={title}>
                <span className="soft-icon">
                  <Icon size={16} />
                </span>
                <div className="grow">
                  <strong>{title}</strong>
                  <small>{detail}</small>
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}

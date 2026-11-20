"use client";

import {
  CloudRain,
  CloudSun,
  Droplets,
  Sun,
  Thermometer,
  Wind,
} from "lucide-react";
import { useState } from "react";
import {
  alerts,
  currentConditions,
  fieldObservations,
  forecastIssued,
  forecasts,
  formatDate,
} from "@/lib/data";
import { useDemo } from "@/lib/state";
import { convertTemp, ForecastChart } from "./charts";
import {
  EmptyState,
  FieldSelect,
  MockDataNotice,
  PageHeader,
  RiskSeverityBadge,
  SectionTitle,
  WeatherAlertCard,
} from "./shared";

const icons = { Rain: CloudRain, Sunny: Sun, Cloudy: CloudSun };

export function Weather({ initialField }: { initialField?: string }) {
  const { fields, user } = useDemo();
  const [id, setId] = useState(
    fields.find((item) => item.id === initialField)?.id ?? fields[0].id,
  );
  const field = fields.find((item) => item.id === id)!;
  const forecast = forecasts[id];
  const current = currentConditions[id];
  const selected = alerts.filter((alert) => alert.fieldId === id);
  const remaining = alerts.filter((alert) => alert.fieldId !== id);
  const stage = fieldObservations(id).at(-1)?.stage ?? "Awaiting observation";
  const CurrentIcon = current ? icons[current.condition] : CloudSun;
  const temperature = (value: number) =>
    `${convertTemp(value, user.units)}°${user.units}`;
  const fieldName = (id: string) =>
    fields.find((item) => item.id === id)?.name ?? "Field";

  return (
    <>
      <PageHeader
        title="Weather Guardian"
        description="Review forecast scenarios and field-specific weather cautions."
        icon={CloudSun}
      />
      <MockDataNotice>
        Sample forecast dataset · Issued {forecastIssued} · Fixed historical
        scenario.
      </MockDataNotice>
      <section className="card panel filter-bar">
        <FieldSelect fields={fields} value={id} onChange={setId} />
        <div className="metric">
          <small>Crop stage</small>
          <strong>{stage}</strong>
        </div>
        <div className="metric">
          <small>Field area</small>
          <strong>{field.acres} acres</strong>
        </div>
      </section>
      {selected.length ? (
        <section className="grid-two" aria-label="Selected field alerts">
          {selected.map((alert) => (
            <WeatherAlertCard
              key={alert.id}
              alert={alert}
              fieldName={field.name}
            />
          ))}
        </section>
      ) : (
        <div className="card panel">
          <h2>{current ? "No sample cautions" : "Forecast unavailable"}</h2>
          {current && <RiskSeverityBadge severity="Normal" />}
        </div>
      )}
      {forecast && current ? (
        <>
          <div className="grid-two">
            <section className="card panel stack">
              <SectionTitle title="Sample conditions" />
              <div className="weather-now">
                <CurrentIcon size={45} />
                <div>
                  <strong>{temperature(current.temperature)}</strong>
                  <p>
                    {current.condition} · {field.name}
                  </p>
                </div>
              </div>
              <div className="actions">
                <span className="badge">
                  <Droplets size={14} />
                  {current.humidity}% humidity
                </span>
                <span className="badge">
                  <Wind size={14} />
                  {current.wind} km/h sample wind
                </span>
              </div>
            </section>
            <section className="card panel">
              <SectionTitle title="Seven-day sample forecast" />
              <div className="forecast-grid">
                {forecast.map((day) => {
                  const Icon = icons[day.condition];
                  return (
                    <div className="forecast-day" key={day.date}>
                      <strong>{formatDate(day.date).slice(0, -5)}</strong>
                      <Icon aria-label={day.condition} size={23} />
                      <span>
                        {temperature(day.high)} / {temperature(day.low)}
                      </span>
                      <small>{day.chance}% rain</small>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
          <div className="grid-two">
            <section className="card panel">
              <SectionTitle title="Temperature trend" />
              <p className="chart-note">
                <Thermometer size={13} className="inline" /> Daily highs and
                lows
              </p>
              <ForecastChart
                forecast={forecast}
                mode="temperature"
                units={user.units}
              />
            </section>
            <section className="card panel">
              <SectionTitle title="Rainfall forecast" />
              <p className="chart-note">
                Illustrative daily rainfall in millimetres
              </p>
              <ForecastChart
                forecast={forecast}
                mode="rain"
                units={user.units}
              />
            </section>
          </div>
        </>
      ) : (
        <EmptyState title="No forecast for this field">
          Choose a sample field to explore forecast scenarios.
        </EmptyState>
      )}
      <section className="card panel">
        <SectionTitle title="Other field risk scenarios" />
        <div className="grid-two">
          {remaining.map((alert) => (
            <WeatherAlertCard
              key={alert.id}
              alert={alert}
              fieldName={fieldName(alert.fieldId)}
            />
          ))}
        </div>
      </section>
    </>
  );
}

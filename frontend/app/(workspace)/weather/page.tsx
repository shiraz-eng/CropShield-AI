import Link from "next/link";
import { LiveWeatherHeader } from "@/components/weather";
import { ForecastChart } from "@/components/charts";
import { EmptyState, SectionTitle } from "@/components/shared";
import { listFields } from "@/lib/farm-data";
import { loadFieldForecast } from "@/lib/field-forecast";

export const metadata = { title: "Weather Guardian" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ field?: string }>;
}) {
  const [{ field }, fields] = await Promise.all([searchParams, listFields(true)]);
  const selected = fields.find(({ id }) => id === field) ?? fields[0];
  if (!selected)
    return (
      <>
        <LiveWeatherHeader />
        <EmptyState title="No active fields">
          <Link href="/fields">Add a wheat field with coordinates to see its forecast.</Link>
        </EmptyState>
      </>
    );
  const located = selected.latitude != null && selected.longitude != null;
  const forecast = located
    ? await loadFieldForecast(selected.latitude!, selected.longitude!)
    : null;
  const heavyRain = forecast?.days.filter(({ rain }) => rain >= 25) ?? [];
  const highHeat = forecast?.days.filter(({ high }) => high >= 35) ?? [];

  return (
    <>
      <LiveWeatherHeader />
      <nav className="card panel actions" aria-label="Saved fields">
        {fields.map(({ id, name }) => (
          <Link key={id} className={id === selected.id ? "button" : "text-link"}
            aria-current={id === selected.id ? "page" : undefined}
            href={`/weather?field=${id}`}>{name}</Link>
        ))}
      </nav>
      {!forecast ? (
        <EmptyState title={located ? "Live forecast unavailable" : "Field coordinates needed"}>
          {located ? "Try reloading later." : (
            <Link href={`/fields/${selected.id}`}>Open the field to add latitude and longitude.</Link>
          )}
        </EmptyState>
      ) : (
        <>
          <section className="card panel stack">
            <SectionTitle title={`Open-Meteo forecast · ${selected.name}`} />
            <p>Forecast dates use {forecast.timezone}. {forecast.receivedAt && `Provider response: ${forecast.receivedAt}.`}</p>
            <div className="forecast-grid">
              {forecast.days.map((day) => (
                <div className="forecast-day" key={day.date}>
                  <strong>{day.date.slice(5)}</strong>
                  <span>{day.high}° / {day.low}°C</span>
                  <small>{day.chance}% precipitation</small>
                </div>
              ))}
            </div>
          </section>
          <section className="card panel stack">
            <SectionTitle title="Forecast cautions" />
            {heavyRain.length > 0 && <p>Heavy precipitation forecast on {heavyRain.map(({ date }) => date).join(", ")}. Check field drainage.</p>}
            {highHeat.length > 0 && <p>High temperature forecast on {highHeat.map(({ date }) => date).join(", ")}. Check field conditions before scheduling work.</p>}
            {!heavyRain.length && !highHeat.length && <p>No forecast days crossed the configured caution thresholds.</p>}
            <small>App thresholds are 25 mm of daily precipitation or a daily high of 35°C.</small>
            <Link className="text-link" href="/reminders">Open reminders</Link>
          </section>
          <div className="grid-two">
            <section className="card panel"><SectionTitle title="Temperature forecast" /><ForecastChart forecast={forecast.days} mode="temperature" units="C" /></section>
            <section className="card panel"><SectionTitle title="Precipitation forecast" /><ForecastChart forecast={forecast.days} mode="rain" units="C" /></section>
          </div>
        </>
      )}
    </>
  );
}

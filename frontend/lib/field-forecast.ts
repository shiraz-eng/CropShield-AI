import type { WeatherForecast } from "./data";

type ForecastResponse = {
  timezone?: string;
  daily?: {
    time: string[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
    precipitation_probability_max: (number | null)[];
    weather_code: (number | null)[];
  };
};

export async function loadFieldForecast(latitude: number, longitude: number) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(latitude.toFixed(2)),
    longitude: String(longitude.toFixed(2)),
    timezone: "auto",
    forecast_days: "7",
    daily: "temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code",
  }).toString();

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 900 },
    });
    if (!response.ok) return null;
    const { daily, timezone } = await response.json() as ForecastResponse;
    if (!daily || !timezone || !Array.isArray(daily.time)) return null;
    const days = daily.time.flatMap((date, index): WeatherForecast[] => {
      const high = daily.temperature_2m_max?.[index];
      const low = daily.temperature_2m_min?.[index];
      const rain = daily.precipitation_sum?.[index];
      const chance = daily.precipitation_probability_max?.[index];
      const code = daily.weather_code?.[index];
      if (![high, low, rain, chance, code].every(Number.isFinite)) return [];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date))) return [];
      return [{
        date, high: high!, low: low!, rain: rain!, chance: chance!,
        condition: code! >= 51 ? "Rain" : code === 0 ? "Sunny" : "Cloudy",
      }];
    });
    if (!days.length) return null;
    return { days, timezone, receivedAt: response.headers.get("date") };
  } catch {
    return null;
  }
}

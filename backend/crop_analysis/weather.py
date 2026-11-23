"""Open-Meteo daily forecast and the app's fixed caution thresholds."""

from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime
from uuid import UUID

import httpx2 as httpx
from pydantic import HttpUrl

from .reports import VerifiedWeather, WeatherCaution

SOURCE = "https://api.open-meteo.com/v1/forecast"
HEAVY_RAIN_MM = 25
HIGH_HEAT_C = 35


def irrigation_weather(latitude: float, longitude: float) -> dict | None:
    """Recent modeled rain and current forecasts in field-local dates and metric units."""
    try:
        response = httpx.get(SOURCE, timeout=6.0, params={
            "latitude": f"{latitude:.2f}", "longitude": f"{longitude:.2f}", "timezone": "auto",
            "past_days": 3, "forecast_days": 7, "temperature_unit": "celsius", "precipitation_unit": "mm",
            "daily": "precipitation_sum,temperature_2m_max",
        })
        response.raise_for_status()
        payload = response.json()
        timezone = payload["timezone"]
        offset = timedelta(seconds=payload["utc_offset_seconds"])
        today = (datetime.now(UTC) + offset).date().isoformat()
        units = payload["daily_units"]
        if units["precipitation_sum"] != "mm" or units["temperature_2m_max"] != "°C":
            return None
        daily = payload["daily"]
        rows = [{"date": day, "rain": rain, "high": high} for day, rain, high in zip(
            daily["time"], daily["precipitation_sum"], daily["temperature_2m_max"], strict=True,
        )]
    except (httpx.HTTPError, KeyError, TypeError, ValueError, OverflowError):
        return None
    return {"timezone": timezone, "recent": [row for row in rows if row["date"] < today],
            "forecast": [row for row in rows if row["date"] >= today], "source": SOURCE}


def evaluate(field_id: UUID, days: list[dict], retrieved_at: datetime) -> VerifiedWeather:
    """Turn daily forecast rows into dated cautions using the documented thresholds."""
    cautions = []
    for day in days:
        if day["rain"] >= HEAVY_RAIN_MM:
            cautions.append(WeatherCaution(
                event=f"{day['date']} precipitation {day['rain']} mm", severity="High Risk",
                caution="Heavy precipitation forecast. Check field drainage.",
            ))
        if day["high"] >= HIGH_HEAT_C:
            cautions.append(WeatherCaution(
                event=f"{day['date']} high {day['high']} °C", severity="Caution",
                caution="High temperature forecast. Check field conditions before scheduling work.",
            ))
    if not cautions:
        cautions.append(WeatherCaution(
            event=f"{days[0]['date']} to {days[-1]['date']}", severity="Normal",
            caution=f"No day reached {HEAVY_RAIN_MM} mm precipitation or a {HIGH_HEAT_C} °C high.",
        ))
    return VerifiedWeather(
        field_id=field_id, issued_at=retrieved_at, source=HttpUrl(SOURCE), cautions=cautions[:12],
    )


def field_forecast(field_id: UUID, latitude: float, longitude: float) -> tuple[list[dict], VerifiedWeather] | None:
    params = {
        "latitude": f"{latitude:.2f}", "longitude": f"{longitude:.2f}", "timezone": "auto",
        "forecast_days": "7",
        "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code",
    }
    try:
        response = httpx.get(SOURCE, params=params, timeout=6.0)
        response.raise_for_status()
        daily = response.json()["daily"]
        days = [
            {"date": date, "high": high, "low": low, "rain": rain}
            for date, high, low, rain in zip(
                daily["time"], daily["temperature_2m_max"], daily["temperature_2m_min"],
                daily["precipitation_sum"], strict=True,
            )
            if None not in (high, low, rain)
        ]
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        return None
    if not days:
        return None
    try:
        retrieved = parsedate_to_datetime(response.headers["date"])
    except (KeyError, TypeError, ValueError):
        retrieved = datetime.now(UTC)
    return days, evaluate(field_id, days, retrieved)

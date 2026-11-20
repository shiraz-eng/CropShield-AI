"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { stages, type CropObservation, type WeatherForecast } from "@/lib/data";

const chartMargin = { left: 4, right: 14, top: 12, bottom: 0 };
const shortDate = (date: string) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(date));

export function GrowthTimelineChart({
  observations,
}: {
  observations: CropObservation[];
}) {
  const data = observations.map(({ date, stage }) => ({
    date: shortDate(date),
    level: stages.indexOf(stage),
  }));
  return (
    <>
      <div className="chart" aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 420, height: 200 }}
        >
          <AreaChart
            data={data}
            margin={chartMargin}
            accessibilityLayer={false}
          >
            <CartesianGrid stroke="#e2e8e0" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis
              width={91}
              domain={[0, 4]}
              ticks={[0, 1, 2, 3, 4]}
              tick={{ fontSize: 10 }}
              tickFormatter={(level: number) => stages[level]}
            />
            <Tooltip formatter={(level) => [stages[Number(level)], "Stage"]} />
            <Area
              isAnimationActive={false}
              type="stepAfter"
              dataKey="level"
              stroke="#15803d"
              fill="#e0f0dc"
              strokeWidth={2}
              dot={{ r: 4, fill: "#15803d" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        {observations
          .map(({ date, stage }) => `${shortDate(date)}: ${stage}`)
          .join("; ")}
      </p>
    </>
  );
}

export function ForecastChart({
  forecast,
  mode,
  units,
}: {
  forecast: WeatherForecast[];
  mode: "temperature" | "rain";
  units: "C" | "F";
}) {
  const data = forecast.map(({ date, high, low, rain }) => ({
    date: shortDate(date),
    high: convertTemp(high, units),
    low: convertTemp(low, units),
    rain,
  }));
  return (
    <>
      <div className="chart" aria-hidden="true">
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 420, height: 200 }}
        >
          {mode === "rain" ? (
            <BarChart
              data={data}
              margin={chartMargin}
              accessibilityLayer={false}
            >
              <CartesianGrid stroke="#e2e8e0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis width={42} unit=" mm" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar
                name="Rain (mm)"
                dataKey="rain"
                fill="#519fb3"
                radius={[4, 4, 0, 0]}
                isAnimationActive={false}
              />
            </BarChart>
          ) : (
            <LineChart
              data={data}
              margin={chartMargin}
              accessibilityLayer={false}
            >
              <CartesianGrid stroke="#e2e8e0" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis width={44} unit={`°${units}`} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                name="High"
                dataKey="high"
                stroke="#b75b36"
                strokeWidth={2}
                isAnimationActive={false}
              />
              <Line
                name="Low"
                dataKey="low"
                stroke="#15803d"
                strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="sr-only">
        {data
          .map((day) =>
            mode === "rain"
              ? `${day.date}: ${day.rain} mm`
              : `${day.date}: high ${day.high}, low ${day.low} degrees ${units}`,
          )
          .join("; ")}
      </p>
    </>
  );
}

export function convertTemp(value: number, units: "C" | "F") {
  return units === "F" ? Math.round(value * 1.8 + 32) : value;
}

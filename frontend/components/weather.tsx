"use client";

import { CloudSun } from "lucide-react";
import { PageHeader } from "./shared";

export function LiveWeatherHeader() {
  return <PageHeader title="Weather Guardian" description="Forecasts for your saved field locations." icon={CloudSun} />;
}

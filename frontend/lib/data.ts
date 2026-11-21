export type Stage =
  "Emergence" | "Tillering" | "Stem elongation" | "Booting" | "Heading";
export type Severity = "Normal" | "Caution" | "High Risk";
export type Language = "English" | "Urdu";
export interface User {
  name: string;
  email: string;
  language: Language;
  units: "C" | "F";
  interval: number;
  notifications: boolean;
}
export interface Field {
  id: string;
  name: string;
  location: string;
  acres: number;
  crop: "Wheat";
  photo: string;
}
export interface CropObservation {
  id: string;
  fieldId: string;
  date: string;
  stage: Stage;
  photo: string;
  status: "clear" | "concerns" | "poor" | "unavailable";
}
export interface CropComparison {
  id: string;
  fieldId: string;
  before: CropObservation;
  after: CropObservation;
  days: number;
}
export interface WeatherForecast {
  date: string;
  high: number;
  low: number;
  rain: number;
  chance: number;
  condition: "Cloudy" | "Rain" | "Sunny";
}
export interface WeatherAlert {
  id: string;
  fieldId: string;
  event: string;
  dates: string;
  severity: Severity;
  message: string;
  precautions: string[];
}
export interface Reminder {
  id: string;
  title: string;
  fieldId: string;
  date: string;
  completed: boolean;
}
export interface Notification {
  id: string;
  title: string;
  detail: string;
}
export interface Report {
  id: string;
  type:
    "Crop Health Report" | "Growth Comparison Report" | "Weather Risk Summary";
  fieldId: string;
  date: string;
  interval?: number;
  summary: string;
}

export const photos = {
  golden: "/crops/golden.jpg",
  green: "/crops/green.jpg",
  close: "/crops/close.jpg",
};
export const farmer: User = {
  name: "Ahmed Khan",
  email: "ahmed@example.com",
  language: "English",
  units: "C",
  interval: 20,
  notifications: true,
};
export const stages: Stage[] = [
  "Emergence",
  "Tillering",
  "Stem elongation",
  "Booting",
  "Heading",
];
export const initialFields: Field[] = [
  {
    id: "north",
    name: "North Field",
    location: "Block A",
    acres: 8.5,
    crop: "Wheat",
    photo: photos.green,
  },
  {
    id: "east",
    name: "East Field",
    location: "Block B",
    acres: 6.2,
    crop: "Wheat",
    photo: photos.golden,
  },
  {
    id: "south",
    name: "South Field",
    location: "Block C",
    acres: 10,
    crop: "Wheat",
    photo: photos.close,
  },
  {
    id: "river",
    name: "River Field",
    location: "Block D",
    acres: 5.4,
    crop: "Wheat",
    photo: photos.green,
  },
];
export const observations: CropObservation[] = [
  {
    id: "n1",
    fieldId: "north",
    date: "2025-03-01",
    stage: "Tillering",
    photo: photos.green,
    status: "clear",
  },
  {
    id: "n2",
    fieldId: "north",
    date: "2025-03-16",
    stage: "Stem elongation",
    photo: photos.close,
    status: "concerns",
  },
  {
    id: "n3",
    fieldId: "north",
    date: "2025-03-21",
    stage: "Stem elongation",
    photo: photos.close,
    status: "poor",
  },
  {
    id: "n4",
    fieldId: "north",
    date: "2025-03-26",
    stage: "Booting",
    photo: photos.golden,
    status: "unavailable",
  },
  {
    id: "e1",
    fieldId: "east",
    date: "2025-03-05",
    stage: "Tillering",
    photo: photos.green,
    status: "clear",
  },
  {
    id: "e2",
    fieldId: "east",
    date: "2025-03-25",
    stage: "Stem elongation",
    photo: photos.close,
    status: "clear",
  },
  {
    id: "s1",
    fieldId: "south",
    date: "2025-03-24",
    stage: "Booting",
    photo: photos.close,
    status: "clear",
  },
  {
    id: "r1",
    fieldId: "river",
    date: "2025-03-22",
    stage: "Tillering",
    photo: photos.green,
    status: "clear",
  },
];
export const initialReminders: Reminder[] = [
  {
    id: "inspect",
    title: "Crop inspection",
    fieldId: "north",
    date: "2025-03-28",
    completed: false,
  },
  {
    id: "photo",
    title: "Capture follow-up photos",
    fieldId: "east",
    date: "2025-03-30",
    completed: false,
  },
  {
    id: "rain",
    title: "Check drainage after rain",
    fieldId: "north",
    date: "2025-03-31",
    completed: false,
  },
  {
    id: "baseline",
    title: "Capture baseline observation",
    fieldId: "north",
    date: "2025-03-01",
    completed: true,
  },
];
export const initialNotifications: Notification[] = [
  {
    id: "rain",
    title: "Heavy rain scenario",
    detail: "North Field · sample forecast",
  },
  {
    id: "scan",
    title: "Observation added",
    detail: "North Field · 26 Mar 2025",
  },
];
export const alerts: WeatherAlert[] = [
  {
    id: "rain",
    fieldId: "north",
    event: "Heavy rain",
    dates: "28–29 Mar 2025",
    severity: "High Risk",
    message: "Standing water may develop in low areas.",
    precautions: ["Check field drainage.", "Inspect low areas after rainfall."],
  },
  {
    id: "heat",
    fieldId: "south",
    event: "Extreme heat",
    dates: "31 Mar 2025",
    severity: "Caution",
    message: "High temperatures could increase crop stress.",
    precautions: [
      "Check soil moisture.",
      "Observe plants during cooler hours.",
    ],
  },
  {
    id: "frost",
    fieldId: "east",
    event: "Frost",
    dates: "30 Mar 2025",
    severity: "Caution",
    message: "Low overnight temperatures may affect exposed areas.",
    precautions: ["Inspect vulnerable areas after sunrise."],
  },
  {
    id: "wind",
    fieldId: "river",
    event: "Strong winds",
    dates: "29 Mar 2025",
    severity: "Caution",
    message: "Gusts could damage exposed plants.",
    precautions: ["Inspect exposed edges after winds ease."],
  },
  {
    id: "dry",
    fieldId: "south",
    event: "Prolonged dry conditions",
    dates: "1–3 Apr 2025",
    severity: "Caution",
    message: "A dry spell may reduce soil moisture.",
    precautions: ["Check soil moisture in multiple locations."],
  },
];
export const forecastIssued = "27 Mar 2025 · 08:00 local";
export const currentConditions: Record<
  string,
  {
    temperature: number;
    wind: number;
    humidity: number;
    condition: WeatherForecast["condition"];
  }
> = {
  north: { temperature: 24, wind: 12, humidity: 62, condition: "Cloudy" },
  east: { temperature: 23, wind: 9, humidity: 53, condition: "Sunny" },
  south: { temperature: 27, wind: 11, humidity: 48, condition: "Sunny" },
  river: { temperature: 25, wind: 17, humidity: 58, condition: "Cloudy" },
};
export const forecasts: Record<string, WeatherForecast[]> = Object.fromEntries(
  initialFields.map((field, index) => [
    field.id,
    [26, 23, 21, 25, 28, 32, 29].map((high, day): WeatherForecast => {
      const rain =
        field.id === "north"
          ? [0, 28, 42, 8, 0, 0, 0][day]
          : [0, 4, 6, 1, 0, 0, 0][day];
      return {
        date: day < 5 ? `2025-03-${27 + day}` : `2025-04-0${day - 4}`,
        high: high + index,
        low: field.id === "east" && day === 3 ? 0 : high - 10 + index,
        rain,
        chance: rain ? Math.min(95, 25 + rain * 2) : 5,
        condition: rain ? "Rain" : day === 0 ? "Cloudy" : "Sunny",
      };
    }),
  ]),
);
export const reports: Report[] = [
  {
    id: "health",
    type: "Crop Health Report",
    fieldId: "east",
    date: "2025-03-25",
    summary:
      "The sample observation illustrates how an inspection might record visible foliage and note areas for follow-up.",
  },
  {
    id: "weather",
    type: "Weather Risk Summary",
    fieldId: "north",
    date: "2025-03-27",
    summary:
      "The sample rain scenario illustrates a drainage check and a follow-up after rainfall.",
  },
];
export function fieldObservations(id: string) {
  return observations.filter((observation) => observation.fieldId === id);
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
export function intervalDays(before: string, after: string) {
  return (Date.parse(after) - Date.parse(before)) / 86_400_000;
}

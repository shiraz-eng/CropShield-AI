# CropShield AI

CropShield AI is a planned wheat-first tool that helps farmers track visible crop conditions, understand growth over time, and prepare for weather-related risks.

## Status

Phase 1 — Frontend demo. The workspace includes all ten application pages and runs with illustrative data. Field changes, reminders, settings, and saved comparisons last for the current session. Scanner photos stay in the browser. AI replies and forecasts use fixed examples.

## Planned functionality

- **AI Crop Scanner** analyzes crop photographs.
- **AI Crop Doctor** explains visible symptoms and possible concerns.
- **Crop Memory Engine** compares the same field across dates, targeting observations taken 15–25 days apart.
- **Weather Guardian** provides forecast-based crop cautions.
- **Smart Reminders** schedule future inspections.
- **AI Farmer Assistant** explains observations in English and Urdu.
- **Field Management** maintains field histories.
- **Progress Reports** summarize development and potential problems.

## Planned stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Python, FastAPI, Pydantic |
| AI | Gemini multimodal API |
| Data, identity, and photos | Supabase PostgreSQL, Auth, and Storage |
| Weather | Open-Meteo API |
| Charts | Recharts |

## Repository structure

| Path | Purpose |
| --- | --- |
| `frontend/` | Next.js application and typed demo fixtures |
| `backend/` | FastAPI application |
| `supabase/migrations/` | Database migrations |
| `docs/` | Project, architecture, development, hackathon, and research plans |
| `AGENTS.md` and `HANDOFF.md` | Repository instructions and phase tracking |
| `.env.example` | Anticipated configuration names |

## Development phases

0. Git and planning
1. Frontend foundation
2. Authentication and field management
3. AI Crop Scanner
4. Crop Memory Engine
5. Weather Guardian
6. AI Farmer Assistant and reminders
7. Testing and deployment

See the [development plan](docs/DEVELOPMENT_PLAN.md) for phase outcomes.

## Setup prerequisites

Use Git, Node.js 24, and npm for the Phase 1 frontend. The demo requires no environment variables.

```powershell
cd frontend
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). From `frontend/`, run `npm run typecheck`, `npm run lint`, and `npm run build` to verify the app.

Sample wheat photos are by [Marek Studzinski](https://unsplash.com/photos/UQEpP1nll1A), [Leonardo Baldissara](https://unsplash.com/photos/TdiU8Q4ejH8), and [Jatin Punia](https://unsplash.com/photos/PLrAAPUfGIQ) on Unsplash. They illustrate the interface and are not evidence from the sample fields.

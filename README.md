# CropShield AI

CropShield AI is a planned wheat-first tool that helps farmers track visible crop conditions, understand growth over time, and prepare for weather-related risks.

## Status

Phase 0 — Repository Foundation. Application development has not started.

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
| `frontend/` | Next.js application |
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

Phase 0 requires Git. Later phases will require Node.js and a package manager, Python and a virtual environment, a Supabase project, and server-side Gemini credentials. Select compatible stable dependencies when implementation begins.

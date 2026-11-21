# CropShield AI

CropShield AI is a planned wheat-first tool that helps farmers track visible crop conditions, understand growth over time, and prepare for weather-related risks.

## Status

Supabase authentication, persistent fields, dated observations, and private photo storage are connected. Crop Doctor findings, Crop Memory comparisons, and reminders are saved per user. The English/Urdu assistant and PDF reports read the signed-in user's saved records through FastAPI. The full signed-in journey still needs a rehearsal; see the [live demo checklist](docs/LIVE_DEMO_CHECKLIST.md) and [handover audit](docs/CLAUDE_HANDOVER_AUDIT.md).

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

For the hackathon, see the [final audit](docs/FINAL_AUDIT.md), [demo script](docs/DEMO_SCRIPT.md), and [submission checklist](docs/SUBMISSION_CHECKLIST.md).

## Docker-free development

Use Git, Node.js 24, npm, Python 3.11 or newer, and an existing hosted Supabase development project. Confirm the project before configuring the app.

In Supabase, inspect the migration history and check for `public.profiles`, `public.fields`, `public.crop_observations`, and `public.observation_images`. Verify that each has RLS enabled, that the `crop-observations` bucket is private with owner-scoped object policies, and that the `save_crop_observation` function exists. If anything differs, review [the existing migration](supabase/migrations/20261120172701_phase2_field_observations.sql) against the hosted schema before applying any changes.

Enable email/password and confirmation in the development project’s Auth settings. Set the site URL to `http://localhost:3000`, allow `http://localhost:3000/auth/callback` and `http://localhost:3000/auth/callback?flow=recovery`, and configure email delivery and the [confirmation and recovery templates](supabase/templates/). Use two development accounts for field, photo, and access-isolation tests.

### Next.js

From the repository root, copy the frontend template and fill in the hosted project URL and publishable key. Set `APP_ORIGIN=http://localhost:3000`.

```powershell
Copy-Item frontend/.env.example frontend/.env.local
cd frontend
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). From `frontend/`, run `npm run typecheck`, `npm run lint`, and `npm run build`. Set the environment variables before building for a different environment.

### FastAPI

In a separate shell from the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Check [the health endpoint](http://127.0.0.1:8000/health). For Crop Doctor, set server-side `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` to the same project and publishable key as the frontend, and set `GEMINI_API_KEY`. FastAPI reads these from `backend/.env` (gitignored; copy `backend/.env.example`) unless they are already set in the process environment. Keep FastAPI on loopback for local development. The frontend targets port 8000 by default. Set the server-only `CROP_ANALYSIS_API_URL` if you use another backend origin. Save a wheat observation in Scanner, open it in Crop Doctor, and choose **Analyze saved photos**. Findings are saved to `crop_analyses` and reappear after reload.

### Gemini adapter tests

Run the tests from `backend/` without provider credentials:

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

To run a single provider smoke test, set the server-only `GEMINI_API_KEY` in the shell. The command defaults `GEMINI_MODEL` to `gemini-3.5-flash-lite`. Run `.\.venv\Scripts\python.exe -m crop_analysis path/to/approved-wheat.jpg` from `backend/`. This sends one photo to Gemini, prints validated findings, and leaves the database untouched.

### Crop Memory Engine

- **Verified historical** accepts two distinct wheat observations from the authenticated owner’s same field, each with a confirmed date and valid photos. It calculates actual calendar days. The recommended interval is 15–25 days, and any positive interval is supported.
- **Illustrative dataset** compares unrelated attributed photos as visual examples. The sample screen links to the source and license. Capture dates, plot identities, and growth-stage labels are unverified for these samples, so the preview shows no intervals or inferred progression.

The independent Python service shares the existing Gemini configuration, validates the model’s structured findings, and keeps visual evidence separate from interpretations. Run both adapter suites with `.\.venv\Scripts\python.exe -m unittest discover -s tests -v` from `backend/`. The app calls `POST /comparisons` (two observations of the same owned wheat field on different dates) and `POST /comparisons/illustrative` (the attributed samples). Both save to `crop_comparisons`.

The sample command and the web preview use the same attributed image catalog. From `backend/`, run `.\.venv\Scripts\python.exe -m crop_analysis.compare_samples --sources` to inspect the provenance offline. With a configured server-side Gemini key, omit `--sources` to send the two sample photos for an illustrative comparison. This command prints findings and does not save a report.

The [Phase 4 migration](supabase/migrations/20261120185204_phase4_crop_comparisons.sql) defines owner-scoped comparison storage. It was tested with PostgreSQL fixtures and applied to the hosted CropShield project.

### Reminders

Reminders are stored in the owner-scoped `reminders` table ([migration](supabase/migrations/20261121080000_analyses_and_reminders.sql)). Open reminders that are overdue or due within seven days appear in the header notifications. Reminders are shown only in the app; no email or SMS is sent.

### Farmer Assistant and report rendering

The independent assistant service accepts a compact field context assembled by the server. It checks the owner, reuses the Gemini adapter for English or Urdu, and returns referenced records separately from missing data. The web screen uses saved field options and the account’s preferred language. The app calls `POST /assistant` with a field ID. FastAPI builds the context from the caller's latest observation, saved analysis, comparison, live forecast, and next reminder. Conversations are not stored.

The independent report builders create Crop Health, Growth Comparison, and Weather Risk PDFs from supplied structured records. The renderer embeds validated local image bytes and adds no generated measurements or report summaries. Weather reports require a field-matched forecast with an issue timestamp and source. FastAPI serves `GET /reports/health/{observation_id}`, `/reports/comparison/{comparison_id}`, and `/reports/weather/{field_id}` as PDFs. The Reports page downloads them through the authenticated Next.js route `/api/reports/[kind]/[id]`. The weather report shows the forecast retrieval time, because Open-Meteo does not publish an issue time.

Run the assistant and report tests with `.\.venv\Scripts\python.exe -m unittest discover -s tests -v` from `backend/`.

Sample wheat photos are by [Marek Studzinski](https://unsplash.com/photos/UQEpP1nll1A), [Leonardo Baldissara](https://unsplash.com/photos/TdiU8Q4ejH8), and [Jatin Punia](https://unsplash.com/photos/PLrAAPUfGIQ) on Unsplash. They illustrate the interface and are not evidence from the sample fields.

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
- **AI Guide** helps signed-in users navigate the portal and highlights existing page controls in optional walkthroughs. Open it from the floating button, then choose English or Urdu in the guide’s language menu. Suggested questions and common workflows work locally. Contextual explanations use the existing FastAPI and Gemini configuration and fall back to page instructions if the provider is unavailable.
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

### One-command local startup

After completing the one-time setup below (`frontend/.env.local`, `npm ci` in `frontend/`, and `backend/.venv` with `backend/.env`), start both services from the repository root:

```powershell
npm run dev
```

The root `npm run dev` runs `scripts/dev.mjs` (Node.js built-ins only, no extra packages or Docker). It:

- checks that both env files define the Supabase URL and publishable key, that frontend dependencies and the backend virtual environment exist, and warns when `GEMINI_API_KEY` is missing;
- refuses to start when port 3000 or 8000 is in use, or when another Next.js dev server already holds `frontend/.next/dev/lock`;
- starts FastAPI with `uvicorn --reload` and the frontend's own `npm run dev`, both bound to `127.0.0.1`, and points the frontend at that backend through `CROP_ANALYSIS_API_URL`;
- prefixes output with `[web]` and `[api]`, and appends each service's output to `logs/web.log` and `logs/api.log` (gitignored);
- stops both process trees on Ctrl+C, and stops the other service if one exits unexpectedly.

Use `npm run dev -- --web-port 3100 --api-port 8100` (or `CROPSHIELD_WEB_PORT` / `CROPSHIELD_API_PORT`) for other ports, and `npm run dev:check` to run only the configuration and port checks. The two services can still be started separately as described below. If the launcher itself is force-killed (for example from Task Manager), stop any leftover `node`/`python` children manually.

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

### Vercel production

The private GitHub repository deploys two projects from `main`. The [Next.js app](https://cropshield-ai-theta.vercel.app) uses `frontend/`. The [FastAPI service](https://cropshield-ai-api.vercel.app/health) uses `backend/`. Configure the frontend's `APP_ORIGIN` and `CROP_ANALYSIS_API_URL` with those production origins. Keep `GEMINI_API_KEY` in the backend project's sensitive production environment variables. Retain the production callback and recovery URLs in Supabase Auth.

The hosted Scanner accepts up to three photos with a 4 MB combined limit to leave room for multipart metadata under the Vercel Function request cap. The local limit stays at 10 MB per photo.

### CropEvidence photo quality and comparison readiness

In **Crop Scanner**, select one to three JPEG, PNG, or WebP photos and review each capture warning. Use **Find reference photos** to select an earlier private photo for the same field and view it beside the first new preview. Use similar height, direction, crop section, and light. Add a focused leaf close-up when useful. You can remove and replace a photo or save valid photos with a warning. **Crop Doctor** and the **My Fields** observation timeline show saved assessments when available.

The FastAPI capture check uses Pillow and does not call Gemini. It validates the still image format and existing size limits (10 MB and 32 megapixels), applies EXIF orientation, and downsamples a grayscale copy to a maximum side of 384 px. A shorter original side below 480 px flags low resolution. Mean luminance below 45 or above 215, or more than 65% of pixels in the dark (0–20) or bright (235–255) bins, flags exposure. Mean squared adjacent-pixel differences below 24 flag low detail. This can indicate blur or a smooth subject. The thresholds are heuristics, not validated confidence scores.

In **Crop Memory**, select **Check comparison readiness** before running Gemini. Historical readiness uses the owner-scoped saved field ID and two distinct stored observation dates. It checks all photos for readability and capture warnings, then screens the leading photos for luminance difference over 45, aspect-ratio difference by a factor over 1.35, and shorter-side resolution difference by a factor over 2. Readiness is **Suitable**, **Limited comparability**, or **Unsuitable**. Unsuitable pairs are blocked on the server. Illustrative samples can be used for visible differences and never receive a historical interval. Saved dates are farmer records. Measurements cannot confirm field identity, capture dates, crop progression, angle, or subject coverage. Crop Doctor and Crop Memory can use their existing Gemini reviews to describe visible obstructions and viewpoints. The standalone capture check remains available without Gemini.

Apply `supabase/migrations/20261122090000_crop_evidence.sql` in the intended Supabase environment to persist photo assessments. The optional column is written by the existing atomic save RPC under caller permissions. Existing records remain readable and old clients may omit the assessment. Readiness is stored in the existing comparison result JSON. No storage policy or bucket changes are required.

### AquaGuard, RustWatch, and GrainSafe

- **AquaGuard** shows Open-Meteo recent modeled precipitation and forecasts in field-local dates, alongside farmer irrigation and soil records. It suggests inspection when all three complete recent days have under 1 mm precipitation, when a forecast high reaches 35 °C in the first three forecast rows, or when the latest soil record is dry. Missing rainfall stays missing. These triggers do not calculate a water volume or schedule.
- **RustWatch** uses a wheat observation uploaded through Crop Scanner. FastAPI checks the authorized photos with CropEvidence, then asks Gemini to describe visible signs when readable photos and Gemini are available. The result is possibly consistent, signs not seen, or inconclusive. Farmers can log review requested or feedback received. A reviewer does not sign off inside the app. Reports and precise field coordinates are not published or aggregated.
- **GrainSafe** keeps storage batches and dated inspections separate from growing-crop observations. Measurements are optional. Configured batch thresholds trigger inspection cautions at or above the entered values, and reported spoilage or contamination concerns call for qualified review. Missing measurements and absent thresholds remain explicit. The module does not assess food safety from images or certify grain for consumption.

Each module record can set a next inspection date (UTC). The latest record per field (AquaGuard, RustWatch) or batch (GrainSafe) sets the current date, so saving a newer record replaces it. Dates that are overdue or due within 7 days appear in the workspace notification bell, and all current dates are listed under **Module inspection dates** on the Reminders page. No email or push notifications are sent. Open GrainSafe’s Assistant link to ask about the selected private batch. For irrigation and rust records, select the relevant field in the Assistant.

Farmers can delete their own module records and storage batches (deleting a batch also deletes its inspections), and can change a RustWatch entry's farmer-recorded review status without re-running the image review. The stored image review text itself cannot be edited. RustWatch retries a brief Gemini overload once and then tries the Assistant's fallback model; if both are unavailable the entry is saved as inconclusive with "Photo review unavailable".

Apply the additive `supabase/migrations/20261122095145_agricultural_modules.sql` and `supabase/migrations/20261123090000_module_review_and_delete.sql` migrations in the intended environment before using module persistence. They add two owner-scoped tables, owner-only delete policies, and an owner-only `review_status` update limited to rust records, and keep the existing private photo bucket and policies. See [architecture](docs/ARCHITECTURE.md) for data flow and [test results](docs/FINAL_TEST_RESULTS.md) for verification scope.

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

The sample command uses the attributed copies bundled in `backend/crop_analysis/sample_data`. Keep those files in sync with the web preview catalog and images when updating the examples. From `backend/`, run `.\.venv\Scripts\python.exe -m crop_analysis.compare_samples --sources` to inspect the provenance offline. With a configured server-side Gemini key, omit `--sources` to send the two sample photos for an illustrative comparison. This command prints findings and does not save a report.

The [Phase 4 migration](supabase/migrations/20261120185204_phase4_crop_comparisons.sql) defines owner-scoped comparison storage. It was tested with PostgreSQL fixtures and applied to the hosted CropShield project.

### Reminders

Reminders are stored in the owner-scoped `reminders` table ([migration](supabase/migrations/20261121080000_analyses_and_reminders.sql)). Open reminders that are overdue or due within seven days appear in the header notifications. Reminders are shown only in the app; no email or SMS is sent.

### Farmer Assistant and report rendering

The independent assistant service accepts a compact field context assembled by the server. It checks the owner, reuses the Gemini adapter for English or Urdu, and returns referenced records separately from missing data. The web screen uses saved field options and the account’s preferred language. The app calls `POST /assistant` with a field ID. FastAPI builds the context from the caller's latest observation, saved analysis, comparison, live forecast, and next reminder. Conversations are not stored.

The independent report builders create Crop Health, Growth Comparison, and Weather Risk PDFs from supplied structured records. The renderer embeds validated local image bytes and adds no generated measurements or report summaries. Weather reports require a field-matched forecast with an issue timestamp and source. FastAPI serves `GET /reports/health/{observation_id}`, `/reports/comparison/{comparison_id}`, and `/reports/weather/{field_id}` as PDFs. The Reports page downloads them through the authenticated Next.js route `/api/reports/[kind]/[id]`. The weather report shows the forecast retrieval time, because Open-Meteo does not publish an issue time.

Run the assistant and report tests with `.\.venv\Scripts\python.exe -m unittest discover -s tests -v` from `backend/`.

Sample wheat photos are by [Marek Studzinski](https://unsplash.com/photos/UQEpP1nll1A), [Leonardo Baldissara](https://unsplash.com/photos/TdiU8Q4ejH8), and [Jatin Punia](https://unsplash.com/photos/PLrAAPUfGIQ) on Unsplash. They illustrate the interface and are not evidence from the sample fields.

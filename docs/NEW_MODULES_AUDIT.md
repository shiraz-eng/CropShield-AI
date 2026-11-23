# New modules audit: AquaGuard, RustWatch, GrainSafe and unified startup

Date: 2026-11-23. Scope: the three agricultural modules and a one-command local startup. Codex had already built most of the modules before this audit started (untracked files plus migration `20261122095145_agricultural_modules.sql`, which was already applied to hosted Supabase). This audit kept that work, verified it, and filled the gaps listed below.

## Reused infrastructure (no duplicates added)

| Concern | Reused component |
| --- | --- |
| Authentication | Supabase SSR session in Next.js; FastAPI `session()` forwards the caller's JWT so RLS applies end to end |
| Data | Hosted Supabase project `CropShield_Ai`; module data in `grain_batches` and `agricultural_records` (owner-scoped FKs to `fields`, `crop_observations`) |
| Photos | Existing private `crop-observations` bucket and Crop Scanner upload; RustWatch reads authorized photos through the existing `Session.photos` |
| Photo quality | CropEvidence `photo_quality()` (Pillow, no Gemini) |
| AI | Existing `GeminiCropAnalysis.generate_findings` with schema-validated output and the Assistant's overload retry and fallback model |
| Weather | Open-Meteo through `weather.irrigation_weather` (recent modeled rain plus 7-day forecast in field-local dates and metric units) |
| Reminders | Workspace notification bell (`DemoProvider` notices) and the Reminders page |
| Assistant | `_field_context` / `_batch_context` add irrigation, rust and storage records as owner-scoped context |

## Module status

| Module | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| AquaGuard | Field-specific irrigation history and observations | PASS | E2E: record saved, listed in history, last irrigation date updated |
| AquaGuard | Real rainfall and temperature forecasts | PASS | E2E: live Open-Meteo, Asia/Karachi dates, 3 recent and 7 forecast rows |
| AquaGuard | Explainable inspection cautions | PASS | Each caution states its rule (three recent days under 1 mm, forecast high at or above 35 °C, latest soil record dry); unit tests cover thresholds |
| AquaGuard | Missing data | PASS | Unmeasured moisture shows "not measured"; null rain shows "unavailable"; missing days produce an explicit caution |
| AquaGuard | Reminders | PASS (added) | Inspection date appears in the bell and on Reminders |
| AquaGuard | No invented soil moisture or irrigation amounts | PASS | No volume or schedule is calculated; moisture is only farmer-entered |
| RustWatch | Wheat-leaf photo upload and quality checks | PASS | Uses Crop Scanner uploads; CropEvidence capture checks are stored per record |
| RustWatch | Reuses Gemini analysis | PASS | `generate_findings` with a restricted schema (`possibly_consistent` / `signs_not_seen` / `inconclusive`) |
| RustWatch | Persists suspected observations and review status | PASS (extended) | Review status is now an updatable `review_status` column; E2E change persisted after reload |
| RustWatch | Location privacy | PASS | Gemini receives only image parts (unit test); coordinates are not stored in rust records |
| RustWatch | Never labels findings as confirmed | PASS | Schema rejects `confirmed`; DB check rejects `confirmed` review status; UI says "suspected, not confirmed" |
| GrainSafe | Batch management (type, quantity, dates, method) | PASS (extended) | Create and list existed; delete added (cascades to inspections) |
| GrainSafe | Farmer-entered moisture, temperature, humidity | PASS | All optional; missing values stay explicit |
| GrainSafe | Inspection history, caution rules, reminders | PASS | E2E: humidity 72 % against a 70 % trigger produced a caution; inspection date in the bell |
| GrainSafe | No safety or moisture inferred from images | PASS | No image input; UI states it does not certify food safety |
| All | Navigation, dashboard, RLS, Assistant context | PASS | Sidebar entries, dashboard counts, RLS probe, Assistant cited irrigation and rust records |
| Startup | One documented command | PASS (added) | `npm run dev` at repository root |

## Defects found and fixed

| ID | Severity | Defect | Fix |
| --- | --- | --- | --- |
| D1 | P0 | Hosted DB lacked `observation_images.photo_quality`, but `frontend/lib/farm-data.ts` selects it, so observation lists (including RustWatch's photo picker) would fail with Postgres error 42703 | Applied the pending `20261122090000_crop_evidence.sql` (user-approved) |
| D2 | P1 | No update or delete for module records or batches; review status could only change by re-running Gemini | Migration `20261123090000_module_review_and_delete.sql`, three new endpoints, UI controls |
| D3 | P1 | Module inspection dates were not surfaced as reminders | Bell notices and a Reminders page section derived from the latest record per field or batch |
| D4 | P1 | FastAPI 422 validation errors showed "The AI service is unavailable" | `backendError` now shows the first validation message |
| D5 | P1 | React 19 form actions cleared every field after a failed save | Hydrated forms submit inside a transition and reset only after success; the server-action `action` prop remains the pre-hydration fallback (a first attempt without it caused a GET with values in the URL; caught and fixed in E2E) |
| D6 | P1 | RustWatch did not retry Gemini 503s and hid the reason; one save took 63 s and fell back to "Photo review unavailable" | Retry once, then the Assistant's fallback model; reason logged. Same overload later saved in 8.8 s |
| D7 | P2 | Workspace layout queried module inspections sequentially | Moved into the existing `Promise.all` |
| D8 | P2 | Notification panel description and dashboard plurals were inaccurate | Text fixed |

## Unified startup design

`scripts/dev.mjs` uses Node built-ins only. It validates env files without printing values, checks ports on loopback and wildcard addresses, detects a live Next dev lock, binds both services to 127.0.0.1, reuses `frontend`'s own `npm run dev`, writes per-service logs under `logs/`, and kills both process trees (`taskkill /T` on Windows, process groups elsewhere) on Ctrl+C or when either service exits.

## Remaining limitations

- No in-app sign-off by a qualified reviewer; review status is farmer-recorded.
- Inspection reminders are in-app only (no email or push).
- AquaGuard page load is about 4.5–6 s in dev: the irrigation endpoint makes about six sequential Supabase reads (about 0.2 s each, about 0.5 s for a new TLS connection) plus Open-Meteo (about 0.55 s). Parallelizing those reads is a reasonable next step.
- A second Supabase account was not available, so cross-user isolation was tested with a random `auth.uid()` in a rolled-back transaction rather than with two signed-in users.
- If the launcher is force-killed, its child processes can survive on Windows.

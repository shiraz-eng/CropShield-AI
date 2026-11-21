# Handoff

## Current phase

Claude handover (2026-11-21): the signed-in end-to-end rehearsal passed 29/29 on a local production build. Start with [the live demo checklist](docs/LIVE_DEMO_CHECKLIST.md) and [the handover audit](docs/CLAUDE_HANDOVER_AUDIT.md).

## Implemented

- Supabase SSR authentication pages, email link handling, password reset, sign-out, and server-verified workspace access.
- Persistent field editing and archival, private crop photos, dated observations and notes, and real dashboard totals.
- A migration for profiles, fields, crop observations, and image references. Row-level policies, owner-bound foreign keys, and immutable photo references protect the field history.
- An isolated wheat-only Gemini adapter with image decoding, strict structured-output validation, and mocked provider tests.
- A standalone smoke command for one approved wheat photo that prints validated findings without creating a database record.
- A local FastAPI entry point and separate environment templates for Next.js and Python.
- A historical comparison service that validates same-owner, same-field wheat observations and calculates an interval from confirmed dates.
- An illustrative comparison service and sourced photo preview that omit historical claims for unrelated samples. Both Python modes validate Gemini findings with the existing adapter.
- A shared sample catalog, an offline provenance command, and an additive owner-scoped `crop_comparisons` migration.
- An English and Urdu Gemini assistant service that rejects cross-owner context and unavailable source references. The workspace screen shows its unavailable state instead of simulated replies.
- Structured Crop Health, Growth Comparison, and Weather Risk report builders with an in-memory PDF renderer.
- A final module audit, evaluation runner and protocol, survey questionnaire, research notes, judges’ Q&A, and presentation and demo materials.

## Verification and blockers

- The migration applied against PostgreSQL fixtures. Two test identities verified owner isolation, archive restrictions, storage policy predicates, and transaction rollback.
- TypeScript, ESLint, and the production build passed. Edge verified unauthenticated redirects and the auth screens at 390 px.
- Next.js started directly and redirected anonymous dashboard requests to login. FastAPI started from the local virtual environment and returned `{"status":"ok"}` from `/health`.
- All 25 Python tests passed without provider credentials. They cover adapter validation, ownership, provenance, Urdu response direction, report validation, image embedding, and evaluation scoring. A sample PDF was visually checked during Phase 6.
- The Phase 7 production browser smoke passed on desktop and at 390 px. The webpack development fallback restored login after a Turbopack PostCSS error. The [final audit](docs/FINAL_AUDIT.md) records route checks, security findings and blocked hosted flows.
- A read-only check of the only visible hosted project, `atelier-arc`, found no public tables, migration history, crop photo bucket, or observation-save function. Its intended use for CropShield is unconfirmed. Hosted signup, private photo retrieval, field persistence, and cross-user isolation require the intended development project.
- One authorized sample wheat photo returned a schema-valid Gemini response. The adapter still has no application endpoint or persistence.
- PostgreSQL fixtures verified comparison insert and retrieval, cross-account isolation, matching dates and photo references, deduplication, and separation of the two modes.
- Phase 4 endpoints, hosted persistence, saved timeline results, and live testing remain pending. The earlier Gemini key was scoped to the previous smoke process.
- Phase 6 authenticated conversation endpoints, conversation persistence, report summaries, saved report downloads, and live field-context retrieval remain pending. Weather context still has no verified forecast service.

## Relevant commands

- Follow the [README](README.md) to configure the hosted project in `frontend/.env.local`.
- In `frontend/`, run `npm run dev`, `npm run typecheck`, `npm run lint`, and `npm run build`.
- In `backend/`, create `.venv`, install `requirements.txt`, and run `python -m uvicorn main:app --host 127.0.0.1 --port 8000` with the virtual environment’s interpreter.

## Earlier next action (superseded)

Confirm the event requirements and rehearse the [offline demo](docs/DEMO_SCRIPT.md). For an integrated demonstration, confirm the hosted development project, verify the two-account Auth and private Storage flows, and connect the analysis and comparison endpoints before enabling the later workflows. Use a reviewed holdout before making model-performance claims.

## Phase 8 presentation

- The nine-slide editable pitch, rendered PDF, five-minute script, and evidence register are indexed in [presentation/README.md](presentation/README.md).
- The Phase 8 run captured the three public auth screens, verified eight protected redirects and FastAPI health, and passed all 25 Python tests. The [verification report](presentation/VERIFICATION.md) records the limits of hosted, live AI, weather, and historical comparison evidence.

## Hackathon video repair

- The [video repair audit](demo-video/VERIFICATION.md) records nine protected-route redirects, the verified public auth recording, and the remaining integration gates. The five-minute export is blocked pending a working signed-in workflow.

## Hosted database deployment

- Both CropShield migrations were applied to Supabase project `CropShield_Ai` (`ulcwobgectewilwmelrn`) on the project’s main database. The checkout is linked to that project.
- A read-only catalog query verified both migration versions, row-level security on all five application tables, three photo policies, and the private `crop-observations` bucket. Hosted browser sign-in, field persistence, and cross-user photo checks remain pending.

## Crop Doctor integration

- Scanner links a saved observation to the live Crop Doctor flow. FastAPI validates the Supabase token and reads the observation and private photos with the owner's permissions before calling Gemini. The view displays the result for the current visit.
- Hosted end-to-end analysis requires a confirmed test session, saved wheat observation, and server-side Gemini key. Comparison, assistant, live weather, and authenticated report delivery remain separate integration work.

## Current execution checks

- Weather Guardian now loads real Open-Meteo forecasts for saved fields with coordinates. The direct adapter smoke returned seven days and the frontend production build passed.
- The [execution audit](docs/FINAL_EXECUTION_AUDIT.md), [test results](docs/FINAL_TEST_RESULTS.md), and [live checklist](docs/LIVE_DEMO_CHECKLIST.md) record the current evidence. The signed-in rehearsal and final video remain gated.

## Authorized signed-in QA

- Hosted Chromium verified sign-in, field and private photo persistence, invalid file rejection, logout, and cross-account denial at the UI, REST, Storage, and Crop Doctor boundaries.
- Fixed a server-to-client icon serialization error and verified the saved-field Open-Meteo forecast in the browser. Authenticated Gemini still returns HTTP 503. The [live checklist](docs/LIVE_DEMO_CHECKLIST.md) and [final verification](docs/FINAL_VERIFICATION.md) record evidence and remaining gates.

## Claude handover (2026-11-21)

- Wired the remaining modules to real data. Crop Doctor findings are saved (`crop_analyses`). Crop Memory historical and illustrative comparisons are saved (`crop_comparisons`). Reminders are persisted with notifications. The English/Urdu assistant answers from saved records. Reports download as PDFs. Fixture screens were removed from the signed-in app.
- Applied the user-approved additive migration `20261121080000_analyses_and_reminders.sql` to `CropShield_Ai`. A read-only catalog check confirmed RLS and owner policies.
- Codex's Gemini 503 traced to its key. With the user-supplied key in gitignored `backend/.env`, live analysis (3.1 s), illustrative comparison (4.4 s), and English/Urdu assistant answers (1.3–1.4 s) returned schema-valid output.
- Checks: 34/34 Python tests, typecheck, lint, production build, anonymous redirects. See [test results](docs/CLAUDE_TEST_RESULTS.md) and [repair log](docs/CLAUDE_REPAIR_LOG.md).
- Signed-in rehearsal: 29/29 PASS after fixing an assistant 422 (strict UUID body), stale notifications, and a server-to-client icon crash on Reports and the Crop Doctor index. QA records are listed in the checklist. Checks are now 35/35 Python tests, typecheck, lint, and build.
- Not yet run in the browser: verified-historical Crop Memory (needs genuine dated same-field photos), a second-account check on the new tables, and the mobile workspace.
- Risks: `backend/.venv` is built on Codex's bundled Python and there is no system Python. The Gemini key was shared in chat and must be rotated.

## Next action

Install Python 3.11+ and recreate `backend/.venv`, then re-run the 29 steps on that setup. Decide whether the video shows the illustrative Crop Memory mode (labeled) or uses genuine dated photos for the historical mode. Then record. Rotate the Gemini key afterwards.

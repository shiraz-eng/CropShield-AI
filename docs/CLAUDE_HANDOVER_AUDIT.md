# Claude handover audit

Date: 2026-11-21. Auditor: Claude (taking over from Codex). Scope: repository-grounded audit and repair of the working tree on `main` (2 commits plus a large uncommitted Codex change set).

**Update (same day): the signed-in end-to-end rehearsal passed 29/29** after three in-run fixes. See the [live demo checklist](LIVE_DEMO_CHECKLIST.md). The module table below records the pre-rehearsal state; the remaining risks are listed under [Blockers](#blockers).

## Existing state at handover

| Area | What the code actually did |
| --- | --- |
| Frontend | Next.js 16 App Router (`frontend/`), Supabase SSR auth, `proxy.ts` redirects anonymous requests. Fields, Scanner and Weather Guardian read real data. Crop Doctor index, Reminders, Reports, notifications, dashboard comparison/weather cards and the no-field weather view rendered **fixtures** from `lib/data.ts`. Assistant showed "Conversations are currently unavailable." |
| Backend | FastAPI (`backend/main.py`) with `/health` and one endpoint, `POST /observations/{id}/analysis`. Comparison, assistant and report services existed as Python libraries only, with no HTTP route. |
| Auth / DB | Hosted Supabase `CropShield_Ai` (`ulcwobgectewilwmelrn`), linked via CLI. 2 migrations applied. RLS on 5 tables. No tables for analyses, reminders, conversations or reports. |
| Image storage | Private `crop-observations` bucket, 10 MB, JPEG/PNG/WebP, owner-scoped insert/select/delete policies. Signed URLs (5 min). |
| Gemini | `gemini-3.5-flash-lite` via `google-genai`. Codex's authenticated run returned HTTP 503 (`provider_error`); no key was available to this session at start. |
| Weather | Open-Meteo, server-side, 7 days, thresholds 25 mm/day and 35 °C. |
| Reports | ReportLab PDF renderer with unit tests; no web download. |
| Tests | 27 Python unittest cases. Codex Playwright scripts in `.cache/*.cjs` (gitignored) used a service-role key from its own process environment. |
| Uncommitted work | ~35 modified/deleted and ~50 untracked paths from Codex (routes moved to `app/(workspace)/`, backend, migrations, docs, evidence). All preserved. `docs/~$CropShield-AI-Hackathon.pptx` is an Office lock file; do not commit it. |

## Module audit

Status legend: PASS = verified by real execution in this session; PASS (Codex) = verified by Codex's signed-in run with evidence on disk, not re-run by Claude; PARTIAL = part verified; BLOCKED = could not execute; NOT IMPLEMENTED = absent at handover.

| # | Feature | Location | Expected | Actual tested behavior | Status | Evidence | Correction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Auth & protected routes | `frontend/proxy.ts`, `lib/auth-actions.ts`, `app/(workspace)/layout.tsx` | Login, session, logout, redirects | 8 protected routes plus the new report API return 307 → `/login` anonymously (Claude). Signed-in login, reload and logout verified by Codex. | PARTIAL | [test results](CLAUDE_TEST_RESULTS.md); [Codex run](../demo-video/evidence/final-qa/authenticated-verified.txt) | Re-run signed-in with a QA session |
| 2 | Dashboard | `components/dashboard.tsx`, `lib/farm-data.ts` | Real totals, live links | Owner-scoped counts. "Demo" comparison/weather cards removed. | PARTIAL | Codex screenshot `qa-dashboard.png` | Signed-in check |
| 3 | My Fields & observations | `components/fields.tsx`, `lib/farm-actions.ts` | Create/edit/archive, dated observations | Unchanged. Create, reload and cross-account denial verified by Codex. | PASS (Codex) | `authenticated-verified.txt` | — |
| 4 | Crop Scanner & upload | `components/scanner.tsx`, `save_crop_observation` RPC | Validated private upload | Unchanged. Upload persists, bad file rejected, visitor denied (Codex). | PASS (Codex) | `qa-observation.png` | — |
| 5 | AI Crop Doctor | `app/(workspace)/crop-doctor/page.tsx`, `components/saved-crop-analysis.tsx`, `backend/crop_analysis/api.py` | Gemini findings shown and retained | **Was:** findings lost on reload; index page was fixtures; 503 from provider. **Now:** persisted to `crop_analyses`, index lists real observations, photos shown, PDF link. Live Gemini adapter returned schema-valid findings in 3,057 ms. In-app run not executed. | PARTIAL | `docs/evidence/claude/` + smoke output in [test results](CLAUDE_TEST_RESULTS.md) | Signed-in run |
| 6 | Crop Memory Engine | `components/comparison.tsx`, `POST /comparisons`, `POST /comparisons/illustrative` | Same-field dated comparison; labeled illustrative mode | **Was:** photo preview only. **Now:** historical form (same field, different dates, interval shown, 15–25 day guidance) and illustrative run, both saved to `crop_comparisons`. Live illustrative Gemini comparison: 4,365 ms, no interval or symptom-change claims. | PARTIAL | [illustrative-comparison.json](evidence/claude/illustrative-comparison.json) | Signed-in run; genuine dated same-field photos for historical mode |
| 7 | Weather Guardian | `app/(workspace)/weather/page.tsx`, `lib/field-forecast.ts`, `backend/crop_analysis/weather.py` | Live forecast and cautions | Live forecast rendered signed-in (Codex). Backend forecast fetched live (Claude). Threshold logic unit-tested. No-field fallback no longer shows a fixed fake forecast. | PASS | `weather-verified.txt`; `assistant-and-pdf.txt` | — |
| 8 | Reminders & notifications | `components/reminders.tsx`, `lib/reminder-actions.ts`, `reminders` table | Create, complete, persist | **Was NOT IMPLEMENTED:** browser-memory state over fixture fields; fixture notifications. **Now:** owner-scoped table with RLS; add, complete, reopen and delete; header notifications = open reminders due within 7 days. In-app only (no email/SMS). | BLOCKED | Migration catalog check | Signed-in run |
| 9 | English/Urdu Assistant | `components/assistant.tsx`, `POST /assistant` | Grounded answers in both languages | **Was NOT IMPLEMENTED** in the app. **Now:** context built server-side from the caller's latest observation, analysis, comparison, forecast and next reminder. Live Gemini on a labeled synthetic context: English 1,331 ms (LTR), Urdu 1,419 ms (RTL), correct source/missing lists. | PARTIAL | [assistant-and-pdf.txt](evidence/claude/assistant-and-pdf.txt) | Signed-in run. One English answer named "soil analysis" as a missing record, which is not a real source; prompt tuning optional |
| 10 | Reports & PDF | `components/reports.tsx`, `app/api/reports/[kind]/[id]/route.ts`, `GET /reports/*` | Reports from saved data, PDF download | **Was:** fixture reports, no download. **Now:** Crop Health (needs saved analysis), Growth Comparison, Weather Risk PDFs streamed through an authenticated proxy. Fixture `/reports/[id]` removed. PDF rendering unit-tested; live-forecast weather PDF rendered. | PARTIAL | [weather-report-fixture.pdf](evidence/claude/weather-report-fixture.pdf) | Signed-in download |
| 11 | Settings & responsive UI | `components/settings.tsx` | Save profile; usable at 390 px | Name and language persist (Codex). Units, interval and notification toggles are session-only. Mobile verified only for auth screens. | PARTIAL | Codex `login-mobile.png` | Mobile workspace pass |
| 12 | Backend/frontend integration | `lib/backend.ts`, `lib/crop-analysis-action.ts` | UI completes every operation | All screens now call real services. The backend helper is not exported as a server action, so the browser can't reach arbitrary backend paths. Production build passes. | PARTIAL | build log | Signed-in run |
| 13 | Supabase RLS & storage | `supabase/migrations/*` | Owner-only data, private photos | Read-only catalog: RLS on all 7 public tables, owner policies, private bucket, no anon table grants. Codex verified real cross-account denial at UI, REST, Storage and API. | PASS | catalog output in test results | Re-check cross-account on the new tables |
| 14 | Performance & errors | backend, actions | Bounded latency, clear errors | Gemini 1.3–4.4 s. 90 s action timeout, 25 s Gemini timeout. Provider failures now log status codes. Failed persistence returns 503 instead of silently succeeding. | PARTIAL | test results | Signed-in timings |

## Root cause of the Gemini 503

`AnalysisUnavailable("provider_error")` maps to 503 and swallowed the provider status. The key in Codex's process was scoped to an earlier smoke run (per HANDOFF). With the key the user supplied, the same adapter and model returned valid findings. Provider status codes are now logged (no secrets) for future diagnosis.

## Blockers

1. **Resolved:** the user signed in through the browser pane and the 29-step journey passed. Still open: verified-historical Crop Memory in the browser (needs genuine dated photos), a second-account isolation check on the new tables, and a mobile workspace pass.
2. **Backend Python depends on Codex.** `backend/.venv` is built on `C:\Users\bianry\.cache\codex-runtimes\...\python`. There is no system Python on this PC. Install Python 3.11+ and recreate the venv before the demo.
3. **Gemini key exposure.** The key was pasted into chat. It lives only in gitignored `backend/.env`. Rotate it after the demo.
4. **Historical Crop Memory needs genuine evidence.** Dated photos of the same field taken on different days. Without them, use the labeled illustrative mode on camera.

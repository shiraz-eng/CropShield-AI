# Claude test results

All results below come from commands run on 2026-11-21 in this checkout. Nothing is simulated. Rows marked "(Codex)" cite Codex's earlier evidence and were not re-run.

## Summary

| Check | Command | Result |
| --- | --- | --- |
| Python unit tests (baseline) | `backend\.venv\Scripts\python.exe -m unittest discover -s tests` | 27 passed, 0 failed |
| Python unit tests (after repairs) | same | **35 passed, 0 failed** (8 new in `tests/test_api_endpoints.py`, including the HTTP body regression test) |
| TypeScript | `npm run typecheck` (frontend) | Passed |
| ESLint | `npm run lint` | Passed. Two React-hooks errors in new code were fixed before passing |
| Production build | `npm run build` | Passed: 19 routes plus the proxy, including `/api/reports/[kind]/[id]` |
| Anonymous route protection | `curl` against `next start` on `127.0.0.1:3200` | 8/8 workspace routes and the report API returned 307 → `/login` |
| Backend auth rejection | `curl` against uvicorn on `127.0.0.1:8010` | Invalid bearer → 401 on `/reports/weather/{id}`. Missing bearer with empty body → 422 (body validation runs first; no data returned) |
| Backend health | `GET /health` | `{"status":"ok"}` |
| Supabase migration dry run | `supabase db push --linked --dry-run` | Only `20261121080000_analyses_and_reminders.sql` pending |
| Supabase migration apply | `supabase db push --linked --yes` (user-approved) | Applied |
| Supabase catalog (read-only) | `supabase db query --linked --read-only` | RLS true on `crop_analyses`, `reminders` and the 5 existing tables. 6 new owner policies. Bucket private, 10 MB, JPEG/PNG/WebP. No anon grants on public tables |
| Live Gemini crop analysis | `python -m crop_analysis frontend/public/crops/close.jpg` | `completed`, `grain_development`, Zadoks 70–79, adequate quality, 3,057 ms |
| Live Gemini illustrative comparison | `python -m crop_analysis.compare_samples` | `grain_development → ripening`, comparability `limited`, no interval or symptom-change claims, 4,365 ms. [Output](evidence/claude/illustrative-comparison.json) |
| Live Gemini assistant, English | `answer_question` on a labeled synthetic context with a live forecast | LTR, 1,331 ms, sources `[weather]`, 4 missing sources reported. [Output](evidence/claude/assistant-and-pdf.txt) |
| Live Gemini assistant, Urdu | same | RTL, Urdu script, 1,419 ms, same source handling |
| Live Open-Meteo (backend) | `field_forecast(…, 31.42, 73.08)` | 7 days, retrieved 2026-11-21T08:33:37Z, caution `Normal` |
| Weather PDF | `render_pdf(weather_report(…))` | 2,026-byte valid PDF. [File](evidence/claude/weather-report-fixture.pdf) |
| Signed-in browser journey | built-in browser on `127.0.0.1:3200`, user signed in | **29/29 PASS** after 3 in-run fixes. See the [live demo checklist](LIVE_DEMO_CHECKLIST.md) |
| Signed-in login, field, upload, logout, cross-account | (Codex) | PASS per [Codex run](../demo-video/evidence/final-qa/authenticated-verified.txt) |
| Signed-in weather | (Codex) | PASS per [weather retest](../demo-video/evidence/final-qa/weather-verified.txt) |

## New unit tests (`backend/tests/test_api_endpoints.py`)

All use a mocked Supabase transport; no network or Gemini call is made.

1. Analysis is persisted with the caller's `user_id` and observation id.
2. A rejected analysis insert returns 503 instead of reporting success.
3. Crop Health PDF returns 409 without a saved analysis.
4. Crop Health PDF renders `%PDF` from a saved analysis plus a stored photo.
5. Assistant on a field the caller does not own returns 404 and never builds a Gemini client.
6. Weather thresholds produce dated `Caution` (≥35 °C) and `High Risk` (≥25 mm) entries.
7. A quiet forecast yields a single `Normal` entry.

## Gaps

- Verified-historical Crop Memory was not run in the browser; only one genuine observation exists.
- Removal of the `**` Markdown from assistant answers was not re-run against Gemini.
- Cross-account isolation on `crop_analyses` and `reminders` is policy-verified, not exercised with two real sessions.
- Mobile workspace layout not checked.
- The Crop Health PDF was visually reviewed in the browser. The comparison and weather PDFs were byte-checked only.

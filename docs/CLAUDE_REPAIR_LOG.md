# Claude repair log

Priority order follows the handover brief. Each fix lists its verification.

| # | Priority | Issue (verified) | Fix | Files | Verified by |
| --- | --- | --- | --- | --- | --- |
| 1 | P0 | Gemini returned 503 with no diagnosable cause | User-supplied key placed in gitignored `backend/.env`. Backend loads `.env` without overriding the process environment. Provider HTTP status and exception class are logged without secrets | `backend/main.py`, `backend/crop_analysis/gemini.py` | Live analysis smoke, 3,057 ms |
| 2 | P0 | Crop Doctor results vanished on reload. Index page showed fixtures | Findings saved to new `crop_analyses` (RLS). A failed save returns 503. Index lists real observations with their analyzed state. Analysis view shows saved photos, Zadoks range, saved timestamp, re-analyze and PDF link | `backend/crop_analysis/api.py`, `app/(workspace)/crop-doctor/page.tsx`, `components/saved-crop-analysis.tsx`, `lib/farm-data.ts`; `crop-doctor.tsx` fixture removed | Unit tests 1–2, typecheck, build |
| 3 | P1 | Crop Memory had no frontend comparison | `POST /comparisons` (same owner, same field, different dates; prior analyses as context) and `POST /comparisons/illustrative` (attributed samples). Both saved to `crop_comparisons`. A duplicate pair returns 409. UI: field and two date pickers with interval and 15–25 day guidance, illustrative run, saved list with PDF links | `api.py`, `compare_samples.py` (loader extracted), `components/comparison.tsx`, `app/(workspace)/comparison/page.tsx` | Live illustrative comparison, build |
| 4 | P1 | Weather fallback showed a fixed sample forecast for fixture fields | Empty state linking to My Fields. Backend forecast and threshold module added for the assistant and PDF | `app/(workspace)/weather/page.tsx`, `components/weather.tsx`, `backend/crop_analysis/weather.py` | Unit tests 6–7, live forecast |
| 5 | P1 | Reminders lived in browser memory over fixture fields. Notifications were fixtures | New `reminders` table (RLS, column-limited update). Server actions to add, complete, reopen and delete. Header notifications are open reminders due within 7 days | migration, `lib/reminder-actions.ts`, `components/reminders.tsx`, `lib/state.tsx`, `app/(workspace)/layout.tsx` | Catalog check, lint, build |
| 6 | P1 | Assistant disabled in the app | `POST /assistant` builds context server-side from the caller's own records; the UI keeps an English/Urdu history with RTL rendering and lists the records each answer used | `api.py`, `components/assistant.tsx`, `lib/crop-analysis-action.ts`, `globals.css` | Live EN/UR answers, unit test 5 |
| 7 | P1 | Reports were fixtures with no PDF export | `GET /reports/health|comparison|weather/{id}` returns PDFs. The Next route `/api/reports/[kind]/[id]` proxies with the session token. Reports page lists saved analyses, comparisons and located fields. Fixture detail route removed. Weather PDF label changed from "Issued" to "Retrieved", since Open-Meteo gives no issue time | `api.py`, `reports.py`, `app/api/reports/…/route.ts`, `components/reports.tsx`, `app/(workspace)/reports/page.tsx` | Unit tests 3–4, weather PDF |
| 8 | P2 | Dashboard labeled comparison/weather as "Demo" | Replaced with live links | `components/dashboard.tsx` | build |
| 9 | Security | New backend caller first drafted as an exported server action, which would expose arbitrary backend paths | Moved to plain server module `lib/backend.ts`. Server actions expose only fixed paths with validated UUIDs | `lib/backend.ts`, `lib/crop-analysis-action.ts` | review |

## Fixes found during the signed-in rehearsal

| # | Issue | Fix | Verified |
| --- | --- | --- | --- |
| 10 | Assistant returned HTTP 422: the strict request model rejected the JSON-string field ID | `AssistantQuestion` uses a non-strict config; HTTP-level test added for `/assistant` and `/comparisons` | English and Urdu answers in browser; 35/35 tests |
| 11 | Notification count stayed stale after completing a reminder | Provider derives notifications from server props and keeps only dismissed IDs in state | Bell 0 → 1 → 0 without reload |
| 12 | Reports page and Crop Doctor index crashed (icon function passed to a client component) | `components/reports.tsx` marked client; `CropDoctorHeader` wrapper | Both pages render; 3 PDFs download |
| 13 | Dashboard tiles said "Sample workflow/forecasts available" | Real comparison count and reminders due within 7 days | Dashboard shows 1 / 0 |
| 14 | Assistant answers showed literal `**` | Stripped before rendering | Code only |

## Database change (user-approved)

`supabase/migrations/20261121080000_analyses_and_reminders.sql`, applied to `CropShield_Ai` on 2026-11-21. Additive only: `crop_analyses` (select/insert) and `reminders` (select/insert/delete, update of title/due_on/completed), both owner-only, with composite foreign keys tying rows to the owner's observation or field. No existing rows were changed.

## Not changed

Fields, Scanner, authentication and Settings logic were not modified.

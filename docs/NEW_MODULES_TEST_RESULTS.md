# New modules test results

Date: 2026-11-23, Windows 10, Node.js with Next.js 16.4.6, Python venv in `backend/.venv`, hosted Supabase `CropShield_Ai` (production). Only checks that were actually run are listed.

## Automated checks

| Check | Command | Result |
| --- | --- | --- |
| Backend unit and API tests | `backend\.venv\Scripts\python.exe -m unittest discover -s tests` | 61 passed (was 59 before this work: added an owner-scoped review/delete test and a fallback-model test; extended the auth test) |
| Typecheck | `npm run typecheck` (frontend) | Pass |
| Lint | `npm run lint` (frontend) | Pass, no warnings |
| Production build | `npm run build` (frontend) | Pass; `/aquaguard`, `/rustwatch`, `/grainsafe`, `/reminders` built as dynamic routes |

pytest is not installed in the venv; the suite runs with `unittest`.

## Database and RLS (hosted, production)

| Check | Result |
| --- | --- |
| Migration dry run | Would push `20261122090000_crop_evidence.sql` and `20261123090000_module_review_and_delete.sql` |
| Apply (user-approved) | Both applied; `migration list` shows local and remote identical through `20261123090000` |
| Anonymous REST (publishable key, no JWT) | `grain_batches`, `agricultural_records`, `reminders`: 42501 permission denied |
| Effective privileges | anon: no SELECT/INSERT/UPDATE/DELETE on either table. authenticated: SELECT, INSERT, DELETE on both; UPDATE only on `agricultural_records.review_status`; `details` not updatable |
| Policies | `agriculture_owner_read/insert/review/delete`, `grain_owner_read/insert/delete` |
| Backfill | 2 of 2 rust rows received `review_status` |
| Rolled-back RLS probe (user-approved; block ends in `raise exception`) | Random user: select 0, batches 0, delete 0, batch delete 0, review update 0. Owner: select 4, review update on non-rust 0, `details` update denied, insert for another user denied, review value `confirmed` rejected by check constraint |
| After the probe | Row counts and review statuses unchanged (1 irrigation, 2 rust `review_requested`, 1 storage, 1 batch) |

## Browser E2E (built-in browser, signed in by the user, local `npm run dev` against hosted Supabase)

Test inputs were labeled "QA E2E" and are test values, not field readings. Every QA record was deleted afterwards; a final query found 0 QA records, 0 QA batches and 0 orphaned inspections.

| Module | Step | Result |
| --- | --- | --- |
| GrainSafe | Batch with storage date before harvest | Rejected: "Use a storage date on or after harvest, through today (UTC)." Entries kept after the fix (D4, D5) |
| GrainSafe | Valid batch (Wheat, 40 bags, jute bags, humidity trigger 70 %) | Saved, form cleared, batch listed |
| GrainSafe | Inspection: 24 °C, 72 % RH, moisture not measured, inspect 2026-11-25 | Cautions: "Grain moisture was not measured." and "Relative humidity reached your inspection threshold." |
| GrainSafe | Bell and Reminders | "GrainSafe inspection · QA E2E batch 1123 · due 2026-11-25" in both |
| GrainSafe | Assistant with the batch selected | `POST /assistant` 200 in 2.4 s; the answer text was not captured because the pane navigated away mid-request |
| GrainSafe | Delete batch | Confirm text named the cascade; redirected to `/grainsafe`; batch and its inspection gone (DB-verified) |
| RustWatch | Save on an existing wheat observation (1st) | Gemini 503 (no retry at the time); saved after 63 s as inconclusive, "Photo review unavailable" (D6) |
| RustWatch | Save (2nd, with retry) | Gemini 503 again; saved in 8.8 s as inconclusive with the honest fallback text |
| RustWatch | Save (3rd, retry plus fallback model) | Live Gemini review: inconclusive. The image shows wheat heads and awns while the leaves are obscured; it advises inspecting leaves in good light |
| RustWatch | Review status change | `PATCH /agriculture/rust/{id}` 200; `feedback_received` persisted after reload |
| RustWatch | Delete 3 QA records | All removed; the 2 pre-existing records were untouched |
| AquaGuard | Live forecast | Open-Meteo Asia/Karachi: 2026-11-20 to 22 at 0 mm (highs 24.9–25.8 °C); forecast 2026-11-23 to 29 at 0 mm (highs 24–26.1 °C). Caution: three recent days under 1 mm |
| AquaGuard | Irrigation record (irrigated, damp soil, no moisture reading, inspect 2026-11-26) | Saved; "Last recorded irrigation" updated; dry-soil caution cleared; moisture "not measured" |
| AquaGuard | Assistant on the field | Answer cited irrigation on 2026-11-23 and the unconfirmed suspected-rust entry; "Records used: irrigation · rust" |
| AquaGuard | Delete QA record | Removed; last irrigation returned to 2026-11-22 |
| Dashboard | Module tiles | 1 irrigation record, 2 rust records, 1 batch, matching the DB |
| Auth | Signed-out `/aquaguard`; API `/agriculture/storage` without a token | 307 to `/login`; 401 |

The browser pane sometimes left streamed page content hidden until it repainted, which delayed hydration. This is a pane artifact (React reveals streamed content on an animation frame); taking a screenshot forced the reveal. It was not reproduced outside the pane.

## Unified startup

| Check | Result |
| --- | --- |
| `npm run dev:check` with Codex's servers on 3000 and 8000 | Exit 1: "Port 3000 is already in use…" |
| `--check` on free ports | Exit 0: configuration OK |
| Invalid port (`--web-port 99`) | Exit 1 with a range message |
| Scratch copy with no deps, venv or env | Exit 1, listing every missing item and warning about the missing Gemini key; empty values count as missing |
| Second Next dev server in the same folder | Before the pre-check: Next exited, the launcher stopped the API and exited 1, and both ports were released. After the pre-check: refused upfront naming the URL and PID |
| Full start (`npm run dev -- --api-port 8300`) | `[dev] Ready`; `/login` 200; `/health` `{"status":"ok"}`; both listening only on 127.0.0.1 |
| Ctrl+C | "Stopping frontend and backend…"; ports 3000 and 8300 released; no child PIDs left; Next dev lock removed |
| Logs | `logs/web.log` and `logs/api.log` written with start and exit markers |

## Performance observations (dev server, warm, this machine)

| Path | Measured |
| --- | --- |
| Supabase REST round trip | 0.19–0.23 s warm, 0.71 s cold (TLS) |
| Open-Meteo request | 0.50–0.61 s |
| GrainSafe page | 0.68–1.3 s typical |
| AquaGuard page | 4.5–5.9 s (sequential backend reads plus Open-Meteo) |
| Module save, delete, review | 0.2–0.7 s save; 0.4–1.7 s delete; 1.6 s review |
| RustWatch save | 2.7 s with a successful Gemini review; 8.8 s under a 503 with retry; 63 s before the retry fix |
| Assistant | 2.4–3.3 s |

## Not covered

- Two separately signed-in farmer accounts (isolation tested through the rolled-back SQL probe instead).
- The Assistant answer text for the batch question (status 200 only).
- Mobile layouts of the new controls.
- A production deployment; nothing was deployed.

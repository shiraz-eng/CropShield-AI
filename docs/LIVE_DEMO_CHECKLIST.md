# Live demo checklist

Signed-in rehearsal by Claude, 2026-11-21. Local production build (`next start` on `127.0.0.1:3200`) with FastAPI on `127.0.0.1:8010`, against the hosted `CropShield_Ai` project and live Gemini and Open-Meteo. The user signed in through the browser pane; Claude never saw the credentials. Nothing was simulated.

**Result: 29 PASS, 0 FAIL, 0 BLOCKED.** Three defects found during the run were fixed and re-verified in the same session (see the end of this file). Crop Memory ran in the labeled **illustrative** mode, because only one genuine observation exists. The verified-historical mode is implemented and unit-tested but was not run in the browser.

## QA records created (labeled test data)

| Record | ID | Notes |
| --- | --- | --- |
| Field `QA Wheat – Claude rehearsal` | `e452c1c9-e506-48ae-aaa4-33de8ac02e6e` | Faisalabad, 31.42, 73.08. Notes say "QA test record… not a real farm". Planting date 2026-11-01 is a test value |
| Observation 2026-11-21, 1 photo | `a86699b0-5f79-4573-9374-aceec829ef6a` | Photo: [Jatin Punia / Unsplash](https://unsplash.com/photos/PLrAAPUfGIQ), credited in notes as "not taken in this field" |
| Crop analysis | (row in `crop_analyses`) | Gemini, saved 2026-11-21 00:38:37 local |
| Illustrative comparison | `af4a89d2-6f80-44fc-9d71-055d386f923a` | Two Unsplash samples, no interval |
| Reminder `QA: inspect lower canopy` | (row in `reminders`) | Due 2026-11-24, left completed |

## Steps

| ID | Step | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Log in | PASS | Signed in by the user in the pane; `/dashboard` loaded with the account's data |
| 2 | Open Dashboard | PASS | Real totals (0 → 1 field, 1 observation, 1 comparison after the run) |
| 3 | Navigate workspace | PASS | Fields, Scanner, Crop Doctor, Crop Memory, Weather, Reminders, Assistant, Reports, Settings all opened |
| 4 | Create wheat field with coordinates | PASS | "Field saved." and listed |
| 5 | Save field details | PASS | Listed with location, area, planting date |
| 6 | Upload wheat photograph | PASS | "Observation saved. Photos saved privately." |
| 7 | Trigger Gemini | PASS | Crop Doctor → Analyze saved photos |
| 8 | Wait for analysis | PASS | Findings shown about 11.7 s after the click |
| 9 | Inspect analysis; reload; still present | PASS | `completed`, grain development, Zadoks 70–79, adequate quality, stage evidence, symptoms, uncertainty, follow-ups, "not a confirmed diagnosis" note. After reload, "Saved analysis from 11/21/2026, 12:38:37 AM" |
| 10 | Reopen saved observation | PASS | Private photo loads from a signed URL (1000 px). Crop Doctor index lists it as "Analyzed" |
| 11 | Open Crop Memory | PASS | Historical tab correctly shows "Two dated observations needed" with one observation |
| 12 | Generate comparison | PASS | Illustrative run, about 4.3 s |
| 13 | Inspect comparison and provenance | PASS | Banner "not verified historical field progression", Unsplash credits, `grain development → ripening`, no interval claimed, saved to list; PDF 200 |
| 14 | Open Weather Guardian | PASS | QA field selected |
| 15 | Retrieve field forecast | PASS | 7 days, Asia/Karachi, provider response Sat, 21 Nov 2026 08:39:26 GMT |
| 16 | Verify cautions and timestamps | PASS | "No forecast days crossed the configured caution thresholds" (highs about 25 °C, 0 mm) |
| 17 | Open Reminders | PASS | — |
| 18 | Create, reload, complete; notifications | PASS | Saved; survived reload; bell "Notifications (1)"; completed → moved to Completed; bell 0 (after fix 2) |
| 19 | Open Assistant | PASS | QA field and English preselected |
| 20 | Ask English question | PASS | Answer in 4.7 s (after fix 1) |
| 21 | Verify English answer | PASS | LTR. Used saved observation, Gemini analysis, Open-Meteo forecast. Listed comparison and reminder as unavailable. Repeated the farmer note that the photo wasn't from this field |
| 22 | Ask Urdu question | PASS | Answer in 15.2 s |
| 23 | Verify Urdu answer renders RTL | PASS | `dir=rtl`, `lang=ur`, computed direction rtl, Urdu script, records listed in Urdu. [Screenshot](evidence/claude/journey-assistant-urdu-rtl.jpg) |
| 24 | Open Reports | PASS | Crop Health, Growth Comparison, and Weather Risk sections list saved data (after fix 3) |
| 25 | Generate saved-data reports | PASS | Health 200 (233,360 B, 1.16 s), comparison 200 (2,408 B), weather 200 (2,185 B, 1.18 s), all `application/pdf` |
| 26 | Export PDF | PASS | `Content-Disposition: attachment; filename="crop-health-2026-11-21.pdf"` |
| 27 | Open and verify PDF | PASS | 2 pages: field, report date, embedded private photo, recorded observation, AI interpretation, stage evidence, symptoms, concerns, footer. [Screenshot](evidence/claude/journey-crop-health-pdf.jpg) |
| 28 | Log out | PASS | Settings → Sign out → `/login` |
| 29 | Protected pages require authentication after logout | PASS | 6 workspace routes and the report API redirect. Following the PDF URL ends at `/login` (HTML, no PDF) |

## Defects found during the run (fixed and re-verified)

1. **Assistant HTTP 422.** The request model inherited `strict=True`, so a field ID sent as a JSON string was rejected. Unit tests had built the model with Python UUID objects and missed it. Fixed, with an HTTP-level regression test added; re-run passed.
2. **Stale notification count.** The bell kept the old count after completing a reminder, until a full reload. The provider now derives notifications from server data. Re-verified: reopen → 1, complete → 0, no reload.
3. **Reports page and Crop Doctor index crashed.** A server component passed a Lucide icon to the client-side `PageHeader` (the same class of bug Codex fixed on Weather). Fixed with client wrappers; both pages verified.

Also fixed after the run: dashboard tiles "Sample workflow/forecasts available" replaced with real counts (verified). Literal `**` Markdown is now stripped from assistant answers (code change only, not re-run against Gemini).

## Observed, not fixed

- In the Urdu answer, the forecast was listed as unavailable, although the English answer a minute earlier used it. The live Open-Meteo call inside the assistant probably failed or timed out (6 s limit) on that request. Retry before recording if the weather record is missing.
- Gemini judged the two unrelated sample photos "comparable" in the browser run and "limited" in the CLI run. That is model variance; the UI still shows the provenance banner.
- The pane was 659 px wide, so the chat log scrolls in a 480 px box. A full mobile (390 px) pass of the workspace has not been done.
- Cross-account isolation on the two new tables is enforced by policy but was not exercised with a second signed-in account.

## Before recording

1. Install system Python 3.11+ and recreate `backend/.venv`. The current one depends on Codex's bundled Python.
2. Start FastAPI and Next.js. If the backend is not on port 8000, set `CROP_ANALYSIS_API_URL`.
3. For a historical Crop Memory segment you need two genuine photos of the same field from different dates. Otherwise show the illustrative mode with its banner.
4. Rotate the Gemini key after the demo.

# Final verification

**Readiness: not ready for a complete live hackathon walkthrough.**

The authorized desktop run verified hosted sign-in, dashboard session reload, saved field creation and retrieval, rejected unsupported files, verified private photo upload and reload, and confirmed logout protection. The second account saw the app's Field unavailable screen, received no owner field rows through PostgREST, could not download the private object, and received HTTP 404 from analysis. The owner could download the object. A public Storage request was denied.

The first Weather Guardian run exposed a Server Component passing its icon as a function to a Client Component. The fix moved the icon into a client wrapper. The signed-in retest showed all seven forecast days, Asia/Karachi timezone, provider timestamp 2026-11-21 07:46:51 UTC, and no threshold-crossing caution for that forecast.

Gemini analysis returned HTTP 503 after 3,359 ms on the authenticated diagnostic. The app displayed an unavailable message. The underlying provider failure was not resolved. Saved analysis, comparison, reminder workflow, English and Urdu assistant replies, and report download remain open.

The labeled QA run left four QA accounts, three QA fields, and three QA observations across retries; no pre-existing application records were altered. One QA wheat photo is credited to [Jatin Punia / Unsplash](https://unsplash.com/photos/PLrAAPUfGIQ).

The existing Phase 8 presentation remains unchanged. No final five-minute video was created. [Signed-in browser evidence](../demo-video/evidence/final-qa/QA_Field_and_Scanner.mp4) is 46 seconds, H.264, 1920 × 1080, 30 fps. The clip is diagnostic footage and has no narration.

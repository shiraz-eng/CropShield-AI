# Final test results

| Check | Result |
| --- | --- |
| Python unittest discovery | 27 passed, 0 failed |
| Next.js typecheck, ESLint, production build | Passed all three |
| Desktop Chromium Playwright | 14 assertions or grouped checks passed, 0 failed: ten route redirects, configured auth navigation, mobile overflow, uncaught errors, and unauthorized analysis |
| Open-Meteo adapter | One real forecast and two injected failure-path checks passed |
| Supabase read-only account probe | One confirmed account exists. The probe did not authenticate its browser session. |
| Signed-in rehearsal | 1 of 29 checks passed independently, 28 blocked, 0 failed |

The [browser log and captures](../demo-video/evidence/final-qa/) contain the public smoke evidence. See [the live checklist](LIVE_DEMO_CHECKLIST.md) for blocked workflows and [the performance report](PERFORMANCE_REPORT.md) for timing conditions.

## Authorized signed-in retest

Sign-in, dashboard, session reload, field creation and retrieval, invalid file rejection, private upload and reload, owner isolation, and logout passed. Weather initially failed to render, then passed after the client icon fix. Gemini failed with HTTP 503. The latest 29-step checklist records 13 passed, one failed, and 15 blocked.

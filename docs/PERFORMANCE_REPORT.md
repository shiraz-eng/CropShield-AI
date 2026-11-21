# Performance report

| Measurement | Observed | Conditions |
| --- | --- | --- |
| Login navigation to visible heading | 3,710 ms | One desktop Playwright Edge run, 1920 × 1080, local Next.js development server. This includes browser and development compilation overhead. |
| Open-Meteo adapter request | 987 ms | One uncached direct Node probe for 31.42° N, 73.08° E. Seven values returned, timezone Asia/Karachi. Provider response 2026-11-21 07:35:36 UTC. |
| Python suite | 0.896 s | 27 local tests, excluding interpreter startup. |
| Uncaught client runtime errors | 0 | Public auth navigation and mobile login only. |

Startup, authenticated workspace navigation, Core Web Vitals, upload, Gemini, comparison, and report generation latency were not measured in this run. The Open-Meteo adapter rounds coordinates to about 1 km precision, sets a six-second timeout and uses a 15-minute Next.js cache for repeated field requests.

## Authenticated follow-up

An authorized saved-observation analysis request returned HTTP 503 in 3,359 ms. This is failure-path timing rather than Gemini inference latency. The signed-in Open-Meteo view was subsequently verified with a provider response timestamp of 07:46:51 UTC on 2026-11-21.

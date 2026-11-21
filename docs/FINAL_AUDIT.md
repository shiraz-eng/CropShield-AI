# Final audit

**Readiness.** Local prototype demo verified. Hosted integration, agronomic evaluation, and deployment readiness remain open. No hosted changes were made. Audit date 2026-11-20.

| Module | Status | Evidence and remaining work |
| --- | --- | --- |
| Auth and profiles | Implemented but unverified | Server-side verification and anonymous redirects exercised. Hosted signup, email links, session recovery and saved profile settings remain unverified. |
| Farm and fields | Implemented but unverified | Field CRUD and archive code present, with owner checks exercised in PostgreSQL fixtures. Hosted workflow still pending. |
| Image upload and storage | Implemented but unverified | Server limits, decode checks, private bucket policy and transactional reference checks exist. Physical upload, signed retrieval and cleanup against hosted Storage are pending. |
| Gemini Crop Scanner | Partially implemented | One prior authorized development photo produced schema-valid findings. Scanner upload has no connected analysis route. |
| Crop Doctor | Partially implemented | The UI shows labeled examples. No authenticated saved findings are presented. |
| Crop Memory Engine | Partially implemented | Historical date/owner checks and illustrative provenance pass in tests. PostgreSQL fixtures cover comparison saves, retrieval and duplicate rejection. Live calls and saved workspace history are pending. |
| Weather Guardian | Partially implemented | Historical sample forecast UI only. No verified live integration, location matching, unit checks, freshness checks or validated risk thresholds. |
| Alerts and reminders | Partially implemented | Sample cautions and client-side reminders. Forecast notification deduplication and external delivery are pending. |
| Farmer Assistant | Partially implemented | Context validation and mocked Gemini responses pass locally. The web screen shows unavailable. No live or stored conversations. |
| English and Urdu | Partially implemented | Urdu response direction and provenance pass in Python tests. Auth screen responsiveness is verified. Bilingual live replies and hosted preferences are unverified. |
| Reports and PDF | Partially implemented | Structured builders and embedded image tests pass. One development PDF was visually checked during Phase 6. The workspace shows samples and does not serve stored PDFs. |
| Responsive UI | Verified working | Current production sign-in and signup verified at desktop and 390 px. Signed-in workspace reflow still needs a hosted test. |

## Runtime and security

- Development login returned HTTP 500 when Turbopack could not load its PostCSS module. With the supported webpack flag, login returned HTTP 200 and anonymous dashboard access returned HTTP 307. The production Turbopack build passed.
- Edge checked all ten protected workspace routes. Each redirected anonymous requests to sign-in. Login, signup and forgot-password navigation, password visibility, and the 390 px auth layouts passed. FastAPI returned `{"status":"ok"}` at `/health`.
- Reviewed SSR cookie refresh, server-side identity checks, owner-scoped grants, private bucket rules, bounded image validation, and provider error handling. Local PostgreSQL fixture checks covered cross-owner access, same-field/date checks, photo-reference presence and duplicate comparison rejection. These checks did not exercise hosted Storage.
- The reachable Git history was searched for Gemini key shapes, Supabase secret keys and private-key headers. The scan found no matching files. This focused check cannot rule out other credential formats.
- Model adapters keep credentials server-side and return sanitized provider errors. There is no authenticated model API or per-user rate limiting yet. Test logging, quotas, request limits and storage cleanup on the intended host before deployment.
- No real forecast data was exercised. Displayed cautions are project samples, not official alerts. Validate rainfall and temperature units, source timestamps, coordinate matching, stale data and deduplication before enabling live cautions.

## End-to-end sequence

| Steps | Result |
| --- | --- |
| Register, authenticate, create a field | Blocked by unconfigured hosted project. Anonymous redirects and auth forms passed locally. |
| Upload first photo and save observation | Hosted Storage blocked. Invalid images and transactional ownership rules passed locally. |
| Run Gemini and select a second photo | Standalone single-image smoke passed in an earlier phase. No live Phase 7 call. Comparison validation passed with mocked Gemini. |
| Display weather risks and review reminders | Sample screens only. Live forecast and notification behavior unavailable. |
| Ask assistant, save report and export | Context validation and PDF renderer tested in isolation. Authenticated web sequence blocked. |

The negative suite exercised cross-owner records in local fixtures, unsupported crops, invalid images, missing dates, absent context, malformed model output and provider timeouts. No authorized dataset, verified weather feed, hosted test account or deployed demo was configured for the final audit.

## Commands checked

- Frontend `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run dev`.
- Backend `python -m pip check` and `python -m unittest discover -s tests` inside the virtual environment. All 25 tests passed.
- A clean production start on local port 3101, Edge auth-route checks and screenshots, FastAPI health, and the local PostgreSQL comparison fixture.
- Offline evaluation with an empty manifest returned zero provider calls.

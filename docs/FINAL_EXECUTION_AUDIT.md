# Final execution audit

Baseline before this execution. The hosted schema was deployed and catalog-verified in the prior run. The frontend uses its publishable key and the local FastAPI health endpoint responds. Existing work was preserved.

| Module | Expected behavior | Baseline and evidence | Status / correction |
| --- | --- | --- | --- |
| Authentication and authorization | Login, persistence, logout, protected routes | Prior Playwright verified public auth forms and anonymous redirects. No permitted signed-in browser session supplied to automation. | PARTIAL · verify confirmed test sessions |
| Dashboard | Live totals and navigation | Owner-scoped count queries exist. Authenticated browser run pending. | BLOCKED · verify signed-in dashboard |
| My Fields | Create, edit, reopen, archive | Owner-filtered server actions exist. Hosted writes and reload pending. | BLOCKED · verify two accounts |
| Scanner | Upload photos and save observation | Private bucket and transactional RPC deployed. Browser upload pending. | BLOCKED · verify accepted/rejected files |
| Crop Doctor | Live Gemini findings and retained results | Analysis endpoint and linked view exist. Invalid bearer rejected in prior run. Results are view-local. | PARTIAL · verify live provider and add persistence |
| Crop Memory | Real comparison with provenance | Standalone adapter with software tests. UI is an attributed preview. | PARTIAL · connect authenticated comparison |
| Weather Guardian | Live forecast tied to field location | Baseline view reads fixed sample forecasts. | PARTIAL · connect Open-Meteo |
| Reminders | Create, complete, retain | Client demo state exists. Hosted persistence unverified. | PARTIAL · connect field-aware data |
| Assistant | Live English/Urdu answers | Standalone service exists. UI declares conversations unavailable. | PARTIAL · connect authenticated requests |
| Reports | Real report and PDF download | Standalone PDF renderer exists. Web download unavailable. | PARTIAL · wire saved data and export |
| Settings | Save profile preferences | Owner-scoped profile action exists. Hosted browser save pending. | BLOCKED · verify |
| Database and Storage | Owner-only access and private photos | Prior read-only catalog query confirmed migrations, RLS, and private bucket. | PARTIAL · verify against two real users |
| Backend API | Healthy API and verified provider call | Health responded. Crop Doctor API implemented. | PARTIAL · test live success |
| Frontend integration | UI completes all operations | Scan-to-analysis handoff implemented. Other providers pending. | PARTIAL · connect missing features |
| Security | Reject invalid credentials and cross-user reads | Prior negative bearer check and ownership test passed. | PARTIAL · verify real cross-user access |
| Performance | Reproducible local and provider measurements | Current run metrics tracked separately. | PARTIAL · add signed-in measurements |
| Mobile | Usable at narrow viewport | Prior signed-out auth smoke passed. Workspace pending. | PARTIAL · verify mobile workspace |

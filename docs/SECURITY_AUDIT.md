# Security audit

- The prior hosted catalog check verified RLS on five tables and a private crop-observations bucket with three policies. This is configuration evidence.
- The current browser run verified anonymous HTTP 307 redirects on ten protected routes and HTTP 401 on the analysis endpoint. The backend suite includes a mocked owner-filter and no-provider-call assertion for an inaccessible observation.
- The frontend credential file is Git-ignored. Only the publishable Supabase credential is used by the frontend. The Gemini credential is read by the server process.
- Two authenticated identities are needed to verify cross-account field and private-photo access, expired sessions, and authenticated image validation. The current run did not mutate the hosted database or create accounts.
- Live Gemini rate-limit and failure handling, comparison dates, and invalid uploads were not exercised through a signed-in browser. Adapter and fixture tests cover some negative cases.

## Authorized signed-in follow-up

Real owner and visitor sessions verified blocked cross-account field access in the UI and REST, denied object access through authenticated Storage, denied public object access, and HTTP 404 on cross-account analysis. Owner object retrieval returned HTTP 200. Invalid file selection was rejected, session reload preserved login, and logout restored protected route enforcement. Expired-session behavior remains untested.

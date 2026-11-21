# Architecture

- **Next.js App Router** handles sign-in, field history, photo capture and upload, and result presentation. Tailwind CSS and shadcn/ui provide the interface, and Recharts displays trends.
- **FastAPI** runs locally. Every endpoint verifies the Supabase access token and reads or writes with the caller's own permissions, so RLS applies: `POST /observations/{id}/analysis` (saves to `crop_analyses`), `POST /comparisons`, `POST /comparisons/illustrative`, `POST /assistant`, and `GET /reports/{health|comparison|weather}/{id}` (PDF). Next.js calls it from server actions and from the `/api/reports/[kind]/[id]` proxy through `lib/backend.ts`, which is never exposed as a server action.
- **Supabase** handles identity, PostgreSQL records, and private photo storage. Fields belong to users, observations belong to fields, and comparisons reference both observations. Keep capture dates, photo object references, and structured results in PostgreSQL. Version schema changes in `supabase/migrations/`.

## Phase 2 data flow

The Next.js proxy refreshes Supabase SSR cookies. Protected pages and server actions verify identity with Supabase Auth. Authenticated database access uses the publishable key and the farmer's session. Row-level policies and composite foreign keys enforce the same owner across fields, observations, and photo references.

Crop Scanner validates and decodes one to three photos, uploads them to the private `crop-observations` bucket, and commits the observation and photo references together in a database transaction. Storage keys contain the authenticated user, observation UUID, and a random object UUID. If the save fails, the app attempts cleanup of unreferenced objects. Reads use signed URLs that expire after five minutes. Archive changes leave existing observations in place.

## Planned processing workflow

1. An authenticated user selects a wheat field and uploads a photo with its capture date. Validate file type, size, and field ownership before processing.
2. FastAPI sends the photo and relevant crop context to Gemini. Store validated observations with image quality and uncertainty. Mark failed processing explicitly so the user can retry.
3. Crop Memory Engine selects a prior observation from the same field in the 15–25 day window and compares the two dated photos. Show both source images, summarize visible changes, and flag gaps when observations are missing or hard to compare.
4. Weather Guardian uses field location and Open-Meteo forecasts to surface dated cautions. Keep forecast data distinct from photo observations.

## Security boundaries

Use Supabase Auth tokens and ownership checks for API requests, plus PostgreSQL row-level security and Storage policies for user-owned data. Keep photo buckets private and authorize short-lived signed URLs when needed. Limit model input to necessary crop context and photos. Keep Gemini credentials server-side and avoid logging tokens, private photos, or signed URLs.

## Crop Memory Engine

The independent service validates the owner, field, crop, dates, and available photos before submitting a historical comparison. Its caller must load the records from owner-scoped storage and establish the authenticated identity and confirmed capture dates. The service computes metadata and intervals itself. Gemini receives only validated image bytes, date context, and matching prior findings if available.

Illustrative results require source provenance for both photos and carry no observation IDs or interval. The result validator rejects temporal symptom claims for this mode. The app shows a sourced image preview and an unavailable state for historical reports until the hosted authentication and storage integration can be verified.

The additive comparison migration separates historical records from illustrative reports. Historical inserts require two photo-bearing observations on the same owned wheat field and an interval matching the stored dates. An ordered-pair unique index prevents duplicate historical records. RLS restricts reads and inserts to the owner.

## Farmer Assistant and reports

The assistant accepts one compact record per context source from its server caller. Owner and field identifiers stay out of Gemini prompts. The response validator rejects references to absent context. The caller must load records with the authenticated user's permissions before invoking the service.

The report builders transform structured analysis, comparison, or forecast records into labeled sections. An illustrative comparison cannot be assigned to a real field. The PDF renderer validates image bytes, escapes report text, and performs no network reads. Conversation persistence, report access checks at the route boundary, and stored report retrieval depend on hosted Auth and private Storage verification.

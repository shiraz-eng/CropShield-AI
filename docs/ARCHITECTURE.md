# Proposed architecture

- **Next.js App Router** handles sign-in, field history, photo capture and upload, and result presentation. Tailwind CSS and shadcn/ui provide the interface, and Recharts displays trends.
- **FastAPI** verifies sessions and field access, validates requests with Pydantic, and coordinates Gemini and Open-Meteo. The backend validates provider results before persisting or returning them.
- **Supabase** handles identity, PostgreSQL records, and private photo storage. Fields belong to users, observations belong to fields, and comparisons reference both observations. Keep capture dates, photo object references, and structured results in PostgreSQL. Version schema changes in `supabase/migrations/`.

## Processing workflow

1. An authenticated user selects a wheat field and uploads a photo with its capture date. Validate file type, size, and field ownership before processing.
2. FastAPI sends the photo and relevant crop context to Gemini. Store validated observations with image quality and uncertainty. Mark failed processing explicitly so the user can retry.
3. Crop Memory Engine selects a prior observation from the same field in the 15–25 day window and compares the two dated photos. Show both source images, summarize visible changes, and flag gaps when observations are missing or hard to compare.
4. Weather Guardian uses field location and Open-Meteo forecasts to surface dated cautions. Keep forecast data distinct from photo observations.

## Security boundaries

Use Supabase Auth tokens and ownership checks for API requests, plus PostgreSQL row-level security and Storage policies for user-owned data. Keep photo buckets private and authorize short-lived signed URLs when needed. Limit model input to necessary crop context and photos. Keep Gemini credentials server-side and avoid logging tokens, private photos, or signed URLs.

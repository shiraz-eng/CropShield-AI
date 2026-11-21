# Phase 8 presentation verification

## Application and evidence

- Playwright captured login, signup, and password reset on the local Next.js app at 1920 × 1080. The presentation uses login and signup. Unmodified originals are in [screenshots](assets/screenshots/).
- Dashboard, Scanner, Crop Doctor, Crop Memory, Weather Guardian, Assistant, Reports, and Field Management returned HTTP 307 redirects to login. Hosted auth and private storage were unavailable for a signed-in run. FastAPI health returned successfully.
- From the backend directory, `.venv/Scripts/python.exe -m unittest discover -s tests` passed 25 of 25 tests. These are software checks. The deck includes one earlier standalone Gemini smoke response and zero labeled holdout cases.
- The Crop Memory photo pair uses two attributed Unsplash images. Capture dates, field identity, growth stages, and a historical interval are unverified. The deck labels the pair as illustrative. Live AI, verified forecast cautions, authenticated report downloads, and a verified historical comparison remain open.
- Farmer survey responses and competition-specific requirements are unconfirmed. The presentation uses published research as described in the [claim register](assets/research/EVIDENCE.md).

## Files and visual checks

- The editable PPTX has nine 16:9 slides and nine populated notes parts. Text, panels, and the workflow diagram are editable. Photos and browser captures are raster assets.
- PPTX ZIP integrity, internal relationships, layout boundaries, font policy, and first-party import passed. The layout check reported zero findings. Native PowerPoint execution was unavailable.
- Visually reviewed all nine rendered slides for typography, clipping, image crops, citations, reading order, and visible credentials. The application form details are easier to inspect at full size in the original captures.
- The image-based PDF has nine 960 × 540 pt pages. Poppler successfully rasterized all pages. Use the PPTX for editing and text access.
- The speaker script and embedded notes cover the nine slides. Timings sum to 300 seconds. Rehearsal timing remains unmeasured.

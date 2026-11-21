# Hackathon video repair audit

The five-minute product video is blocked at its critical frontend quality gates. The previous export measured 180.021354 seconds. It remains on disk. No replacement final export was produced.

## Functional checks

Playwright used desktop Microsoft Edge (Chromium) at 1920 × 1080. It checked each route without following redirects, then opened Dashboard in the browser and clicked through signup, sign-in, password reset, and back to sign-in. It asserted the page headings and the Supabase setup notice. Original screenshots and the short browser recording are in [evidence](evidence/).

| Workflow | Result | Evidence and blocker |
| --- | --- | --- |
| Public auth navigation | Pass | Real links and page transitions worked. The app reported missing Supabase configuration. |
| Dashboard | Blocked | HTTP 307 to login. Signed-in overview could not be checked. |
| Crop Scanner | Blocked | HTTP 307. The UI saves photos through a server action. The current FastAPI application exposes only health, so the standalone Gemini adapter has no live Scanner endpoint. |
| AI Crop Doctor | Blocked | HTTP 307. No live analysis was available to display. |
| Crop Memory | Blocked | HTTP 307. Source inspection found a labeled sample preview and an unavailable findings state. No live or persisted comparison was verified. |
| My Fields | Blocked | HTTP 307. Hosted field and private photo persistence could not be exercised. |
| Weather Guardian | Blocked | HTTP 307. The component reads fixed labeled sample data. A separate direct Open-Meteo request returned HTTP 200, a current temperature, and three daily precipitation values. This does not establish frontend integration or an alert. |
| Reminders | Blocked | HTTP 307. Creation and persistence could not be exercised. |
| Assistant (English and Urdu) | Blocked | HTTP 307. Source inspection found an unavailable conversations state. No browser reply or RTL conversation was verified. |
| Reports and PDF download | Blocked | HTTP 307. The component identifies reports as sample scenarios and saved downloads as unavailable. |
| FastAPI readiness | Pass | Local GET /health returned HTTP 200 and status ok. |
| Python regression suite | Pass | From backend, .venv/Scripts/python.exe -m unittest discover -s tests passed 25 tests. These checks do not establish browser integration. |

The already-running Next.js and FastAPI processes responded directly without Docker. Neither frontend/.env.local nor backend/.env was present, and no Supabase or Gemini environment variable was visible in the shell. Hosted authentication, private storage, database persistence, and a new Gemini call could not be verified. Application source was preserved. No authentication or storage bypass was used. The capture harness was repaired by installing its matching Playwright FFmpeg binary in the existing local cache.

## Video verification and release gate

[Auth navigation evidence](evidence/Auth_Navigation.mp4) contains real browser interaction and serves as short diagnostic evidence. FFmpeg encoded it and ffprobe checked H.264, 1920 × 1080, and 30 fps. There is no narration. The intended final file at demo-video/output/CropShield_AI_Final_5_Minute_Demo.mp4 was withheld because the protected journeys, live responses, persistence, and report download could not be recorded. Before recording, configure the intended development Supabase project and Gemini server credentials, connect and verify the outstanding frontend integrations, and establish comparison provenance.

# Four-minute judge demo

## Rehearsal setup

From the repository root, run `npm run dev` inside `frontend/`. In another PowerShell terminal run `.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000` inside `backend/`. The README covers installing the virtual environment and packages.

The offline demo uses no project credentials. Run a live Gemini step only with an approved sample photo and a valid server-side `GEMINI_API_KEY` set privately in the shell. For testing the hosted workspace, configure the intended Supabase development project and two test accounts before rehearsal. Leave event and deployment links blank until verified.

| Time | Action | What judges should see |
| --- | --- | --- |
| 0:00–0:30 | Open [local login](http://localhost:3000/login). Try `/dashboard` in a signed-out window. | The app redirects to login and indicates missing Supabase setup when appropriate. |
| 0:30–1:25 | Show the licensed sample `frontend/public/crops/close.jpg`. With a configured key, run `.\.venv\Scripts\python.exe -m crop_analysis ../frontend/public/crops/close.jpg` from `backend/`. | Validated stage or uncertainty, visible evidence and suggested observations. A provider error ends this segment and does not produce a result. |
| 1:25–2:15 | From `backend/`, run `.\.venv\Scripts\python.exe -m crop_analysis.compare_samples --sources` and display the two attributed images. | The output labels the pair illustrative. Neither photo has a claimed date, plot identity, or growth interval. |
| 2:15–3:15 | From `backend/`, run `.\.venv\Scripts\python.exe -m unittest discover -s tests -v`. Point out the ownership, weather report, Urdu reply, and PDF tests. | Local test evidence. Weather uses a report fixture and the assistant uses a mocked provider in tests. |
| 3:15–4:00 | Summarize pending hosted signup, private photo retrieval, saved comparisons and reports. | A clear plan for verifying the app with two test accounts before using live field records. |

## Fallback

Use the [desktop login capture](screenshots/login-desktop.png) or [mobile signup capture](screenshots/signup-mobile.png) if the local web server fails. If Gemini fails or the key is missing, show the offline tests and explain that development examples and mocked responses are not live results. The standalone health endpoint and rendering tests do not demonstrate authenticated report downloads. Avoid showing credentials, private crops, or test account inboxes in recordings.

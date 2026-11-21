# Five-minute speaker script

## 1. CropShield AI · 0:00–0:20 (20 seconds)

CropShield AI is a wheat-first prototype for keeping field photos and their context together. The screen here is the real local sign-in page. Our goal is to make a repeat field visit easier to plan by keeping a dated record of what was visible and what still needs a closer look. First, consider what a photo can actually tell us.

Evidence — Current login capture

## 2. The agricultural problem · 0:20–0:55 (35 seconds)

A single crop photograph gives us one angle and one moment. A change in lighting or framing can make two photos look very different, and a discolored leaf can have more than one explanation. That matters when the next decision is where and when to inspect. Research on wheat production also shows why weather exposure deserves attention. CropShield starts by keeping dates, field context and visible evidence together, so a grower can interpret the photo in context. Next, here is the evidence behind that design.

Evidence — Asseng et al. (2015) and Mohanty et al. (2016)

## 3. Research and user validation · 0:55–1:25 (30 seconds)

Mohanty and colleagues found that an image classifier performed considerably worse on photos captured outside its original setting. The Pakistan Agricultural Research Council also reports wheat disease screening activity, an example of the structured field observation on which agricultural decisions depend. These sources motivate repeatable capture and careful wording around uncertainty. We have prepared the farmer questionnaire, and responses have yet to be collected. Those needs are the starting point for the proposed workflow.

Evidence — Mohanty et al. (2016); PARC Annual Report 2023–24; repository questionnaire

## 4. Our solution · 1:25–2:00 (35 seconds)

The intended flow is to observe, analyze, remember, warn and advise. The app already has protected routes and field and photo handling code. A standalone adapter validates Gemini output, and comparison rules have passed software tests. That gives us a foundation for recording visible change. Hosted uploads and saved analyses still need verification. Live weather and conversational guidance are later steps in the same flow. The heart of the design is the memory layer, which asks whether two observations can be compared at all.

Evidence — Final audit and architecture

## 5. Crop Memory · 2:00–2:45 (45 seconds)

Treat these two photographs as illustrations from separate sources. Look at the visible green tones on the left and the more golden tones on the right. The framing differs, so those visible differences cannot establish growth over time. A historical comparison requires two confirmed dates and observations from the same field owned by the user. The service calculates the interval from those dates and keeps provenance and uncertainty with the result. Fifteen to twenty-five days is our suggested starting interval for the product. The pair on screen has no verified plot or date, so it carries no interval or AI comparison result. Next, consider the other signals a grower could use.

Evidence — Current standalone provenance output; historical comparison tests

## 6. Crop Doctor and Weather Guardian · 2:45–3:20 (35 seconds)

In a prior standalone call, Gemini estimated grain development and acknowledged what a single photo could not reveal about the kernel or moisture. That example shows how the adapter returns both a finding and its uncertainty. It gives no accuracy estimate and no confirmed diagnosis. Weather Guardian currently has sample scenarios. Field forecasts, local risk thresholds and the delivery of inspection reminders still need verification. The architecture makes those gaps visible by distinguishing what ran locally from what remains to be connected.

Evidence — Archived Gemini smoke test; final audit; Asseng et al. (2015)

## 7. Technical architecture · 3:20–3:55 (35 seconds)

Next.js serves the protected workspace and checks identity on the server. FastAPI currently exposes the local health endpoint. Separately, the Python adapters validate input and structured Gemini replies. The Supabase schema defines owner-scoped field data and private photo storage. The local fixtures exercised those ownership rules, while hosted Auth and Storage remain unverified. No live forecast feed was used for this presentation. On the next slide, I’ll show the results we can reproduce locally.

Evidence — Architecture; current login and health probes; Phase 7 fixture audit

## 8. Working prototype and results · 3:55–4:40 (45 seconds)

Here is the real signup screen captured from the running build. Signed-out requests to eight checked workspace routes redirected to login, and FastAPI returned a healthy response. The Python suite passed twenty-five tests. They cover historical date and ownership checks, illustrative provenance, and rendering a report from test data. One earlier provider call returned schema-valid output. We have zero labeled holdout images and zero live comparison pairs, so we cannot report stage agreement, symptom accuracy or latency. If time allows, open the protected route to show the redirect. Then close with what has to be verified next.

Evidence — Current unittest and browser results; AI evaluation; prior local PDF fixture

## 9. Impact and closing · 4:40–5:00 (20 seconds)

The practical value we are aiming for is a field record that helps a grower decide what to inspect next. The next checks are two-account hosted storage, same-field history and a labeled field evaluation. CropShield AI — Smarter Crop Monitoring, Better-Informed Farming Decisions.

Evidence — Project roadmap; no measured yield or adoption claim

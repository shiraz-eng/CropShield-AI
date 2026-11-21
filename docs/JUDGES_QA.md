# Judges’ Q&A

| Question | Answer |
| --- | --- |
| What problem does CropShield solve? | It helps growers keep dated field photos and findings together so they can decide what to inspect next. |
| What is innovative? | Crop Memory checks whether two images are eligible for a historical comparison and carries forward uncertainty and source information. |
| How do historical and illustrative comparisons differ? | Historical mode requires two confirmed dates and the same owned field. Illustrative pairs carry attribution and no historical interval. |
| How does Gemini analyze crops? | The adapter validates and decodes images, sends a small request, and validates the structured reply. |
| How accurate is it? | Accuracy is unmeasured. One prior call verified provider connectivity and schema compatibility for a development photo. |
| Why start with wheat? | A narrow crop scope makes stage vocabulary, capture guidance, and evaluation easier to define. |
| How are dates verified? | The service requires confirmed dates, validates their order, and calculates elapsed calendar days. Hosted capture and ownership still need end-to-end verification. |
| How does Weather Guardian work? | The current screen shows historical sample forecast scenarios. A live service would validate location, timestamps and units before deriving cautions. |
| What happens when Gemini fails? | The independent adapter surfaces a timeout, rate limit, provider error or invalid output. It does not substitute a generated finding. |
| How is data protected? | App routes check identity server-side. The migrations define owner-scoped policies and a private photo bucket. Two-owner isolation passed in local fixtures. |
| How could it scale? | Validate costs and throughput first, then consider queued analysis, per-account limits, and reuse of verified saved findings. |
| What are the limitations? | Hosted workflows, live weather, stored assistant conversations, and downloadable in-app reports are pending. Image-only evidence has limits. |
| How could farmers adopt it? | Test the capture routine with growers and extension teams, then adjust instructions and language support based on observed use. |

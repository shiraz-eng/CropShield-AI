# Pitch evidence

Accessed on November 20, 2026. A general hackathon format was used because no event or rubric was identified. Team names were omitted because none were confirmed.

## Claim register

| Slide | Claim | Classification | Supporting evidence |
| --- | --- | --- | --- |
| 1, 8 | The local sign-in and signup screens render | Verified implementation | Unmodified browser captures in ../screenshots. The setup notice is part of the actual app. |
| 2, 3 | Image-based classification is sensitive to capture conditions | Published research | Mohanty, Hughes and Salathé, 2016. The independent external-image result was substantially weaker than the controlled-dataset result. [Paper](https://doi.org/10.3389/fpls.2016.01419) |
| 2, 6 | Heat exposure matters for wheat production | Published research | Asseng et al., 2015. A multi-model study estimated lower wheat production under warming. The study does not establish a local CropShield caution threshold. [Paper](https://doi.org/10.1038/nclimate2470) |
| 3 | Pakistan Agricultural Research Council reports organized wheat disease screening | Published research | PARC Annual Report 2023–2024, Plant Protection section, describes the National Wheat Disease Screening Nursery. [Annual report](https://www.parc.gov.pk/SiteImage/Misc/files/PARC%20Annual%20Report%202023-24_compressed.pdf) |
| 3 | Farmer questionnaire ready | Verified implementation | Ten-question questionnaire exists. Responses and user validation remain pending. [Questionnaire](../../../docs/FARMER_SURVEY.md) |
| 4 | Observe, Analyze, Remember, Warn, Advise | Proposed feature | Product workflow. Local analysis and comparison components were tested independently. Hosted data flow, weather, and assistant channels remain incomplete. |
| 5 | Historical service checks same owner, same field and confirmed dates | Verified implementation | Unit tests and PostgreSQL fixtures. The 15–25 day interval is a suggested product default. No historical pair was verified for the deck. |
| 5 | Illustration photos differ visibly in color and framing | Verified implementation | Actual local image pair and current standalone provenance command. Stage, capture date and plot identity are unverified. |
| 6 | One archived response estimated grain development with uncertainty | Measured result | November 20, 2026 standalone smoke test with one development image. Schema validation succeeded. No labeled accuracy or latency was measured. [Evaluation](../../../docs/AI_EVALUATION.md) |
| 6 | Weather UI uses labeled examples | Verified implementation | Local code and prior audit. Current live forecast, caution triggering, thresholds, and reminder delivery are unverified. |
| 7 | Next.js access checks and FastAPI health run locally | Verified implementation | Current anonymous-route checks and successful health request. Gemini runs through the separate adapter. Supabase policies were exercised with fixtures only. |
| 8 | 25/25 Python tests, eight checked protected redirects, one prior smoke photo and zero labeled holdout cases | Measured result | Current unit test, route and health checks. The one-photo smoke run is archival. [Final audit](../../../docs/FINAL_AUDIT.md) |
| 9 | A dated field history could help growers plan their next inspection | Proposed feature | Product goal. Yield, adoption, and decision impact are unmeasured. |

## Photographs

The selected illustrative pair uses the [Unsplash License](https://unsplash.com/license). Photos are [Jatin Punia’s green wheat](https://unsplash.com/photos/a-close-up-of-a-bunch-of-green-wheat-PLrAAPUfGIQ) and [Marek Studzinski’s field of wheat](https://unsplash.com/photos/a-close-up-of-a-field-of-wheat-UQEpP1nll1A). The assets are existing repository images in frontend/public/crops. No historical relationship is claimed.

## Pitch format sources

- [Devpost demo guidance](https://help.devpost.com/article/84-video-making-best-practices) recommends showing the project and explaining its purpose early.
- [Y Combinator Demo Day guidance](https://www.ycombinator.com/blog/guide-to-demo-day-pitches/) and [deck design guidance](https://www.ycombinator.com/library/4T-how-to-design-a-better-pitch-deck) emphasize legibility and simple slides.
- Event-specific judging, submission and timing requirements remain unverified.

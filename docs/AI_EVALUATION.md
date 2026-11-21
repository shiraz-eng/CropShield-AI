# AI evaluation

## Results

| Run | Cases | Finding |
| --- | ---: | --- |
| Prior live adapter smoke | 1 development photo | Gemini returned schema-valid findings. The image had no independently reviewed stage or symptom labels and elapsed time was not recorded. |
| Phase 7 live holdout | 0 | No configured key or reviewed holdout manifest. |
| Phase 7 live comparison | 0 pairs | No verified same-plot dates or configured key. |
| Offline tests | Software fixtures | Invalid images, rejected ownership, date order, inconclusive output, malformed output, provider failures and provenance were exercised. They are not accuracy samples. |

Crop screening agreement, stage agreement, symptom classification, rejection rates, comparison repeatability and provider latency remain unmeasured.

## Reproducible protocol

1. Create a local holdout folder outside the development photos. For wheat positives consider the [GWHD 2021 release](https://zenodo.org/records/5092309). Verify the license and image credit for every case. GWHD head annotations are not stage, symptom or paired-plot labels.
2. Have a qualified reviewer assign optional labels only where evidence supports them. Include non-wheat negatives, insufficient-quality cases and uncertain cases. Group samples by site or source so related images cannot cross the development and holdout split.
3. Make a JSON array of objects containing `id`, `image` (path relative to the manifest), `source`, and `license`. Optional labels are `expected_crop` (wheat or non_wheat), `expected_stage`, `expected_symptoms`, `expected_quality`, and `expected_inconclusive`. Omit unverified labels. Set a server-side Gemini key privately only for the reviewed run.
4. From `backend/`, run `.\.venv\Scripts\python.exe -m crop_analysis.evaluate path/to/holdout.json` for offline manifest validation. Add `--run` for provider requests. The runner reports per-metric labeled, agreed, abstained and failed counts, per-case findings and successful-call latency. Crop screening is a probe using the wheat-declared adapter. Symptom exact-set agreement is text matching and needs a reviewer for clinical or agronomic interpretation.
5. Repeat each vetted historical pair under a fixed model and settings once a verified pair set exists. Review stage, symptom changes, comparability and uncertainty across runs. Keep separate results for unrelated illustrative pairs and record all failures. The current runner scores single images only.

Stop any field-use claim until the holdout is representative of expected field conditions and results are reviewed.

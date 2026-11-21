"""Evaluate the wheat adapter against an explicitly licensed local holdout manifest."""

import argparse
import json
import statistics
from collections import Counter
from pathlib import Path
from time import perf_counter
from typing import Annotated, Literal
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, TypeAdapter

from .__main__ import MIME_BY_EXTENSION
from .gemini import AnalysisUnavailable, GeminiCropAnalysis
from .images import MAX_IMAGE_BYTES, CropImage
from .schema import Details, Stage, VisibleDetail


class Sample(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    id: VisibleDetail
    image: VisibleDetail
    source: HttpUrl
    license: VisibleDetail
    expected_crop: Literal["wheat", "non_wheat"] | None = None
    expected_stage: Stage | None = None
    expected_symptoms: Details | None = None
    expected_quality: Literal["adequate", "limited", "insufficient"] | None = None
    expected_inconclusive: bool | None = None


def load_samples(manifest: Path) -> list[tuple[Sample, Path]]:
    samples = TypeAdapter(Annotated[list[Sample], Field(max_length=30)]).validate_json(manifest.read_bytes())
    if len({item.id for item in samples}) != len(samples):
        raise ValueError("Sample IDs must be unique.")
    directory = manifest.resolve().parent
    result = []
    seen = set()
    for item in samples:
        path = (directory / item.image).resolve()
        if not path.is_relative_to(directory) or not path.is_file() or path.suffix.lower() not in MIME_BY_EXTENSION:
            raise ValueError(f"Sample {item.id} needs a supported image inside the manifest directory.")
        if path in seen or not 0 < path.stat().st_size <= MAX_IMAGE_BYTES:
            raise ValueError(f"Sample {item.id} is duplicated or outside the image size limit.")
        seen.add(path)
        result.append((item, path))
    return result


def evaluate(provider: GeminiCropAnalysis, samples: list[tuple[Sample, Path]]) -> dict:
    metric_names = ("crop_screening", "stage", "symptom_exact_set", "quality", "inconclusive")
    metrics = {name: Counter(labeled=0, agreed=0, abstained=0, failed=0) for name in metric_names}
    rows = []
    latencies = []
    for sample, path in samples:
        expected = (
            sample.expected_crop, sample.expected_stage, sample.expected_symptoms,
            sample.expected_quality, sample.expected_inconclusive,
        )
        with path.open("rb") as image:
            content = image.read(MAX_IMAGE_BYTES + 1)
        started = perf_counter()
        try:
            findings = provider.analyze(uuid4(), "Wheat", [CropImage(content, MIME_BY_EXTENSION[path.suffix.lower()])]).findings
        except (AnalysisUnavailable, ValueError) as error:
            rows.append({"id": sample.id, "failure": getattr(error, "code", "invalid_image")})
            for name, label in zip(metric_names, expected, strict=True):
                if label is not None:
                    metrics[name].update(("labeled", "failed"))
            continue
        latency = round((perf_counter() - started) * 1000)
        latencies.append(latency)
        crop = {"completed": "wheat", "unsupported_crop": "non_wheat"}.get(findings.analysis_status)
        actual = (
            crop, findings.growth_stage, findings.visible_symptoms, findings.image_quality,
            findings.analysis_status == "inconclusive",
        )
        rows.append({"id": sample.id, "elapsed_ms": latency, "findings": findings.model_dump(mode="json")})
        for name, label, prediction in zip(metric_names, expected, actual, strict=True):
            if label is None:
                continue
            metrics[name]["labeled"] += 1
            if prediction is None or (name == "stage" and prediction == "uncertain" and label != "uncertain"):
                metrics[name]["abstained"] += 1
            elif name == "symptom_exact_set":
                metrics[name]["agreed"] += {value.casefold() for value in label} == {value.casefold() for value in prediction}
            else:
                metrics[name]["agreed"] += label == prediction
    return {
        "model": provider.model, "samples": len(samples), "metrics": metrics,
        "median_success_ms": statistics.median(latencies) if latencies else None, "results": rows,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest", type=Path)
    parser.add_argument("--run", action="store_true", help="Send the listed images to Gemini.")
    args = parser.parse_args()
    try:
        samples = load_samples(args.manifest)
        if not args.run:
            print(json.dumps({"manifest_samples": len(samples), "provider_calls": 0}))
            return 0
        if not samples:
            raise ValueError("Provide at least one reviewed holdout case.")
        provider = GeminiCropAnalysis.from_environment()
        try:
            print(json.dumps(evaluate(provider, samples), indent=2, ensure_ascii=True))
        finally:
            provider.close()
    except (AnalysisUnavailable, ValueError, OSError) as error:
        parser.exit(2, f"{error}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

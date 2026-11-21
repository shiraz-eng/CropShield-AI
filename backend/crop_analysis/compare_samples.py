"""Run the sourced, illustrative wheat comparison outside the web application."""

import argparse
import json
import sys
from pathlib import Path

from pydantic import HttpUrl

from .comparison import DatasetPhoto, DatasetSource, compare_dataset
from .gemini import AnalysisUnavailable, GeminiCropAnalysis
from .images import MAX_IMAGE_BYTES, CropImage

SAMPLES = Path(__file__).with_name("sample_data")
NOTICE = "Illustrative growth-stage comparison — not verified historical field progression."


def load_sample_photos() -> list[DatasetPhoto]:
    """Load the two attributed sample photos bundled with the API."""
    catalog = json.loads((SAMPLES / "comparison-samples.json").read_text(encoding="utf-8"))
    photos = []
    for entry in catalog["photos"]:
        with (SAMPLES / entry["filename"]).open("rb") as image:
            content = image.read(MAX_IMAGE_BYTES + 1)
        if not 0 < len(content) <= MAX_IMAGE_BYTES:
            raise ValueError("Invalid sample photo size.")
        photos.append(DatasetPhoto(
            CropImage(content, "image/jpeg"),
            DatasetSource(
                dataset_name=catalog["dataset_name"], source_url=HttpUrl(entry["source_url"]),
                attribution=entry["attribution"], license=catalog["license"], known_label=entry["label"],
            ),
        ))
    if len(photos) != 2:
        raise ValueError("The sample catalog needs exactly two photos.")
    return photos


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Compare two attributed sample wheat photographs.")
    parser.add_argument("--sources", action="store_true", help="Print provenance without calling Gemini.")
    args = parser.parse_args(argv)
    try:
        photos = load_sample_photos()
        first, second = photos
    except (OSError, KeyError, ValueError):
        print("Could not load the attributed sample photographs.", file=sys.stderr)
        return 2

    if args.sources:
        payload = {"comparison_mode": "illustrative_dataset", "notice": NOTICE,
                   "source_provenance": [photo.source.model_dump(mode="json") for photo in photos]}
    else:
        try:
            provider = GeminiCropAnalysis.from_environment()
            try:
                payload = compare_dataset(provider, first, second).model_dump(mode="json")
            finally:
                provider.close()
        except (AnalysisUnavailable, ValueError) as error:
            print(error, file=sys.stderr)
            return 1
        payload["notice"] = NOTICE
    print(json.dumps(payload, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

"""Run a single analysis for an approved local wheat photo."""

import argparse
import sys
from pathlib import Path
from uuid import uuid4

from .gemini import AnalysisUnavailable, GeminiCropAnalysis
from .images import MAX_IMAGE_BYTES, CropImage

MIME_BY_EXTENSION = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Send one approved local wheat photo to Gemini and print the validated findings."
    )
    parser.add_argument("photo", type=Path, help="JPEG, PNG, or WebP, up to 10 MB")
    args = parser.parse_args(argv)
    mime = MIME_BY_EXTENSION.get(args.photo.suffix.lower())
    if not mime:
        parser.error("Choose a JPEG, PNG, or WebP photo.")

    try:
        with args.photo.open("rb") as source:
            content = source.read(MAX_IMAGE_BYTES + 1)
        if not 0 < len(content) <= MAX_IMAGE_BYTES:
            raise ValueError("Choose a nonempty photo up to 10 MB.")
    except OSError:
        print("Could not open the selected photo.", file=sys.stderr)
        return 2
    except ValueError as error:
        print(error, file=sys.stderr)
        return 2

    try:
        analysis = GeminiCropAnalysis.from_environment()
        try:
            result = analysis.analyze(uuid4(), "Wheat", [CropImage(content, mime)])
        finally:
            analysis.close()
    except (AnalysisUnavailable, ValueError) as error:
        print(error, file=sys.stderr)
        return 1

    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

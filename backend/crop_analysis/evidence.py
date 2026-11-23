"""Deterministic capture measurements and comparison screening."""

from datetime import date
from io import BytesIO
from typing import Literal

from PIL import Image, ImageChops, ImageOps, ImageStat
from pydantic import BaseModel

from .images import FORMATS, MAX_IMAGE_BYTES, MAX_IMAGE_PIXELS, CropImage

LIMITATIONS = [
    "Sharpness and exposure thresholds are heuristics. Smooth leaves, shadows, and bright sky can affect them.",
    "Crop visibility, obstructions, and camera angle require visual review.",
]


class Measurement(BaseModel):
    width: int
    height: int
    mean_luminance: float
    dark_pixel_fraction: float
    bright_pixel_fraction: float
    edge_energy: float


class PhotoQuality(BaseModel):
    quality_status: Literal["usable", "warning", "unavailable"]
    detected_issues: list[str]
    explanations: list[str]
    retake_guidance: list[str]
    measurement_metadata: Measurement | None
    assessment_limitations: list[str]


def photo_quality(photo: CropImage) -> PhotoQuality:
    try:
        if not 0 < len(photo.content) <= MAX_IMAGE_BYTES or photo.mime_type not in FORMATS:
            raise ValueError()
        with Image.open(BytesIO(photo.content)) as original:
            if (original.format != FORMATS[photo.mime_type]
                    or original.width * original.height > MAX_IMAGE_PIXELS
                    or getattr(original, "is_animated", False)):
                raise ValueError()
            image = ImageOps.exif_transpose(original)
            width, height = image.size
            image.thumbnail((384, 384), Image.Resampling.LANCZOS)
            gray = image.convert("L")
            histogram = gray.histogram()
            count = gray.width * gray.height
            dark = sum(histogram[:21]) / count
            bright = sum(histogram[235:]) / count
            mean = ImageStat.Stat(gray).mean[0]
            # Adjacent-pixel differences omit artificial frame boundaries.
            differences = []
            for dx, dy in ((1, 0), (0, 1)):
                if gray.width > dx and gray.height > dy:
                    delta = ImageChops.difference(
                        gray.crop((0, 0, gray.width - dx, gray.height - dy)),
                        gray.crop((dx, dy, gray.width, gray.height)),
                    )
                    differences.append(ImageStat.Stat(delta).rms[0] ** 2)
            energy = sum(differences) / len(differences) if differences else 0.0
    except (OSError, ValueError, Image.DecompressionBombError):
        return PhotoQuality(
            quality_status="unavailable", detected_issues=["unreadable"],
            explanations=["The photo could not be measured as a supported still image."],
            retake_guidance=["Choose a readable JPEG, PNG, or WebP photo within the upload limits."],
            measurement_metadata=None, assessment_limitations=LIMITATIONS,
        )

    checks = [
        (min(width, height) < 480, "low_resolution", "The shorter image side is below 480 pixels.", "Use the original image or move closer without digital zoom."),
        (mean < 45 or dark > .65, "underexposed", "Much of the photo is dark.", "Use even daylight and avoid shooting into the sun."),
        (mean > 215 or bright > .65, "overexposed", "Much of the photo is very bright.", "Avoid glare and use even daylight or open shade."),
        (energy < 24, "low_detail", "Little edge detail was measured. The image may be soft or the subject may be smooth.", "Steady the camera, tap to focus on the crop, and take another photo."),
    ]
    issues = [(code, explanation, guidance) for failed, code, explanation, guidance in checks if failed]
    return PhotoQuality(
        quality_status="warning" if issues else "usable",
        detected_issues=[item[0] for item in issues],
        explanations=[item[1] for item in issues], retake_guidance=[item[2] for item in issues],
        measurement_metadata=Measurement(
            width=width, height=height, mean_luminance=round(mean, 2),
            dark_pixel_fraction=round(dark, 3), bright_pixel_fraction=round(bright, 3),
            edge_energy=round(energy, 2),
        ),
        assessment_limitations=LIMITATIONS,
    )


class Readiness(BaseModel):
    status: Literal["suitable", "limited", "unsuitable"]
    explanations: list[str]
    corrective_actions: list[str]
    assessment_limitations: list[str]


def comparison_readiness(
    first: list[CropImage], second: list[CropImage], *,
    illustrative: bool, same_field: bool = False, dates: tuple[date, date] | None = None,
) -> Readiness:
    limitations = [
        "Aspect ratio is a framing proxy. Crop coverage, obstructions and viewpoint need visual review.",
        "Image measurements cannot establish field identity, capture dates, or growth progression.",
    ]
    reasons = []
    actions = []
    status: Literal["suitable", "limited", "unsuitable"] = "suitable"
    if illustrative:
        status = "limited"
        reasons.append("Illustrative photos can show visible differences only. They do not establish a field history.")
    elif not same_field or dates is None or dates[0] >= dates[1]:
        status = "unsuitable"
        reasons.append("Historical comparisons require two distinct saved dates from the same authorized field.")
        actions.append("Choose two dated observations from one field.")
    groups = [[photo_quality(photo) for photo in group] for group in (first, second)]
    if any(not group or any(photo.measurement_metadata is None for photo in group) for group in groups):
        status = "unsuitable"
        reasons.append("Both observations need a readable photograph.")
    elif any(photo.quality_status != "usable" for group in groups for photo in group):
        if status == "suitable":
            status = "limited"
        reasons.append("At least one photo has a capture warning or could not be measured.")
    # Compare the first photo in each set, matching the app's preview.
    if all(group and group[0].measurement_metadata for group in groups):
        a, b = (group[0].measurement_metadata for group in groups)
        assert a is not None and b is not None
        differences = [
            (abs(a.mean_luminance - b.mean_luminance) > 45, "Lighting differs substantially."),
            (max(a.width / a.height, b.width / b.height) / min(a.width / a.height, b.width / b.height) > 1.35,
             "The lead photos have different aspect ratios or orientations."),
            (max(min(a.width, a.height), min(b.width, b.height)) > 2 * min(a.width, a.height, b.width, b.height),
             "The lead photos differ substantially in resolution."),
        ]
        for different, message in differences:
            if different:
                reasons.append(message)
                if status == "suitable":
                    status = "limited"
    if status != "suitable":
        actions.append("Repeat the same field area and crop section from a similar height and direction in even light.")
    return Readiness(
        status=status, explanations=reasons or ["No significant differences were flagged by the measurable checks."],
        corrective_actions=actions, assessment_limitations=limitations,
    )

from dataclasses import dataclass
from io import BytesIO

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_IMAGE_BYTES = 10 * 1024 * 1024
MAX_INLINE_BYTES = 13 * 1024 * 1024
MAX_IMAGE_PIXELS = 32_000_000
FORMATS = {"image/jpeg": "JPEG", "image/png": "PNG", "image/webp": "WEBP"}


@dataclass(frozen=True)
class CropImage:
    content: bytes
    mime_type: str


def prepare_images(images: list[CropImage]) -> list[CropImage]:
    if not 1 <= len(images) <= 3:
        raise ValueError("Select an observation with one to three photos.")
    result = [_prepare_image(image) for image in images]
    if sum(len(image.content) for image in result) > MAX_INLINE_BYTES:
        raise ValueError("Choose photos with a smaller combined size.")
    return result


def _prepare_image(photo: CropImage) -> CropImage:
    expected = FORMATS.get(photo.mime_type)
    if not expected or not 0 < len(photo.content) <= MAX_IMAGE_BYTES:
        raise ValueError("Use JPEG, PNG, or WebP images up to 10 MB each.")
    try:
        with Image.open(BytesIO(photo.content)) as image:
            if image.format != expected or image.width * image.height > MAX_IMAGE_PIXELS:
                raise ValueError("Photo content does not match its format or exceeds 32 megapixels.")
            if getattr(image, "is_animated", False):
                raise ValueError("Choose a still photo.")
            image.load()
            with ImageOps.exif_transpose(image).convert("RGB") as clean:
                clean.thumbnail((2048, 2048))
                clean.info.clear()
                output = BytesIO()
                clean.save(output, format=expected)
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError("The photo could not be decoded.") from error
    return CropImage(output.getvalue(), photo.mime_type)

import json
import unittest
from datetime import date
from io import BytesIO
from unittest.mock import patch
from uuid import uuid4

import httpx2 as httpx
from fastapi import HTTPException
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw, ImageFilter

from crop_analysis import api
from crop_analysis.comparison import ComparisonFindings
from crop_analysis.evidence import comparison_readiness, photo_quality
from crop_analysis.images import CropImage
from main import app
from test_api_endpoints import OWNER, OBS, TOKEN, observation_row
import test_api_endpoints as endpoint_fixtures


def fixture() -> Image.Image:
    """Synthetic edge target for measuring blur. It contains no crop imagery."""
    image = Image.new("L", (640, 480), 62)
    draw = ImageDraw.Draw(image)
    for x in range(0, 640, 20):
        draw.rectangle((x, 0, x + 9, 480), fill=194)
    return image


def png(image: Image.Image) -> CropImage:
    output = BytesIO()
    image.save(output, format="PNG")
    return CropImage(output.getvalue(), "image/png")


class CaptureMeasurements(unittest.TestCase):
    def test_sharp_and_blur(self):
        sharp = photo_quality(png(fixture()))
        blurred = photo_quality(png(fixture().filter(ImageFilter.GaussianBlur(9))))
        self.assertEqual(sharp.quality_status, "usable")
        self.assertIn("low_detail", blurred.detected_issues)
        self.assertGreater(sharp.measurement_metadata.edge_energy, blurred.measurement_metadata.edge_energy)

    def test_exposure_and_size(self):
        dark = photo_quality(png(Image.new("L", (200, 200), 12)))
        bright = photo_quality(png(Image.new("L", (640, 480), 250)))
        self.assertIn("underexposed", dark.detected_issues)
        self.assertIn("low_resolution", dark.detected_issues)
        self.assertIn("overexposed", bright.detected_issues)
        self.assertEqual(dark.measurement_metadata.dark_pixel_fraction, 1)
        self.assertEqual(bright.measurement_metadata.bright_pixel_fraction, 1)

    def test_unreadable_unsupported_missing_and_mislabeled(self):
        for sample in (CropImage(b"", "image/png"), CropImage(b"bad", "image/png"),
                       CropImage(png(fixture()).content, "image/gif"),
                       CropImage(png(fixture()).content, "image/jpeg")):
            with self.subTest(sample=sample.mime_type):
                self.assertEqual(photo_quality(sample).quality_status, "unavailable")

    def test_dated_repeat_capture_and_orientation_change(self):
        photo = png(fixture())
        dates = (date(2026, 9, 1), date(2026, 9, 20))
        result = comparison_readiness([photo], [photo], illustrative=False, same_field=True, dates=dates)
        self.assertEqual(result.status, "suitable")
        rotated = png(fixture().rotate(90, expand=True))
        result = comparison_readiness([photo], [rotated], illustrative=False, same_field=True, dates=dates)
        self.assertEqual(result.status, "limited")
        self.assertTrue(any("orientations" in item for item in result.explanations))
        self.assertTrue(any("viewpoint" in item for item in result.assessment_limitations))
        different_view = png(fixture().transpose(Image.Transpose.FLIP_LEFT_RIGHT))
        same_geometry = comparison_readiness([photo], [different_view], illustrative=False, same_field=True, dates=dates)
        self.assertEqual(same_geometry.status, "suitable")  # Geometry cannot verify a changed camera viewpoint.

    def test_illustrative_and_missing_provenance(self):
        photo = png(fixture())
        other = png(Image.new("L", (640, 480), 110))
        self.assertEqual(comparison_readiness([photo], [other], illustrative=True).status, "limited")
        self.assertEqual(comparison_readiness([photo], [other], illustrative=False, same_field=True).status, "unsuitable")
        self.assertEqual(comparison_readiness([photo], [], illustrative=True).status, "unsuitable")


class EvidenceEndpoints(unittest.TestCase):
    def test_historical_comparison_persists_readiness_with_saved_provenance(self):
        second_id = uuid4()
        saved = []
        photo = png(fixture())

        def handle(request):
            path = request.url.path
            if path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            if path == "/rest/v1/crop_observations":
                selected = request.url.params["id"].removeprefix("eq.")
                row = observation_row()
                row["id"] = selected
                row["observed_at"] = "2026-11-01" if selected == str(OBS) else "2026-11-20"
                row["observation_images"] = [{
                    "storage_path": f"{OWNER}/{selected}/photo.png", "mime_type": "image/png",
                }]
                return httpx.Response(200, json=[row])
            if path.startswith("/storage/v1/object/authenticated/"):
                return httpx.Response(200, content=photo.content)
            if path == "/rest/v1/crop_analyses":
                return httpx.Response(200, json=[])
            if path == "/rest/v1/crop_comparisons":
                saved.append(json.loads(request.content))
                return httpx.Response(201)
            self.fail(path)

        request = api.HistoricalRequest(first_observation_id=second_id, second_observation_id=OBS)
        readiness = endpoint_fixtures.EndpointTests.run_with(self, handle, lambda: api.historical_readiness(request, TOKEN))
        self.assertEqual(readiness.status, "suitable")
        with patch("crop_analysis.api.GeminiCropAnalysis.from_environment") as gemini:
            gemini.return_value.model = "fixture-model"
            gemini.return_value.generate_findings.return_value = ComparisonFindings(
                previous_growth_stage="uncertain", current_growth_stage="uncertain",
                observed_changes=[], newly_visible_symptoms=[], no_longer_visible_symptoms=[],
                possible_concerns=[], image_comparability="limited",
                uncertainty_notes=["Fixture response"], suggested_followup=[],
            )
            result = endpoint_fixtures.EndpointTests.run_with(self, handle, lambda: api.compare_observations(request, TOKEN))
        self.assertEqual(result.interval_days, 19)
        self.assertEqual(result.comparison_mode, "verified_historical")
        self.assertEqual(saved[0]["user_id"], OWNER)
        self.assertEqual(saved[0]["result"]["evidence_readiness"], readiness.model_dump())

    def test_photo_http_transport_and_missing_gemini(self):
        def handle(request):
            self.assertEqual(request.url.path, "/auth/v1/user")
            return httpx.Response(200, json={"id": OWNER})

        client = TestClient(app)
        with patch.dict("os.environ", {"GEMINI_API_KEY": ""}):
            response = endpoint_fixtures.EndpointTests.run_with(self, handle, lambda: client.post(
                "/photo-quality", content=png(fixture()).content,
                headers={"Content-Type": "image/png", "Authorization": "Bearer test-token"},
            ))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["quality_status"], "usable")
        self.assertEqual(client.post("/photo-quality", headers={"Content-Type": "image/png"}).status_code, 401)

    def test_foreign_observation_or_storage_path_is_not_read(self):
        for foreign_path in (False, True):
            def handle(request):
                if request.url.path == "/auth/v1/user":
                    return httpx.Response(200, json={"id": OWNER})
                if request.url.path == "/rest/v1/crop_observations":
                    self.assertEqual(request.url.params["user_id"], f"eq.{OWNER}")
                    row = observation_row()
                    row["observation_images"][0]["storage_path"] = f"{uuid4()}/{OBS}/foreign.jpg"
                    return httpx.Response(200, json=[row] if foreign_path else [])
                self.fail("A foreign photo should never be downloaded")

            with self.subTest(foreign_path=foreign_path), self.assertRaises(HTTPException) as error:
                endpoint_fixtures.EndpointTests.run_with(self, handle, lambda: api.historical_readiness(
                    api.HistoricalRequest(first_observation_id=OBS, second_observation_id=uuid4()), TOKEN,
                ))
            self.assertEqual(error.exception.status_code, 404)

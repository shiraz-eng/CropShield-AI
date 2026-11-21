from io import BytesIO
import json
import os
import unittest
from unittest.mock import MagicMock, patch
from uuid import uuid4

import httpx2 as httpx
from PIL import Image
from pydantic import ValidationError

from crop_analysis.gemini import AnalysisUnavailable, DEFAULT_MODEL, GeminiCropAnalysis
from crop_analysis.images import CropImage, prepare_images
from crop_analysis.schema import Findings


def png_photo() -> CropImage:
    buffer = BytesIO()
    with Image.new("RGB", (40, 40), "green") as image:
        image.save(buffer, format="PNG")
    return CropImage(buffer.getvalue(), "image/png")


class CropAnalysisTests(unittest.TestCase):
    def setUp(self):
        self.client = MagicMock()
        self.model = GeminiCropAnalysis(self.client)
        self.observation = uuid4()
        self.uncertain = {
            "analysis_status": "inconclusive", "image_quality": "limited",
            "growth_stage": "uncertain", "zadoks_range": None, "stage_evidence": [],
            "visible_symptoms": [], "possible_explanations": [],
            "uncertainty_notes": ["The stems are out of frame."],
            "recommended_observations": ["Photograph an entire plant."],
            "requires_expert_review": False,
        }

    def test_rejects_invalid_bytes_and_false_mime(self):
        for image in (CropImage(b"invalid", "image/png"), CropImage(png_photo().content, "image/jpeg")):
            with self.assertRaises(ValueError):
                prepare_images([image])

    def test_real_sdk_client_configuration_without_network(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "local-test-placeholder", "GEMINI_MODEL": ""}):
            analysis = GeminiCropAnalysis.from_environment()
            try:
                self.assertEqual(analysis.model, DEFAULT_MODEL)
            finally:
                analysis.close()

    def test_assistant_provider_retries_only_overload(self):
        with (
            patch.dict(os.environ, {"GEMINI_API_KEY": "local-test-placeholder"}),
            patch("crop_analysis.gemini.genai.Client") as client,
        ):
            GeminiCropAnalysis.from_environment(retry_overload=True)
            options = client.call_args.kwargs["http_options"]
            self.assertEqual(options.timeout, 18_000)
            self.assertEqual(options.retry_options.attempts, 3)
            self.assertEqual(options.retry_options.http_status_codes, [503])

    def test_uncertain_stage_uses_one_structured_call(self):
        self.client.models.generate_content.return_value.text = json.dumps(self.uncertain)
        result = self.model.analyze(self.observation, "wheat", [png_photo()])
        self.assertEqual(result.observation_id, self.observation)
        self.assertEqual(result.findings.growth_stage, "uncertain")
        self.client.models.generate_content.assert_called_once()
        request = self.client.models.generate_content.call_args.kwargs
        self.assertEqual(request["contents"][1].inline_data.mime_type, "image/png")
        self.assertEqual(request["config"].response_mime_type, "application/json")

    def test_estimate_requires_visible_evidence(self):
        with self.assertRaises(ValidationError):
            Findings.model_validate(self.uncertain | {"analysis_status": "completed", "growth_stage": "tillering"})

    def test_unsupported_crop_does_not_call_provider(self):
        with self.assertRaises(AnalysisUnavailable) as failure:
            self.model.analyze(self.observation, "corn", [png_photo()])
        self.assertEqual(failure.exception.code, "unsupported_crop")
        self.client.models.generate_content.assert_not_called()

    def test_timeout_and_malformed_response(self):
        provider = self.client.models.generate_content
        provider.side_effect = httpx.ReadTimeout("private upstream details")
        with self.assertRaises(AnalysisUnavailable) as failure:
            self.model.analyze(self.observation, "Wheat", [png_photo()])
        self.assertEqual(failure.exception.code, "timeout")
        self.assertNotIn("private", str(failure.exception))
        provider.side_effect = None
        provider.return_value.text = "{}"
        with self.assertRaises(AnalysisUnavailable) as failure:
            self.model.analyze(self.observation, "Wheat", [png_photo()])
        self.assertEqual(failure.exception.code, "invalid_output")

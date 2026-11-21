import json
import unittest
from dataclasses import replace
from datetime import UTC, date, datetime
from io import BytesIO
from unittest.mock import MagicMock, patch
from uuid import uuid4

import httpx2 as httpx
from PIL import Image
from pydantic import HttpUrl

from crop_analysis.comparison import (
    DatasetPhoto,
    DatasetSource,
    HistoricalObservation,
    compare_dataset,
    compare_historical,
)
from crop_analysis.gemini import AnalysisUnavailable, GeminiCropAnalysis
from crop_analysis.images import CropImage
from crop_analysis.schema import AnalysisResult, Findings


def photo(color: str) -> CropImage:
    buffer = BytesIO()
    with Image.new("RGB", (16, 16), color) as image:
        image.save(buffer, format="PNG")
    return CropImage(buffer.getvalue(), "image/png")


class ComparisonTests(unittest.TestCase):
    def setUp(self):
        self.client = MagicMock()
        self.generate = self.client.models.generate_content
        self.provider = GeminiCropAnalysis(self.client)
        self.owner = uuid4()
        self.first = HistoricalObservation(
            uuid4(), self.owner, uuid4(), "Wheat", date(2025, 5, 1), [photo("green")]
        )
        self.second = replace(
            self.first, id=uuid4(), confirmed_date=date(2025, 5, 19), images=[photo("yellow")]
        )
        self.payload = {
            "previous_growth_stage": "uncertain",
            "current_growth_stage": "uncertain",
            "observed_changes": ["Different visible color"],
            "newly_visible_symptoms": [],
            "no_longer_visible_symptoms": [],
            "possible_concerns": [],
            "image_comparability": "limited",
            "uncertainty_notes": ["The viewpoint differs."],
            "suggested_followup": ["Repeat the photograph from the same spot."],
        }
        self.generate.return_value.text = json.dumps(self.payload)

    def dataset(self, name, image):
        return DatasetPhoto(
            image,
            DatasetSource(
                dataset_name="Test fixture", source_url=HttpUrl(f"https://example.com/{name}"),
                attribution="Generated test fixture", license="Test fixture",
            ),
        )

    def test_historical_calculates_interval_and_keeps_metadata_outside_model_output(self):
        result = compare_historical(self.provider, self.owner, self.first, self.second)
        self.assertEqual(result.interval_days, 18)
        self.assertEqual(result.comparison_mode, "verified_historical")
        self.assertEqual(result.earlier_observation_id, self.first.id)
        self.generate.assert_called_once()
        request = self.generate.call_args.kwargs
        self.assertEqual(request["config"].response_mime_type, "application/json")
        self.assertEqual(sum(part.inline_data is not None for part in request["contents"]), 2)
        self.assertNotIn(str(self.owner), " ".join(part.text or "" for part in request["contents"]))

    def test_other_positive_interval_is_allowed(self):
        second = replace(self.second, confirmed_date=date(2025, 6, 1))
        self.assertEqual(compare_historical(self.provider, self.owner, self.first, second).interval_days, 31)

    def test_prior_analysis_is_forwarded_only_for_its_observation(self):
        analysis = AnalysisResult(
            observation_id=self.first.id, crop_type="Wheat", model_name="Test fixture",
            analyzed_at=datetime.now(UTC), findings=Findings(
                analysis_status="inconclusive", image_quality="limited",
                growth_stage="uncertain", zadoks_range=None, stage_evidence=[],
                visible_symptoms=[], possible_explanations=[],
                uncertainty_notes=["Only the upper leaves are visible."],
                recommended_observations=[], requires_expert_review=False,
            ),
        )
        with self.assertRaisesRegex(ValueError, "prior analysis"):
            compare_historical(self.provider, self.owner, self.first, replace(self.second, analysis=analysis))
        self.generate.assert_not_called()
        compare_historical(self.provider, self.owner, replace(self.first, analysis=analysis), self.second)
        parts = self.generate.call_args.kwargs["contents"]
        self.assertIn("Only the upper leaves are visible.", " ".join(part.text or "" for part in parts))

    def test_invalid_or_unconfirmed_dates(self):
        for invalid in (None, date(2025, 4, 30), date(2025, 5, 1)):
            with self.subTest(date=invalid), self.assertRaises(ValueError):
                compare_historical(self.provider, self.owner, self.first, replace(self.second, confirmed_date=invalid))
        self.generate.assert_not_called()

    def test_duplicate_and_different_field(self):
        for second in (self.first, replace(self.second, field_id=uuid4())):
            with self.assertRaisesRegex(ValueError, "same field"):
                compare_historical(self.provider, self.owner, self.first, second)
        self.generate.assert_not_called()

    def test_cross_user_rejected_before_model_call(self):
        for owner, second in (
            (uuid4(), self.second), (self.owner, replace(self.second, owner_id=uuid4()))
        ):
            with self.assertRaises(PermissionError):
                compare_historical(self.provider, owner, self.first, second)
        self.generate.assert_not_called()

    def test_unsupported_crop_and_no_images(self):
        with self.assertRaises(AnalysisUnavailable) as unsupported:
            compare_historical(self.provider, self.owner, self.first, replace(self.second, crop_type="Corn"))
        self.assertEqual(unsupported.exception.code, "unsupported_crop")
        with self.assertRaisesRegex(ValueError, "one to three"):
            compare_historical(self.provider, self.owner, self.first, replace(self.second, images=[]))
        self.generate.assert_not_called()

    def test_combined_image_limit(self):
        with patch("crop_analysis.comparison.MAX_INLINE_BYTES", 1):
            with self.assertRaisesRegex(ValueError, "combined size"):
                compare_historical(self.provider, self.owner, self.first, self.second)
        self.generate.assert_not_called()

    def test_unrelated_dataset_has_no_dates_or_interval(self):
        first = self.dataset("first", self.first.images[0])
        second = self.dataset("second", self.second.images[0])
        result = compare_dataset(self.provider, first, second)
        self.assertEqual(result.comparison_mode, "illustrative_dataset")
        self.assertIsNone(result.interval_days)
        self.assertIsNone(result.earlier_observation_id)
        self.assertEqual(result.source_provenance, (first.source, second.source))
        self.assertIsNone(first.source.verified_capture_date)
        parts = self.generate.call_args.kwargs["contents"]
        self.assertNotIn(str(first.source.source_url), " ".join(part.text or "" for part in parts))

    def test_dataset_rejects_temporal_claims(self):
        self.generate.return_value.text = json.dumps(self.payload | {"newly_visible_symptoms": ["A new spot"]})
        with self.assertRaises(AnalysisUnavailable) as error:
            compare_dataset(
                self.provider, self.dataset("first", self.first.images[0]), self.dataset("second", self.second.images[0])
            )
        self.assertEqual(error.exception.code, "invalid_output")

    def test_invalid_model_data_and_transport_errors_return_no_result(self):
        for code, response in (
            ("invalid_output", "{}"),
            ("invalid_output", json.dumps(self.payload | {"image_comparability": "unsuitable"})),
            ("timeout", None),
        ):
            self.generate.return_value.text = response
            self.generate.side_effect = httpx.ReadTimeout("fixture") if response is None else None
            with self.assertRaises(AnalysisUnavailable) as error:
                compare_historical(self.provider, self.owner, self.first, self.second)
            self.assertEqual(error.exception.code, code)

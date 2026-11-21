"""Endpoint tests with a mocked Supabase transport. No network or Gemini calls are made."""

import json
import os
import unittest
from datetime import UTC, datetime
from io import BytesIO
from unittest.mock import patch
from uuid import UUID

import httpx2 as httpx
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from PIL import Image

from crop_analysis import api
from crop_analysis.schema import AnalysisResult, Findings
from crop_analysis.weather import evaluate

OWNER = "a330972f-ae6c-4c8b-97df-d9b6a797ac76"
FIELD = "5b0f7b3c-2a7e-4d0d-9b51-6f3e2b7d9a10"
OBS = UUID("0d336dec-e1d1-4df2-9537-80dbebc491bb")
TOKEN = HTTPAuthorizationCredentials(scheme="Bearer", credentials="test-token")
FINDINGS = {
    "analysis_status": "completed", "image_quality": "adequate", "growth_stage": "heading",
    "zadoks_range": {"lower": 50, "upper": 59}, "stage_evidence": ["Spikes emerging"],
    "visible_symptoms": [], "possible_explanations": [], "uncertainty_notes": [],
    "recommended_observations": [], "requires_expert_review": False,
}


def jpeg() -> bytes:
    output = BytesIO()
    Image.new("RGB", (8, 8), (40, 120, 40)).save(output, format="JPEG")
    return output.getvalue()


def observation_row():
    return {
        "id": str(OBS), "field_id": FIELD, "observed_at": "2026-11-01", "notes": "",
        "fields": {"id": FIELD, "name": "Test field", "crop_type": "Wheat", "crop_variety": "",
                   "planting_date": "2026-10-01", "latitude": None, "longitude": None},
        "observation_images": [{"storage_path": f"{OWNER}/{OBS}/photo.jpg", "mime_type": "image/jpeg"}],
    }


class EndpointTests(unittest.TestCase):
    def run_with(self, handler, call):
        client = httpx.Client(base_url="https://example.invalid", transport=httpx.MockTransport(handler))
        with (
            patch.dict(os.environ, {"SUPABASE_URL": "https://example.invalid", "SUPABASE_PUBLISHABLE_KEY": "k"}),
            patch("crop_analysis.api.httpx.Client", return_value=client),
        ):
            return call()

    def test_analysis_is_persisted_with_callers_identity(self):
        inserted = []

        def handle(request):
            path = request.url.path
            if path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            if path == "/rest/v1/crop_observations":
                return httpx.Response(200, json=[observation_row()])
            if path.startswith("/storage/v1/object/authenticated/"):
                return httpx.Response(200, content=jpeg())
            if path == "/rest/v1/crop_analyses" and request.method == "POST":
                inserted.append(json.loads(request.content))
                return httpx.Response(201)
            raise AssertionError(path)

        result = AnalysisResult(
            observation_id=OBS, crop_type="Wheat", model_name="m", analyzed_at=datetime.now(UTC),
            findings=Findings.model_validate(FINDINGS),
        )
        with patch("crop_analysis.api.GeminiCropAnalysis.from_environment") as gemini:
            gemini.return_value.analyze.return_value = result
            returned = self.run_with(handle, lambda: api.analyze_observation(OBS, TOKEN))
        self.assertEqual(returned, result)
        self.assertEqual(inserted[0]["user_id"], OWNER)
        self.assertEqual(inserted[0]["observation_id"], str(OBS))
        self.assertEqual(inserted[0]["analysis_status"], "completed")

    def test_failed_insert_is_reported_not_hidden(self):
        def handle(request):
            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            if request.url.path == "/rest/v1/crop_observations":
                return httpx.Response(200, json=[observation_row()])
            if request.url.path.startswith("/storage/"):
                return httpx.Response(200, content=jpeg())
            return httpx.Response(403, json={"message": "denied"})

        with patch("crop_analysis.api.GeminiCropAnalysis.from_environment") as gemini:
            gemini.return_value.analyze.return_value = AnalysisResult(
                observation_id=OBS, crop_type="Wheat", model_name="m", analyzed_at=datetime.now(UTC),
                findings=Findings.model_validate(FINDINGS),
            )
            with self.assertRaises(HTTPException) as error:
                self.run_with(handle, lambda: api.analyze_observation(OBS, TOKEN))
        self.assertEqual(error.exception.status_code, 503)

    def test_health_report_requires_a_saved_analysis(self):
        def handle(request):
            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            if request.url.path == "/rest/v1/crop_observations":
                return httpx.Response(200, json=[observation_row()])
            if request.url.path == "/rest/v1/crop_analyses":
                return httpx.Response(200, json=[])
            raise AssertionError(request.url.path)

        with self.assertRaises(HTTPException) as error:
            self.run_with(handle, lambda: api.health_pdf(OBS, TOKEN))
        self.assertEqual(error.exception.status_code, 409)

    def test_health_report_renders_pdf_from_saved_analysis(self):
        def handle(request):
            path = request.url.path
            if path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            if path == "/rest/v1/crop_observations":
                return httpx.Response(200, json=[observation_row()])
            if path == "/rest/v1/crop_analyses":
                return httpx.Response(200, json=[{
                    "model_name": "m", "analyzed_at": "2026-11-02T10:00:00+00:00", "findings": FINDINGS,
                }])
            if path.startswith("/storage/"):
                return httpx.Response(200, content=jpeg())
            raise AssertionError(path)

        response = self.run_with(handle, lambda: api.health_pdf(OBS, TOKEN))
        self.assertEqual(response.media_type, "application/pdf")
        self.assertTrue(response.body.startswith(b"%PDF"))

    def test_cross_owner_field_is_unavailable_to_assistant(self):
        def handle(request):
            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            self.assertEqual(request.url.params["user_id"], f"eq.{OWNER}")
            return httpx.Response(200, json=[])

        question = api.AssistantQuestion(field_id=UUID(FIELD), question="How is it?", language="Urdu")
        with patch("crop_analysis.api.GeminiCropAnalysis.from_environment") as gemini:
            with self.assertRaises(HTTPException) as error:
                self.run_with(handle, lambda: api.ask_assistant(question, TOKEN))
            gemini.assert_not_called()
        self.assertEqual(error.exception.status_code, 404)


class HttpBodyTests(unittest.TestCase):
    """Exercise real JSON bodies, where UUIDs arrive as strings."""

    def test_json_request_bodies_validate(self):
        from fastapi.testclient import TestClient

        import main

        bodies = {
            "/assistant": {"field_id": FIELD, "question": "کیا حال ہے؟", "language": "Urdu"},
            "/comparisons": {"first_observation_id": str(OBS), "second_observation_id": FIELD},
        }
        with patch.dict(os.environ, {"SUPABASE_URL": "", "SUPABASE_PUBLISHABLE_KEY": ""}):
            client = TestClient(main.app)
            for path, body in bodies.items():
                response = client.post(path, json=body, headers={"Authorization": "Bearer t"})
                # 503 = passed body validation and stopped at configuration, before any network call.
                self.assertEqual(response.status_code, 503, (path, response.text))


class WeatherThresholdTests(unittest.TestCase):
    def test_thresholds_produce_dated_cautions(self):
        days = [
            {"date": "2026-11-21", "high": 36.0, "low": 20.0, "rain": 0.0},
            {"date": "2026-11-22", "high": 28.0, "low": 18.0, "rain": 30.5},
        ]
        weather = evaluate(UUID(FIELD), days, datetime.now(UTC))
        severities = [caution.severity for caution in weather.cautions]
        self.assertEqual(severities, ["Caution", "High Risk"])
        self.assertIn("2026-11-22", weather.cautions[1].event)

    def test_quiet_forecast_is_reported_as_normal(self):
        days = [{"date": "2026-11-21", "high": 25.0, "low": 12.0, "rain": 1.0}]
        weather = evaluate(UUID(FIELD), days, datetime.now(UTC))
        self.assertEqual([c.severity for c in weather.cautions], ["Normal"])


if __name__ == "__main__":
    unittest.main()

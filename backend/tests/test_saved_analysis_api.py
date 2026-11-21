import os
import unittest
from unittest.mock import patch
from uuid import UUID

import httpx2 as httpx
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from crop_analysis.api import analyze_observation

OBSERVATION = UUID("0d336dec-e1d1-4df2-9537-80dbebc491bb")
OWNER = "a330972f-ae6c-4c8b-97df-d9b6a797ac76"


class SavedObservationAccessTests(unittest.TestCase):
    def test_missing_token_fails_without_network(self):
        with self.assertRaises(HTTPException) as result:
            analyze_observation(OBSERVATION, None)
        self.assertEqual(result.exception.status_code, 401)

    def test_unavailable_observation_never_reaches_gemini_or_storage(self):
        requests = []

        def handle(request):
            requests.append(request.url.path)
            self.assertEqual(request.headers["authorization"], "Bearer test-token")
            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            self.assertEqual(request.url.path, "/rest/v1/crop_observations")
            self.assertEqual(request.url.params["id"], f"eq.{OBSERVATION}")
            self.assertEqual(request.url.params["user_id"], f"eq.{OWNER}")
            return httpx.Response(200, json=[])

        client = httpx.Client(
            base_url="https://example.invalid",
            headers={"Authorization": "Bearer test-token"},
            transport=httpx.MockTransport(handle),
        )
        with (
            patch.dict(os.environ, {
                "SUPABASE_URL": "https://example.invalid",
                "SUPABASE_PUBLISHABLE_KEY": "test-key",
            }),
            patch("crop_analysis.api.httpx.Client", return_value=client),
            patch("crop_analysis.api.GeminiCropAnalysis.from_environment") as gemini,
            self.assertRaises(HTTPException) as result,
        ):
            analyze_observation(OBSERVATION, HTTPAuthorizationCredentials(
                scheme="Bearer", credentials="test-token",
            ))
        self.assertEqual(result.exception.status_code, 404)
        self.assertEqual(requests, ["/auth/v1/user", "/rest/v1/crop_observations"])
        gemini.assert_not_called()

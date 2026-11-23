import json
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from pydantic import ValidationError

from crop_analysis.gemini import AnalysisUnavailable
from crop_analysis.portal_guide import CATALOG, GuideAnswer, GuideQuestion, explain_guide
from main import app


class PortalGuideTests(unittest.TestCase):
    def test_browser_and_api_share_the_same_catalog_facts(self):
        path = Path(__file__).resolve().parents[2] / "frontend/lib/portal-guide-catalog.json"
        browser = json.loads(path.read_text(encoding="utf-8"))
        self.assertEqual(browser["version"], CATALOG["version"])
        self.assertEqual({
            topic["id"]: {"title": topic["title"]["en"], "steps": [step["en"] for step in topic["steps"]]}
            for topic in browser["topics"]
        }, CATALOG["topics"])

    def test_endpoint_requires_authentication(self):
        response = TestClient(app).post(
            "/portal-guide", json={"question": "What can I do here?", "language": "en"}
        )
        self.assertEqual(response.status_code, 401)

    def test_authenticated_endpoint_reports_missing_provider(self):
        with patch.dict("os.environ", {
            "SUPABASE_URL": "https://example.invalid",
            "SUPABASE_PUBLISHABLE_KEY": "test-publishable",
            "GEMINI_API_KEY": "",
        }), patch("crop_analysis.api.httpx.Client") as supabase:
            identity = supabase.return_value.__enter__.return_value.get.return_value
            identity.status_code = 200
            identity.json.return_value = {"id": "test-user"}
            response = TestClient(app).post(
                "/portal-guide",
                headers={"Authorization": "Bearer test-token"},
                json={"question": "What can I do here?", "language": "ur"},
            )
        self.assertEqual(response.status_code, 503)

    def test_request_rejects_unknown_context_and_record_ids(self):
        for extra in ({"page": "/fields/private"}, {"field_id": "private"}):
            with self.subTest(extra=extra), self.assertRaises(ValidationError):
                GuideQuestion.model_validate({"question": "What now?", "language": "en", **extra})

    def test_provider_receives_only_catalog_and_guide_context(self):
        provider = Mock()
        provider.generate_findings.return_value = GuideAnswer(answer="Open the scanner.", topics=["scanner"])
        result = explain_guide(provider, GuideQuestion(question="What now?", language="en", page="scanner"))
        parts = provider.generate_findings.call_args.args[0]
        payload = json.loads(parts[0].text)
        self.assertEqual(set(payload), {"catalog_version", "catalog", "question", "language", "page", "previous_topic"})
        self.assertEqual(payload["page"], "scanner")
        self.assertEqual(result.topics, ["scanner"])

    def test_provider_cannot_add_navigation_targets(self):
        provider = Mock()
        provider.generate_findings.return_value = GuideAnswer(answer="Open a link.", topics=["/private"])
        with self.assertRaises(AnalysisUnavailable):
            explain_guide(provider, GuideQuestion(question="What now?", language="en"))

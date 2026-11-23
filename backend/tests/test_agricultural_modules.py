import json
import unittest
from contextlib import nullcontext
from datetime import UTC, datetime
from unittest.mock import Mock, patch
from uuid import UUID, uuid4

import httpx2 as httpx
from fastapi import HTTPException
from pydantic import ValidationError

import test_api_endpoints as fixtures
from crop_analysis import api
from crop_analysis.agriculture import GrainBatch, GrainInspection, Irrigation, RustFinding, RustRecord, irrigation_cautions, storage_cautions
from crop_analysis.gemini import AnalysisUnavailable
from crop_analysis.weather import irrigation_weather

OWNER = fixtures.OWNER
FIELD = UUID(fixtures.FIELD)
TOKEN = fixtures.TOKEN
BATCH = uuid4()
BATCH_DETAILS = {"grain": "Wheat", "harvested_on": "2025-05-01", "stored_on": "2025-05-02",
                 "method": "Bin", "quantity": 12, "unit": "kg", "humidity_limit_pct": 70}


class AgricultureTests(unittest.TestCase):
    def mocked_session(self, handler, action):
        def route(request):
            if request.url.path == "/auth/v1/user":
                return httpx.Response(200, json={"id": OWNER})
            if request.method == "GET" and request.url.path.startswith("/rest/v1/"):
                self.assertEqual(request.url.params["user_id"], f"eq.{OWNER}")
            return handler(request)
        return fixtures.EndpointTests.run_with(self, route, action)

    def test_irrigation_thresholds_missing_and_record_validation(self):
        self.assertEqual(len(irrigation_cautions([0, None, 0], [35], False)), 2)
        self.assertEqual(irrigation_cautions([0, 1, 0], [34.99], False), [])
        self.assertEqual(len(irrigation_cautions([0.99] * 3, [35], True)), 3)
        record = Irrigation(field_id=FIELD, recorded_on="2025-07-01", irrigated=True)
        self.assertIsNone(record.moisture_pct)
        with self.assertRaises(ValidationError):
            Irrigation(field_id=FIELD, recorded_on="2025-07-01", moisture_pct=101)
        with self.assertRaises(ValidationError):
            Irrigation(field_id=FIELD, recorded_on="2025-07-01", inspect_on="2025-06-30")
        def handle(request):
            if request.url.path.endswith("/fields"):
                return httpx.Response(200, json=[{"id": str(FIELD)}])
            saved = json.loads(request.content)
            self.assertEqual(saved["recorded_on"], "2025-07-01")
            self.assertEqual(saved["user_id"], OWNER)
            self.assertTrue(saved["details"]["irrigated"])
            return httpx.Response(201)
        self.assertTrue(self.mocked_session(handle, lambda: api.save_irrigation(record, TOKEN))["saved"])

    def test_weather_local_date_units_and_null_rain(self):
        data = {
            "timezone": "Asia/Karachi", "utc_offset_seconds": 18000,
            "daily_units": {"precipitation_sum": "mm", "temperature_2m_max": "°C"},
            "daily": {"time": ["2025-06-01", "2025-06-02"], "precipitation_sum": [None, 0],
                      "temperature_2m_max": [30, 35]},
            "latitude": 31.123456, "longitude": 74.234567,
        }
        with patch("crop_analysis.weather.datetime", wraps=datetime) as clock, patch("crop_analysis.weather.httpx.get") as fetch:
            clock.now.return_value = datetime(2025, 6, 1, 20, tzinfo=UTC)
            fetch.return_value.json.return_value = data
            result = irrigation_weather(31.123456, 74.234567)
            self.assertEqual(fetch.call_args.kwargs["params"]["longitude"], "74.23")
            self.assertEqual(result["recent"][0]["rain"], None)
            self.assertEqual(result["forecast"][0]["date"], "2025-06-02")
            self.assertNotIn("latitude", result)
            data["daily_units"]["precipitation_sum"] = "inch"
            self.assertIsNone(irrigation_weather(31, 74))

    def test_grain_measurements_history_and_foreign_batch(self):
        batch = GrainBatch(name="Fixture bin", **BATCH_DETAILS)
        inspection = GrainInspection(batch_id=BATCH, recorded_on="2025-05-10", temperature_c=24,
                                     humidity_pct=70, visible_concern="mold_or_odor")
        cautions = storage_cautions(batch, inspection)
        self.assertEqual(len(cautions), 3)
        self.assertIn("not measured", cautions[0])
        writes = []
        def handle(request):
            if request.method == "POST":
                writes.append(json.loads(request.content))
                return httpx.Response(201)
            if request.url.path.endswith("/grain_batches"):
                return httpx.Response(200, json=[{"id": str(BATCH), "name": batch.name, "details": BATCH_DETAILS}])
            return httpx.Response(200, json=[{"recorded_on": "2025-05-10", "details": writes[-1]["details"]}])
        self.mocked_session(handle, lambda: api.save_batch(batch, TOKEN))
        self.mocked_session(handle, lambda: api.save_storage(inspection, TOKEN))
        result = self.mocked_session(handle, lambda: api.grain_view(TOKEN, BATCH))
        self.assertEqual(result.records[0]["details"]["temperature_c"], 24)
        self.assertEqual(result.records[0]["details"]["humidity_pct"], 70)
        self.assertTrue(all(write["user_id"] == OWNER for write in writes))
        with self.assertRaises(HTTPException) as failure:
            self.mocked_session(lambda _: httpx.Response(200, json=[]), lambda: api.save_storage(inspection, TOKEN))
        self.assertEqual(failure.exception.status_code, 404)

    def test_batch_assistant_context_keeps_readings_missing_and_reminder_dated(self):
        def handle(request):
            if request.url.path.endswith("/grain_batches"):
                return httpx.Response(200, json=[{"name": "Fixture bin", "details": BATCH_DETAILS}])
            return httpx.Response(200, json=[{"recorded_on": "2025-05-10", "details": {
                "temperature_c": 24, "humidity_pct": 70, "inspect_on": "2025-05-12",
            }}])

        def read():
            with api.session(TOKEN) as db:
                return api._batch_context(db, BATCH)

        context = self.mocked_session(handle, read)
        self.assertEqual(context.owner_id, UUID(OWNER))
        self.assertIn("moisture not measured", context.records[0].detail)
        self.assertIn("24 °C", context.records[0].detail)
        self.assertEqual(context.records[1].key, "reminder")
        self.assertIn("2025-05-12", context.records[1].detail)

    def test_rust_valid_invalid_and_provider_unavailable(self):
        for image in (fixtures.jpeg(), b"invalid bytes"):
            def handle(request):
                if request.url.path.endswith("/crop_observations"):
                    return httpx.Response(200, json=[fixtures.observation_row()])
                if request.url.path.startswith("/storage"):
                    return httpx.Response(200, content=image)
                row = json.loads(request.content)
                self.assertEqual(row["details"]["finding"]["status"], "inconclusive")
                self.assertNotIn("latitude", row["details"])
                self.assertEqual(row["details"]["review"], "review_requested")
                self.assertEqual(row["review_status"], "review_requested")
                return httpx.Response(201)
            request = RustRecord(observation_id=fixtures.OBS, recorded_on="2026-11-01", review="review_requested")
            with patch.object(api, "provider", side_effect=AnalysisUnavailable("not_configured", "Unavailable")) as provider:
                self.mocked_session(handle, lambda: api.save_rust(request, TOKEN))
                self.assertEqual(provider.call_count, int(image != b"invalid bytes"))
        with self.assertRaises(ValidationError):
            RustFinding(status="confirmed", evidence="", follow_up="")

    def test_authentication(self):
        for call in (lambda: api.grain_view(None), lambda: api.delete_batch(BATCH, None),
                     lambda: api.update_rust_review(BATCH, api.ReviewUpdate(review="unreviewed"), None)):
            with self.assertRaises(HTTPException) as failure:
                call()
            self.assertEqual(failure.exception.status_code, 401)

    def test_review_update_and_deletes_are_owner_scoped(self):
        seen = []
        def handle(request, rows):
            seen.append(request)
            self.assertEqual(request.url.params["user_id"], f"eq.{OWNER}")
            self.assertEqual(request.url.params["id"], f"eq.{BATCH}")
            return httpx.Response(200, json=rows)
        found = lambda request: handle(request, [{"id": str(BATCH)}])
        review = api.ReviewUpdate(review="feedback_received")
        self.assertTrue(self.mocked_session(found, lambda: api.update_rust_review(BATCH, review, TOKEN))["saved"])
        self.assertEqual(seen[-1].method, "PATCH")
        self.assertEqual(seen[-1].url.params["kind"], "eq.rust")
        self.assertEqual(json.loads(seen[-1].content), {"review_status": "feedback_received"})
        self.assertTrue(self.mocked_session(found, lambda: api.delete_record(BATCH, TOKEN))["deleted"])
        self.assertTrue(self.mocked_session(found, lambda: api.delete_batch(BATCH, TOKEN))["deleted"])
        self.assertEqual([r.method for r in seen[-2:]], ["DELETE", "DELETE"])
        # Another farmer's row, or a missing one, is invisible under RLS and changes nothing.
        missing = lambda request: handle(request, [])
        for call in (lambda: api.update_rust_review(BATCH, review, TOKEN), lambda: api.delete_record(BATCH, TOKEN),
                     lambda: api.delete_batch(BATCH, TOKEN)):
            with self.assertRaises(HTTPException) as failure:
                self.mocked_session(missing, call)
            self.assertEqual(failure.exception.status_code, 404)
        with self.assertRaises(ValidationError):
            api.ReviewUpdate(review="confirmed")

    def test_rust_candidate_remains_suspected_and_model_gets_only_photos(self):
        analyzer = Mock()
        analyzer.generate_findings.return_value = RustFinding(
            status="possibly_consistent", evidence="Fixture: orange spots are visible.",
            follow_up="Ask a qualified reviewer to inspect the leaves.",
        )
        def handle(request):
            if request.url.path.endswith("/crop_observations"):
                return httpx.Response(200, json=[fixtures.observation_row()])
            if request.url.path.startswith("/storage"):
                return httpx.Response(200, content=fixtures.jpeg())
            details = json.loads(request.content)["details"]
            self.assertEqual(details["finding"]["status"], "possibly_consistent")
            self.assertEqual(details["review"], "unreviewed")
            return httpx.Response(201)

        record = RustRecord(observation_id=fixtures.OBS, recorded_on="2026-11-01")
        with patch.object(api, "provider", return_value=nullcontext(analyzer)):
            self.assertTrue(self.mocked_session(handle, lambda: api.save_rust(record, TOKEN))["saved"])
        args = analyzer.generate_findings.call_args.args
        self.assertEqual(len(args[0]), 1)
        self.assertIsNotNone(args[0][0].inline_data)
        self.assertIsNone(args[0][0].text)

    def test_rust_review_uses_fallback_model_when_gemini_is_busy(self):
        busy, spare = Mock(model="primary"), Mock(model=api.ASSISTANT_FALLBACK_MODEL)
        busy.generate_findings.side_effect = AnalysisUnavailable("provider_busy", "Busy")
        spare.generate_findings.return_value = RustFinding(
            status="signs_not_seen", evidence="Fixture: leaves look clear.", follow_up="Re-inspect in a week.")
        calls = []
        def provider(**options):
            calls.append(options)
            return nullcontext(spare if options.get("model_override") else busy)
        with patch.object(api, "provider", side_effect=provider):
            finding = api._rust_review([api.CropImage(fixtures.jpeg(), "image/jpeg")])
        self.assertEqual(finding.status, "signs_not_seen")
        self.assertEqual(calls, [{"retry_overload": True}, {"model_override": api.ASSISTANT_FALLBACK_MODEL}])
        # A configuration problem is not retried on another model.
        busy.generate_findings.side_effect = AnalysisUnavailable("not_configured", "Missing key")
        with patch.object(api, "provider", side_effect=provider), self.assertRaises(AnalysisUnavailable):
            api._rust_review([api.CropImage(fixtures.jpeg(), "image/jpeg")])

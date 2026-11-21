import json
import unittest
from datetime import UTC, date, datetime
from io import BytesIO
from unittest.mock import MagicMock
from uuid import uuid4

from PIL import Image
from pydantic import HttpUrl, ValidationError

from crop_analysis.assistant import AssistantRequest, AssistantTurn, ContextRecord, FieldContext, answer_question
from crop_analysis.comparison import ComparisonResult, DatasetSource
from crop_analysis.gemini import AnalysisUnavailable, GeminiCropAnalysis
from crop_analysis.images import CropImage
from crop_analysis.reports import (
    ReportField, ReportPhoto, VerifiedWeather, WeatherCaution, comparison_report,
    health_report, render_pdf, weather_report,
)
from crop_analysis.schema import AnalysisResult, Findings


class AssistantTests(unittest.TestCase):
    def setUp(self):
        self.owner = uuid4()
        self.context = FieldContext(
            owner_id=self.owner, field_id=uuid4(), field_name="North Wheat",
            crop_type="Wheat", records=[ContextRecord(
                key="observation", evidence="recorded_fact", detail="Recorded on 2025-03-19",
            )],
        )
        self.client = MagicMock()
        self.provider = GeminiCropAnalysis(self.client)
        self.generate = self.client.models.generate_content

    def test_urdu_retains_source_and_missing_context(self):
        self.generate.return_value.text = json.dumps({
            "answer": "یہ مشاہدہ 2025-03-19 کو درج ہوا۔", "used_sources": ["observation"],
        })
        reply = answer_question(self.provider, self.owner, self.context, AssistantRequest(
            question="مشاہدہ کب ہوا؟", language="Urdu",
        ))
        self.assertEqual(reply.direction, "rtl")
        self.assertEqual(reply.sources, self.context.records)
        self.assertIn("weather", reply.missing_sources)
        request = self.generate.call_args.kwargs
        self.assertNotIn(str(self.owner), request["contents"][0].text)
        self.assertNotIn(str(self.context.field_id), request["contents"][0].text)
        self.generate.assert_called_once()

    def test_general_follow_up_passes_history_without_field_records(self):
        self.generate.return_value.text = '{"answer":"A short answer.","used_sources":[]}'
        prior = AssistantTurn(question="Explain tillering.", answer="Side shoots form at the base.")
        reply = answer_question(self.provider, self.owner, None, AssistantRequest(
            question="When does that happen?", language="English", history=[prior],
        ))
        payload = json.loads(self.generate.call_args.kwargs["contents"][0].text)
        self.assertIsNone(payload["field"])
        self.assertEqual(payload["history"], [prior.model_dump()])
        self.assertEqual(reply.sources, [])
        self.assertEqual(reply.missing_sources, [])
        with self.assertRaises(ValidationError):
            AssistantRequest(question="More?", language="English", history=[prior] * 7)

    def test_other_owner_and_empty_messages_are_rejected(self):
        with self.assertRaises(PermissionError):
            answer_question(self.provider, uuid4(), self.context, AssistantRequest(
                question="What did I observe?", language="English",
            ))
        with self.assertRaises(ValidationError):
            AssistantRequest(question="  ", language="English")
        self.generate.assert_not_called()

    def test_unavailable_source_is_rejected(self):
        self.generate.return_value.text = '{"answer":"Example reply","used_sources":["weather"]}'
        with self.assertRaises(AnalysisUnavailable):
            answer_question(self.provider, self.owner, self.context, AssistantRequest(
                question="What is the forecast?", language="English",
            ))


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.field = ReportField(uuid4(), "Test fixture <North>", "Wheat")
        self.date = date(2025, 3, 20)

    def test_health_report_embeds_image_and_checks_observation(self):
        analysis = AnalysisResult(
            observation_id=uuid4(), crop_type="Wheat", model_name="Test fixture",
            analyzed_at=datetime.now(UTC), findings=Findings(
                analysis_status="inconclusive", image_quality="limited", growth_stage="uncertain",
                zadoks_range=None, stage_evidence=[], visible_symptoms=[], possible_explanations=[],
                uncertainty_notes=["The stems are out of frame."],
                recommended_observations=["Photograph a complete plant."], requires_expert_review=False,
            ),
        )
        image = BytesIO()
        with Image.new("RGB", (40, 25), "green") as photo:
            photo.save(image, format="PNG")
        sample = ReportPhoto(CropImage(image.getvalue(), "image/png"), "Generated test fixture")
        report = health_report(self.field, self.date, analysis.observation_id, self.date, analysis, (sample,))
        pdf = render_pdf(report)
        self.assertTrue(pdf.startswith(b"%PDF-"))
        self.assertIn(b"/Subtype /Image", pdf)
        with self.assertRaises(ValueError):
            health_report(self.field, self.date, uuid4(), self.date, analysis)

    def test_illustrative_report_has_provenance_and_no_field_or_interval(self):
        def source(label):
            return DatasetSource(
                dataset_name="Fixture dataset", source_url=HttpUrl(f"https://example.com/{label}"),
                attribution="Generated test fixture", license="Fixture license",
            )
        result = ComparisonResult(
            comparison_id=uuid4(), comparison_mode="illustrative_dataset",
            previous_growth_stage="uncertain", current_growth_stage="uncertain",
            observed_changes=[], newly_visible_symptoms=[], no_longer_visible_symptoms=[],
            possible_concerns=[], image_comparability="limited", uncertainty_notes=["Different viewpoints"],
            suggested_followup=[], source_provenance=(source("a"), source("b")),
            model_name="Test fixture", created_at=datetime.now(UTC),
        )
        report = comparison_report(result, self.date)
        self.assertIn("not verified historical", report.sections[0][1][0])
        self.assertIsNone(report.field)
        self.assertNotIn("interval", str(report.sections).lower())
        with self.assertRaises(ValueError):
            comparison_report(result, self.date, self.field)

    def test_weather_report_retains_severity_and_issue_time(self):
        weather = VerifiedWeather(
            field_id=self.field.id, issued_at=datetime(2025, 3, 19, 12, tzinfo=UTC),
            source=HttpUrl("https://example.com/fixture"), cautions=[
                WeatherCaution(event="Heavy rain", severity="Caution", caution="Check low areas.")
            ],
        )
        report = weather_report(self.field, self.date, weather)
        self.assertEqual(report.sections[1][1], ("Caution | Heavy rain | Check low areas.",))
        self.assertIn("2025-03-19T12:00:00+00:00", report.sections[0][1][0])
        with self.assertRaises(ValueError):
            weather_report(ReportField(uuid4(), "Other field", "Wheat"), self.date, weather)

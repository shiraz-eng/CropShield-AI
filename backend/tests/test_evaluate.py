import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock

from crop_analysis.evaluate import evaluate, load_samples
from crop_analysis.gemini import AnalysisUnavailable
from crop_analysis.schema import Findings


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.manifest = self.root / "holdout.json"
        self.sample = {
            "id": "test-case", "image": "test.jpg", "source": "https://example.com/fixture",
            "license": "Test fixture", "expected_crop": "wheat", "expected_stage": "tillering",
            "expected_symptoms": [], "expected_inconclusive": False,
        }
        (self.root / "test.jpg").write_bytes(b"mock provider fixture")

    def test_scoring_distinguishes_agreement_abstention_and_failure(self):
        self.manifest.write_text(json.dumps([self.sample]), encoding="utf-8")
        samples = load_samples(self.manifest)
        provider = MagicMock(model="test provider")
        provider.analyze.return_value = SimpleNamespace(findings=Findings(
            analysis_status="inconclusive", image_quality="limited", growth_stage="uncertain",
            zadoks_range=None, stage_evidence=[], visible_symptoms=[], possible_explanations=[],
            uncertainty_notes=["No visible node."], recommended_observations=[], requires_expert_review=False,
        ))
        summary = evaluate(provider, samples)
        self.assertEqual(summary["metrics"]["crop_screening"]["abstained"], 1)
        self.assertEqual(summary["metrics"]["stage"]["abstained"], 1)
        self.assertEqual(summary["metrics"]["symptom_exact_set"]["agreed"], 1)
        provider.analyze.side_effect = AnalysisUnavailable("timeout", "Fixture error")
        summary = evaluate(provider, samples)
        self.assertEqual(summary["metrics"]["stage"]["failed"], 1)
        self.assertIsNone(summary["median_success_ms"])

    def test_duplicate_cases_and_outside_paths_are_rejected(self):
        for cases in ([self.sample, self.sample], [self.sample | {"image": "../test.jpg"}]):
            self.manifest.write_text(json.dumps(cases), encoding="utf-8")
            with self.assertRaises(ValueError):
                load_samples(self.manifest)

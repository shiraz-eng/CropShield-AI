import type { Readiness } from "./evidence-types";

export type Findings = {
  analysis_status: string;
  growth_stage: string;
  image_quality: string;
  zadoks_range?: { lower: number; upper: number } | null;
  stage_evidence: string[];
  visible_symptoms: string[];
  possible_explanations: string[];
  uncertainty_notes: string[];
  recommended_observations: string[];
  requires_expert_review: boolean;
};

export type DatasetSource = {
  dataset_name: string;
  source_url: string;
  attribution: string;
  license: string;
  known_label?: string | null;
};

export type ComparisonFindings = {
  evidence_readiness?: Readiness | null;
  comparison_id: string;
  comparison_mode: "verified_historical" | "illustrative_dataset";
  earlier_observation_id?: string | null;
  later_observation_id?: string | null;
  interval_days?: number | null;
  previous_growth_stage: string;
  current_growth_stage: string;
  observed_changes: string[];
  newly_visible_symptoms: string[];
  no_longer_visible_symptoms: string[];
  possible_concerns: string[];
  image_comparability: string;
  uncertainty_notes: string[];
  suggested_followup: string[];
  source_provenance:
    | { field_id: string; earlier_date: string; later_date: string }
    | DatasetSource[];
  model_name: string;
  created_at: string;
};

export type AssistantAnswer = {
  language: "English" | "Urdu";
  direction: "ltr" | "rtl";
  answer: string;
  sources: { key: string; evidence: string; detail: string }[];
  missing_sources: string[];
};

export type SavedReminder = {
  id: string;
  field_id: string;
  title: string;
  due_on: string;
  completed: boolean;
};

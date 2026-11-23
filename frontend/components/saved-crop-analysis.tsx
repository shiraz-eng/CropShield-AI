"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Stethoscope } from "lucide-react";
import { analyzeSavedObservation, type AnalysisFeedback } from "@/lib/crop-analysis-action";
import type { Findings } from "@/lib/ai-types";
import type { SavedImage } from "@/lib/farm-types";
import { CropPhoto, PageHeader, SectionTitle } from "./shared";
import { PhotoEvidence } from "./crop-evidence";

const label = (value: string) => value.replaceAll("_", " ");

export function SavedCropAnalysis({
  id,
  fieldName,
  observedAt,
  photos,
  saved,
}: {
  id: string;
  fieldName: string;
  observedAt: string;
  photos: SavedImage[];
  saved?: { model_name: string; analyzed_at: string; findings: Findings };
}) {
  const [state, analyze, pending] = useActionState(
    async (): Promise<AnalysisFeedback> => analyzeSavedObservation(id),
    saved ? { findings: saved.findings, analyzedAt: saved.analyzed_at } : {},
  );
  const findings = state.findings;
  const sections = findings
    ? [
        { title: "Stage evidence", items: findings.stage_evidence },
        { title: "Visible symptoms", items: findings.visible_symptoms },
        { title: "Possible explanations", items: findings.possible_explanations },
        { title: "Uncertainty", items: findings.uncertainty_notes },
        { title: "Recommended observations", items: findings.recommended_observations },
      ]
    : [];
  return (
    <>
      <PageHeader
        title="AI Crop Doctor"
        description={`${fieldName} · observation of ${observedAt}`}
        icon={Stethoscope}
      />
      <section className="card panel stack">
        <SectionTitle title="Saved photos" />
        <div className="before-after">
          {photos.map((photo) => (
            <div className="stack" key={photo.id}>
              {photo.url ? <CropPhoto src={photo.url} alt={`${fieldName} wheat photo ${observedAt}`} />
                : <p>Photo link expired. Reload the page.</p>}
              <PhotoEvidence quality={photo.photo_quality} />
            </div>
          ))}
        </div>
      </section>
      <form action={analyze} className="card panel stack">
        <button className="button" disabled={pending}>
          {pending ? "Analyzing photos…" : findings ? "Analyze again" : "Analyze saved photos"}
        </button>
        {state.error && <p className="message-error" role="alert">{state.error}</p>}
        {findings && (
          <div className="stack" role="status" aria-live="polite">
            <SectionTitle title="Gemini analysis" />
            {state.analyzedAt && <small>Saved analysis from {new Date(state.analyzedAt).toLocaleString()}</small>}
            <p>Outcome: {label(findings.analysis_status)}</p>
            <p>
              Estimated growth stage: {label(findings.growth_stage)}
              {findings.zadoks_range &&
                ` (Zadoks ${findings.zadoks_range.lower}–${findings.zadoks_range.upper})`}
            </p>
            <p>Image quality: {findings.image_quality}</p>
            {sections
              .filter(({ items }) => items.length > 0)
              .map(({ title, items }) => (
                <section key={title}>
                  <SectionTitle title={title} />
                  <ul>
                    {items.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </section>
              ))}
            {findings.requires_expert_review && (
              <p>Ask a qualified agricultural expert to review the field.</p>
            )}
            <small>
              AI interpretation of visible evidence only. It is not a confirmed diagnosis.
            </small>
            <div className="actions">
              <a className="button button-outline" href={`/api/reports/health/${id}`}>
                Download Crop Health PDF
              </a>
              <Link className="text-link" href="/comparison">
                Compare with another date
              </Link>
            </div>
          </div>
        )}
      </form>
    </>
  );
}

export function CropDoctorHeader() {
  return (
    <PageHeader
      title="AI Crop Doctor"
      description="Choose a saved wheat observation to analyze its photos with Gemini."
      icon={Stethoscope}
    />
  );
}

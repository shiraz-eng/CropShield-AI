"use client";

import Link from "next/link";
import { Leaf, Stethoscope } from "lucide-react";
import { useState } from "react";
import {
  fieldObservations,
  formatDate,
  type CropObservation,
} from "@/lib/data";
import { useDemo } from "@/lib/state";
import {
  EmptyState,
  FieldSelect,
  MockDataNotice,
  ObservationCard,
  PageHeader,
  SectionTitle,
} from "./shared";

const symptoms = [
  "Yellowing",
  "Leaf spots",
  "Rust-like patches",
  "Tip browning",
  "Stunted growth",
  "Wilting",
];
const examples: Record<
  CropObservation["status"],
  { title: string; evidence: string; uncertainty: string; action: string }
> = {
  clear: {
    title: "No visible concerns",
    evidence: "The example notes even leaf colour and upright foliage.",
    uncertainty: "A photograph covers only the plants in frame.",
    action: "Continue scheduled inspections and photograph the same area.",
  },
  concerns: {
    title: "Potential concerns",
    evidence:
      "The sample notes scattered yellow marks. Nutrient stress or leaf disease are possible explanations in this scenario.",
    uncertainty: "The visible pattern alone cannot establish the cause.",
    action: "Check several areas of the field and record whether marks spread.",
  },
  poor: {
    title: "Insufficient image quality",
    evidence:
      "The sample scenario illustrates how focus and angles can limit visible evidence.",
    uncertainty: "Leaf detail is insufficient in the scenario.",
    action: "Retake a sharp close-up in even light and include a wide photo.",
  },
  unavailable: {
    title: "Analysis unavailable",
    evidence: "There is no sample assessment for this observation.",
    uncertainty: "The observation has no evidence summary.",
    action:
      "Choose another observation or document the visible symptoms for expert review.",
  },
};

export function CropDoctor() {
  const { fields } = useDemo();
  const [field, setField] = useState(fields[0].id);
  const [observationId, setObservationId] = useState("n2");
  const [selected, setSelected] = useState<string[]>([]);
  const choices = fieldObservations(field);
  const observation =
    choices.find(({ id }) => id === observationId) ?? choices[0];
  const example = observation ? examples[observation.status] : undefined;
  return (
    <>
      <PageHeader
        title="AI Crop Doctor"
        description="Review visible symptoms and explore possible explanations."
        icon={Stethoscope}
      />
      <MockDataNotice>
        Illustrative assessments. Symptom selections are notes for this view.
      </MockDataNotice>
      <div className="card panel filter-bar">
        <FieldSelect
          fields={fields}
          value={field}
          onChange={(id) => {
            setField(id);
            setObservationId("");
            setSelected([]);
          }}
        />
        <label>
          Observation
          <select
            aria-label="Observation"
            disabled={!choices.length}
            value={observation?.id ?? ""}
            onChange={(event) => {
              setObservationId(event.target.value);
              setSelected([]);
            }}
          >
            {!choices.length && <option value="">No observations</option>}
            {choices.map((item) => (
              <option key={item.id} value={item.id}>
                {formatDate(item.date)}
              </option>
            ))}
          </select>
        </label>
      </div>
      {observation && example ? (
        <div className="grid-three">
          <section className="card panel doctor-photo">
            <SectionTitle title="Crop observation" />
            <ObservationCard observation={observation} />
          </section>
          <section className="card panel stack">
            <SectionTitle title="Visible symptoms" />
            <div className="symptom-grid">
              {symptoms.map((symptom) => (
                <button
                  key={symptom}
                  className="symptom"
                  aria-pressed={selected.includes(symptom)}
                  onClick={() =>
                    setSelected((items) =>
                      items.includes(symptom)
                        ? items.filter((item) => item !== symptom)
                        : [...items, symptom],
                    )
                  }
                >
                  <Leaf size={17} />
                  {symptom}
                </button>
              ))}
            </div>
            <p aria-live="polite">
              {selected.length
                ? `Notes: ${selected.join(", ")}.`
                : "Select any symptoms you want to record in this view."}
            </p>
          </section>
          <section className="card panel stack">
            <SectionTitle title="Sample assessment" />
            <div
              className={`report-section ${observation.status === "concerns" ? "caution" : ""}`}
            >
              <h3>{example.title}</h3>
              <p>{example.evidence}</p>
            </div>
            <div>
              <h3>Evidence and uncertainty</h3>
              <p>{example.uncertainty}</p>
            </div>
            <div>
              <h3>Monitoring recommendation</h3>
              <p>{example.action}</p>
            </div>
            <div className="report-section caution">
              <h3>Expert review</h3>
              <p>
                Consult a local agronomist or extension officer for a
                field-specific assessment.
              </p>
            </div>
            <Link className="text-link" href={`/assistant?field=${field}`}>
              Ask the AI Assistant
            </Link>
          </section>
        </div>
      ) : (
        <EmptyState title="No observations available">
          Choose a field with sample observations.
        </EmptyState>
      )}
    </>
  );
}

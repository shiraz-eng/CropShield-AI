import { qualityLabels, readinessLabels, type PhotoQuality, type Readiness } from "@/lib/evidence-types";

function lines(items: string[]) {
  if (!Array.isArray(items)) return null;
  return items.filter((item) => typeof item === "string").map((item, index) => <p key={index}>{item}</p>);
}

export function PhotoEvidence({ quality }: { quality?: PhotoQuality | null }) {
  if (!quality || typeof quality.quality_status !== "string" || !Object.hasOwn(qualityLabels, quality.quality_status))
    return <small>No capture assessment saved.</small>;
  const size = quality.measurement_metadata;
  return (
    <div className={quality.quality_status === "usable" ? "crop-evidence insight" : "message-caution"}>
      <strong>{qualityLabels[quality.quality_status]}</strong>
      <details>
        <summary>Capture details</summary>
        {Number.isFinite(size?.width) && Number.isFinite(size?.height) &&
          <p>Resolution: {size?.width} × {size?.height} pixels</p>}
        {lines(quality.explanations)}
        {lines(quality.retake_guidance)}
        {lines(quality.assessment_limitations)}
      </details>
    </div>
  );
}

export function ComparisonEvidence({ readiness }: { readiness: Readiness }) {
  return (
    <div className={readiness.status === "suitable" ? "crop-evidence insight" : "message-caution"} role="status">
      <strong>Comparison readiness · {readinessLabels[readiness.status]}</strong>
      {lines(readiness.explanations)}
      {lines(readiness.corrective_actions)}
      <details><summary>What this check measures</summary>{lines(readiness.assessment_limitations)}</details>
    </div>
  );
}

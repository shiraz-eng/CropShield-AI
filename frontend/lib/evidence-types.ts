export type PhotoQuality = {
  quality_status: "usable" | "warning" | "unavailable";
  detected_issues: string[];
  explanations: string[];
  retake_guidance: string[];
  measurement_metadata: {
    width: number;
    height: number;
    mean_luminance: number;
    dark_pixel_fraction: number;
    bright_pixel_fraction: number;
    edge_energy: number;
  } | null;
  assessment_limitations: string[];
};

export type Readiness = {
  status: "suitable" | "limited" | "unsuitable";
  explanations: string[];
  corrective_actions: string[];
  assessment_limitations: string[];
};

export const qualityLabels = {
  usable: "No capture issues flagged",
  warning: "Capture warning",
  unavailable: "Quality assessment unavailable",
};

export const readinessLabels = {
  suitable: "Suitable",
  limited: "Limited comparability",
  unsuitable: "Unsuitable",
};

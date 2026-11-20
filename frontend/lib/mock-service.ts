import {
  intervalDays,
  sampleAnalysis,
  type CropAnalysis,
  type CropComparison,
  type CropObservation,
  type Language,
} from "./data";

const wait = () => new Promise<void>((resolve) => setTimeout(resolve, 450));
export const acceptedImages = ["image/jpeg", "image/png", "image/webp"];
export const maximumImageBytes = 10 * 1024 * 1024;

export function uploadError(file: File) {
  if (!acceptedImages.includes(file.type))
    return `${file.name}: choose a JPG, PNG, or WebP image.`;
  if (!file.size || file.size > maximumImageBytes)
    return `${file.name}: choose a nonempty image up to 10 MB.`;
  return "";
}

export async function analyzeExample(
  fieldId: string,
  photoCount: number,
): Promise<CropAnalysis> {
  await wait();
  if (!fieldId || photoCount < 1)
    throw new Error("Select a field and at least one image.");
  return sampleAnalysis;
}

export async function compareExamples(
  before: CropObservation,
  after: CropObservation,
): Promise<CropComparison> {
  await wait();
  const days = intervalDays(before.date, after.date);
  if (before.fieldId !== after.fieldId || !(days > 0))
    throw new Error("Choose a later observation from the same field.");
  return {
    id: `${before.id}-${after.id}`,
    fieldId: before.fieldId,
    before,
    after,
    days,
  };
}

export async function assistantExample(
  language: Language,
  fieldName: string,
  topic: string,
) {
  await wait();
  const lower = topic.toLowerCase();
  const weather = /rain|weather|بارش/.test(lower);
  const stage = /stage|growth|مرحلہ/.test(lower);
  if (language === "Urdu") {
    const answer = weather
      ? "بارش کے بعد کھیت کے نشیبی حصوں میں کھڑا پانی دیکھیں۔"
      : stage
        ? "گندم کے پودوں کا قریب سے معائنہ کریں اور نشوونما کا مرحلہ درج کریں۔"
        : "اگلے معائنے پر اسی جگہ سے قریب اور دور کی تصاویر لیں۔";
    return `${fieldName} — ${answer}`;
  }
  const answer = weather
    ? "After rain, look for standing water in low spots and record where it collects."
    : stage
      ? "Inspect several plants at ground level and record the visible stage before comparing with an earlier visit."
      : "At the next inspection, take a wide photo and a close-up from the same spot and record any visible changes.";
  return `For ${fieldName}, an example follow-up would be: ${answer}`;
}

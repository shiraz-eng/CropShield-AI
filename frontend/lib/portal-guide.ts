import catalog from "./portal-guide-catalog.json";

export type GuideLanguage = "en" | "ur";
export type GuideTopic = (typeof catalog.topics)[number];
export const guideTopics = catalog.topics;

export function guideTopic(id: string | null | undefined) {
  return guideTopics.find((topic) => topic.id === id);
}

export function pageGuide(path: string) {
  return guideTopics.find((topic) => path === topic.path || path.startsWith(topic.path + "/"));
}

export function localGuide(question: string) {
  const normalized = question.trim().toLocaleLowerCase().replace(/[؟?!.]+$/u, "");
  const exact = guideTopics.find(({ question, title }) =>
    [question.en, question.ur, title.en, title.ur].some((value) =>
      value.toLocaleLowerCase().replace(/[؟?!.]+$/u, "") === normalized,
    ),
  );
  if (exact) return [exact.id];

  const match = [
    [/upload.*(photo|picture|image)|تصویر.*اپ لوڈ/i, ["scanner"]],
    [/crop doctor.*crop memory|crop memory.*crop doctor|تجزیہ.*موازنہ/i, ["doctor", "comparison"]],
    [/compare.*(observation|photo)|مشاہدات.*موازنہ/i, ["comparison"]],
    [/(add|create).*field|کھیت.*شامل/i, ["fields"]],
    [/analy[sz]e.*(wheat|photo)|گندم.*تجزیہ/i, ["doctor"]],
    [/(download|export).*(pdf|report)|رپورٹ.*ڈاؤن لوڈ/i, ["reports"]],
    [/weather.*(warning|caution)|موسمی.*انتباہ/i, ["weather"]],
    [/(create|add|set).*reminder|یاد دہانی.*بناؤ/i, ["reminders"]],
  ] as const;
  return match.find(([pattern]) => pattern.test(normalized))?.[1];
}

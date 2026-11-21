"use client";

import { MessageCircle } from "lucide-react";
import { useActionState, useState } from "react";
import type { Language } from "@/lib/data";
import type { SavedField } from "@/lib/farm-types";
import { askAssistant, type AssistantFeedback } from "@/lib/crop-analysis-action";
import { useDemo } from "@/lib/state";
import { PageHeader, SectionTitle } from "./shared";

const sourceLabels: Record<string, { en: string; ur: string }> = {
  observation: { en: "Saved observation", ur: "محفوظ مشاہدہ" },
  analysis: { en: "Gemini photo analysis", ur: "جیمنائی تصویری تجزیہ" },
  comparison: { en: "Crop Memory comparison", ur: "فصل کا موازنہ" },
  weather: { en: "Open-Meteo forecast", ur: "موسمی پیش گوئی" },
  reminder: { en: "Reminder", ur: "یاد دہانی" },
};

type Turn = { question: string; reply: NonNullable<AssistantFeedback["reply"]> };

export function Assistant({
  fields,
  initialField,
}: {
  fields: SavedField[];
  initialField?: string;
}) {
  const { user } = useDemo();
  const [language, setLanguage] = useState<Language>(user.language);
  const [fieldId, setFieldId] = useState(
    fields.find(({ id }) => id === initialField)?.id ?? fields[0]?.id ?? "",
  );
  const [history, setHistory] = useState<Turn[]>([]);
  const [state, ask, pending] = useActionState(
    async (previous: AssistantFeedback, form: FormData) => {
      const result = await askAssistant(previous, form);
      if (result.reply && result.question)
        setHistory((turns) => [...turns, { question: result.question!, reply: result.reply! }]);
      return result;
    },
    {},
  );
  const field = fields.find(({ id }) => id === fieldId);
  const urdu = language === "Urdu";
  return (
    <>
      <PageHeader
        title="AI Farmer Assistant"
        description="Field guidance in English or Urdu, grounded in your saved records."
        icon={MessageCircle}
      />
      <div className="chat-layout">
        <section className="card panel stack">
          <SectionTitle title="Conversation" />
          <div className="chat-log">
            {!history.length && (
              <p lang={urdu ? "ur" : "en"} dir={urdu ? "rtl" : "ltr"}>
                {urdu
                  ? "اپنے کھیت کے بارے میں سوال پوچھیں۔"
                  : "Ask a question about the selected field."}
              </p>
            )}
            {history.map(({ question, reply }, index) => {
              const ur = reply.language === "Urdu";
              return (
                <div className="stack" key={index}>
                  <p className="chat-question" dir="auto">
                    <strong>{ur ? "آپ:" : "You:"}</strong> {question}
                  </p>
                  <div className="chat-answer" lang={ur ? "ur" : "en"} dir={reply.direction}>
                    <p style={{ whiteSpace: "pre-line" }}>{reply.answer.replaceAll("**", "")}</p>
                    {reply.sources.length > 0 && (
                      <small>
                        {ur ? "استعمال شدہ ریکارڈ: " : "Records used: "}
                        {reply.sources.map(({ key }) => sourceLabels[key]?.[ur ? "ur" : "en"] ?? key).join(" · ")}
                      </small>
                    )}
                    {reply.missing_sources.length > 0 && (
                      <small>
                        {ur ? " دستیاب نہیں: " : " Not available: "}
                        {reply.missing_sources
                          .map((key) => sourceLabels[key]?.[ur ? "ur" : "en"] ?? key)
                          .join(" · ")}
                      </small>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <form action={ask} className="stack">
            <input type="hidden" name="field" value={fieldId} />
            <input type="hidden" name="language" value={language} />
            <label>
              {urdu ? "سوال" : "Question"}
              <textarea
                name="question"
                required
                maxLength={1200}
                rows={3}
                dir={urdu ? "rtl" : "ltr"}
                lang={urdu ? "ur" : "en"}
                placeholder={urdu ? "میری گندم کی حالت کیسی ہے؟" : "How does my wheat look this week?"}
              />
            </label>
            <button className="button" disabled={pending || !field}>
              {pending ? (urdu ? "جواب تیار ہو رہا ہے…" : "Thinking…") : urdu ? "پوچھیں" : "Ask"}
            </button>
            {state.error && <p className="message-error" role="alert">{state.error}</p>}
          </form>
          <small>
            AI guidance from your saved records. It does not confirm diseases or prescribe chemicals.
            Consult a qualified agricultural adviser for treatment decisions.
          </small>
        </section>
        <aside className="card panel stack">
          <SectionTitle title="Field context" />
          <label>
            Field
            <select
              aria-label="Field"
              value={fieldId}
              disabled={!fields.length}
              onChange={(event) => setFieldId(event.target.value)}
            >
              {!fields.length && <option value="">No active fields</option>}
              {fields.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Response language
            <select
              aria-label="Response language"
              value={language}
              onChange={(event) => setLanguage(event.target.value === "Urdu" ? "Urdu" : "English")}
            >
              <option>English</option>
              <option value="Urdu">اردو (Urdu)</option>
            </select>
          </label>
          {field && (
            <p>
              {field.crop_type}
              {field.crop_variety ? ` · ${field.crop_variety}` : ""}
            </p>
          )}
        </aside>
      </div>
    </>
  );
}

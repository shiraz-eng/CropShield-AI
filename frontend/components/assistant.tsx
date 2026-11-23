"use client";

import { MessageCircle } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
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
  initialBatch,
}: {
  fields: SavedField[];
  initialField?: string;
  initialBatch?: string;
}) {
  const { user } = useDemo();
  const [language, setLanguage] = useState<Language>(user.language);
  const [fieldId, setFieldId] = useState(
    fields.find(({ id }) => id === initialField)?.id ?? "",
  );
  const [history, setHistory] = useState<Turn[]>([]);
  const [batchId, setBatchId] = useState(initialBatch);
  const [draft, setDraft] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const chatLog = useRef<HTMLDivElement>(null);
  const [state, ask, pending] = useActionState(
    async (previous: AssistantFeedback, form: FormData) => {
      setDismissed(false);
      form.set("history", JSON.stringify(history.slice(-6).map(({ question, reply }) => ({
        question,
        answer: reply.answer,
      }))));
      const result = await askAssistant(previous, form);
      if (result.reply && result.question) {
        const turn = { question: result.question, reply: result.reply };
        setHistory((turns) => [...turns, turn]);
        setDraft("");
      }
      if (result.fieldUnavailable) {
        setFieldId("");
        setBatchId(undefined);
        setHistory([]);
      }
      return result;
    },
    {},
  );
  const field = fields.find(({ id }) => id === fieldId);
  const urdu = language === "Urdu";
  useEffect(() => {
    const log = chatLog.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [history, pending]);
  return (
    <>
      <PageHeader
        title="AI Farmer Assistant"
        description="Chat in English or Urdu. Select a field to include its saved records."
        icon={MessageCircle}
      />
      <div className="chat-layout">
        <section className="card panel stack">
          <div className="actions">
            <SectionTitle title="Conversation" />
            <button
              className="button button-outline"
              type="button"
              disabled={pending || (!history.length && !draft && (!state.error || dismissed))}
              onClick={() => {
                setHistory([]);
                setDraft("");
                setDismissed(true);
              }}
            >
              New chat
            </button>
          </div>
          <div className="chat-log" ref={chatLog} role="log" aria-label="Conversation messages">
            {!history.length && (
              <p lang={urdu ? "ur" : "en"} dir={urdu ? "rtl" : "ltr"}>
                {urdu
                  ? "اپنے کھیت کے بارے میں سوال پوچھیں۔"
                  : field ? "Ask about the selected field." : "Ask a question to start a conversation."}
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
            {pending && (
              <p role="status" lang={urdu ? "ur" : "en"} dir={urdu ? "rtl" : "ltr"}>
                {urdu ? "جواب تیار ہو رہا ہے…" : "Preparing a reply…"}
              </p>
            )}
          </div>
          <form action={ask} className="stack">
            <input type="hidden" name="field" value={field?.id ?? ""} />
            <input type="hidden" name="batch" value={batchId ?? ""} />
            <input type="hidden" name="language" value={language} />
            <label>
              {urdu ? "سوال" : "Question"}
              <textarea
                name="question"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                readOnly={pending}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && !pending && draft.trim()) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                required
                maxLength={1200}
                rows={3}
                dir={urdu ? "rtl" : "ltr"}
                lang={urdu ? "ur" : "en"}
                placeholder={urdu ? "اپنا سوال لکھیں" : "Ask a question…"}
              />
            </label>
            <button className="button" disabled={pending || !draft.trim()}>
              {pending ? (urdu ? "جواب تیار ہو رہا ہے…" : "Thinking…") : urdu ? "پوچھیں" : "Ask"}
            </button>
            {state.error && !dismissed && <p className="message-error" role="alert">{state.error}</p>}
          </form>
          <small>
            General guidance or advice grounded in your selected field. For diagnosis or treatment,
            consult a qualified agricultural adviser.
          </small>
        </section>
        <aside className="card panel stack">
          <SectionTitle title="Conversation context" />
          {batchId && <p>Using the storage batch selected in GrainSafe.</p>}
          <label>
            Field
            <select
              aria-label="Field"
              value={batchId ? "batch" : field?.id ?? ""}
              disabled={pending}
              onChange={(event) => {
                setFieldId(event.target.value);
                setBatchId(undefined);
                setHistory([]);
                setDismissed(true);
              }}
            >
              <option value="">General chat</option>
              {batchId && <option value="batch" disabled>Selected storage batch</option>}
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
              disabled={pending}
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

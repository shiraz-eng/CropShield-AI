"use client";

import { Bot, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { fieldObservations, formatDate, type Language } from "@/lib/data";
import { assistantExample } from "@/lib/mock-service";
import { useDemo } from "@/lib/state";
import {
  CropStageBadge,
  EmptyState,
  FieldSelect,
  LoadingSkeleton,
  MockDataNotice,
  PageHeader,
  SectionTitle,
} from "./shared";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  language: Language;
}
const prompts = {
  English: [
    "What should I look for after rain?",
    "How can I check the growth stage?",
    "What photos should I capture next?",
  ],
  Urdu: [
    "بارش کے بعد کیا دیکھوں؟",
    "نشوونما کا مرحلہ کیسے دیکھوں؟",
    "اگلی بار کون سی تصاویر لوں؟",
  ],
};

export function Assistant({ initialField }: { initialField?: string }) {
  const { fields, user } = useDemo();
  const [field, setField] = useState(
    fields.find(({ id }) => id === initialField)?.id ?? fields[0].id,
  );
  const [language, setLanguage] = useState(user.language);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const last = fieldObservations(field).at(-1);
  const fieldName = fields.find(({ id }) => id === field)?.name ?? "Field";
  useEffect(() => {
    const element = log.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, loading]);

  async function send(input: string) {
    const question = input.trim();
    if (!question || loading) return;
    setLoading(true);
    setError("");
    setText("");
    setMessages((items) => [
      ...items,
      { id: crypto.randomUUID(), role: "user", text: question, language },
    ]);
    try {
      const answer = await assistantExample(language, fieldName, question);
      setMessages((items) => [
        ...items,
        { id: crypto.randomUUID(), role: "assistant", text: answer, language },
      ]);
    } catch {
      setError("The demonstration response could not be loaded. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(text);
  }

  return (
    <>
      <PageHeader
        title="AI Farmer Assistant"
        description="Explore sample guidance in English or Urdu with a field in view."
        icon={MessageCircle}
      />
      <MockDataNotice>
        Demonstration replies use fixed examples and do not assess crop photos.
      </MockDataNotice>
      <div className="chat-layout">
        <section className="card panel stack">
          <SectionTitle title="Conversation" />
          <div
            className="chat-log"
            role="log"
            aria-label="Chat messages"
            ref={log}
          >
            {messages.length ? (
              messages.map((message) => (
                <article
                  className={`chat-message ${message.role}`}
                  key={message.id}
                >
                  <small
                    className={
                      message.role === "user" ? "chat-user-label" : undefined
                    }
                  >
                    {message.role === "assistant"
                      ? "CropShield · Demonstration response"
                      : "You"}
                  </small>
                  <p
                    dir={message.language === "Urdu" ? "rtl" : "auto"}
                    lang={message.language === "Urdu" ? "ur" : "en"}
                  >
                    {message.text}
                  </p>
                </article>
              ))
            ) : (
              <EmptyState title="Start with a field question">
                Select a suggested question or write your own.
              </EmptyState>
            )}
            {loading && (
              <LoadingSkeleton label="Preparing a demonstration reply…" />
            )}
            {error && (
              <p className="message-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="actions">
            {prompts[language].map((prompt) => (
              <button
                disabled={loading}
                className="button button-outline"
                key={prompt}
                lang={language === "Urdu" ? "ur" : "en"}
                onClick={() => void send(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
          <form className="chat-composer" onSubmit={submit}>
            <input
              aria-label="Your question"
              dir="auto"
              maxLength={400}
              placeholder={
                language === "Urdu"
                  ? "اپنا سوال لکھیں"
                  : "Ask about your field…"
              }
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
            <button
              type="submit"
              className="button"
              disabled={loading || !text.trim()}
              aria-label="Send question"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
        <aside className="card panel stack">
          <SectionTitle title="Field context" />
          <FieldSelect fields={fields} value={field} onChange={setField} />
          <label>
            Response language
            <select
              aria-label="Response language"
              disabled={loading}
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option>English</option>
              <option value="Urdu">اردو (Urdu)</option>
            </select>
          </label>
          <div className="insight">
            <Bot size={18} />
            <div>
              <strong>{fieldName}</strong>
              <p>
                {last
                  ? `Latest sample observation · ${formatDate(last.date)}`
                  : "No sample observations for this field."}
              </p>
              {last && <CropStageBadge stage={last.stage} />}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

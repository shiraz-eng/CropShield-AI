"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Bot, ChartNoAxesColumn, Cloud, Globe, Layers, Maximize2, Minimize2, ScanLine, Send, Sparkles, Sprout, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { askPortalGuide } from "@/lib/portal-guide-action";
import { guideTopic, guideTopics, pageGuide, type GuideLanguage } from "@/lib/portal-guide";
import { useDemo } from "@/lib/state";
import styles from "./portal-guide.module.css";

const copy = {
  en: {
    title: "AI Guide", close: "Close guide", greeting: "Hi! I’m your AI Guide", welcome: "I’ll help you find your way around CropShield AI, step by step.",
    expand: "Expand guide", collapse: "Restore guide size", languages: "Guide language",
    here: "Current page", topics: "Suggested questions", all: "All guide topics", tour: "Start walkthrough",
    next: "Next step", done: "End walkthrough", missing: "This control isn’t visible here right now. Check the instructions or open the guide’s page.",
    input: "Ask about using CropShield AI…", send: "Send", waiting: "Finding guidance…",
    unavailable: "Conversational guidance is unavailable. You can still use these instructions.",
    unsupported: "I can help with portal workflows. For farming questions, open the AI Farmer Assistant.",
    auth: "Sign in again to ask the guide.", invalid: "Enter a question up to 600 characters.",
    open: "Open", languageHelp: "Choose اردو in the guide’s language menu to switch the guide to Urdu.",
  },
  ur: {
    title: "اے آئی رہنما", close: "رہنما بند کریں", greeting: "سلام! میں آپ کا اے آئی رہنما ہوں", welcome: "میں کراپ شیلڈ اے آئی استعمال کرنے میں قدم بہ قدم آپ کی مدد کروں گا۔",
    expand: "رہنما بڑا کریں", collapse: "رہنما کا سائز بحال کریں", languages: "رہنما کی زبان",
    here: "موجودہ صفحہ", topics: "تجویز کردہ سوالات", all: "رہنمائی کے تمام موضوعات", tour: "مرحلہ وار رہنمائی شروع کریں",
    next: "اگلا مرحلہ", done: "رہنمائی ختم کریں", missing: "یہ بٹن ابھی یہاں نظر نہیں آ رہا۔ ہدایات دیکھیں یا متعلقہ صفحہ کھولیں۔",
    input: "کراپ شیلڈ کے استعمال کے بارے میں پوچھیں", send: "بھیجیں", waiting: "رہنمائی تلاش ہو رہی ہے…",
    unavailable: "گفتگو کی سہولت فی الحال دستیاب نہیں۔ یہ ہدایات اب بھی استعمال کر سکتے ہیں۔",
    unsupported: "میں پورٹل استعمال کرنے میں مدد کرتا ہوں۔ کاشت کاری کے سوالات کے لیے اے آئی فارمر اسسٹنٹ کھولیں۔",
    auth: "رہنما سے سوال کرنے کے لیے دوبارہ سائن ان کریں۔", invalid: "زیادہ سے زیادہ ۶۰۰ حروف کا سوال لکھیں۔",
    open: "کھولیں", languageHelp: "رہنما کو اردو میں استعمال کرنے کے لیے سوال کے خانے کے پاس اردو منتخب کریں۔",
  },
};

type Reply = Awaited<ReturnType<typeof askPortalGuide>>;
type Turn = Reply & { question: string; language: GuideLanguage };
const featured = ["scanner", "fields", "comparison", "weather", "reminders", "reports"];
const topicIcons: Record<string, typeof Sparkles> = {
  scanner: ScanLine, fields: Sprout, comparison: Layers, weather: Cloud, reminders: Bell, reports: ChartNoAxesColumn,
};

export function PortalGuide() {
  const path = usePathname();
  const page = pageGuide(path);
  const { user } = useDemo();
  const [preferred, setPreferred] = useState<GuideLanguage>();
  const language = preferred ?? (user.language === "Urdu" ? "ur" : "en");
  const labels = copy[language];
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const [tour, setTour] = useState<{ path: string; index: number }>();
  const [highlighted, setHighlighted] = useState(false);
  const [showTopics, setShowTopics] = useState(false);
  const focus = useRef<HTMLButtonElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const history = useRef<HTMLDivElement>(null);
  const step = tour?.path === path ? page?.steps[tour.index] : undefined;

  useEffect(() => {
    if (open) focus.current?.focus();
  }, [open]);

  useEffect(() => {
    if (history.current) history.current.scrollTop = history.current.scrollHeight;
  }, [turns, pending]);

  useEffect(() => {
    if (!open || !step) return;
    const { selector, label } = step;
    let target: HTMLElement | undefined;
    function update() {
      const containers = document.querySelectorAll("#main-content, [role='dialog']");
      const candidates = Array.from(containers).flatMap((container) =>
        Array.from(container.querySelectorAll<HTMLElement>(selector)),
      );
      const next = candidates.find((node) =>
        node.getClientRects().length && (!label || node.textContent?.trim().replace(/\s+/g, " ") === label),
      );
      if (target !== next) {
        target?.classList.remove(styles.highlight);
        target = next;
        target?.classList.add(styles.highlight);
        target?.scrollIntoView({ block: "center", behavior: "instant" });
      }
      setHighlighted(Boolean(target));
    }
    const observer = new MutationObserver(update);
    const frame = requestAnimationFrame(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      target?.classList.remove(styles.highlight);
    };
  }, [open, step]);

  function close() {
    setOpen(false);
    setTour(undefined);
    trigger.current?.focus();
  }

  async function ask() {
    const input = question.trim();
    if (pending || !input) return;
    setQuestion("");
    setPending(true);
    let result: Reply;
    try {
      const previous = turns.at(-1)?.topics[0] ?? null;
      result = /(?:change|switch|select).*urdu|اردو.*(?:بدل|منتخب)/iu.test(input)
        ? { topics: [], answer: labels.languageHelp }
        : await askPortalGuide(input, language, page?.id ?? null, previous);
    } catch {
      result = { topics: [], status: "unavailable" };
    } finally {
      setPending(false);
    }
    const topics = result.status === "unavailable" && page ? [page.id] : result.topics;
    setTurns((prior) => [...prior, { ...result, topics, question: input, language }]);
  }

  const suggestedIds = page && featured.includes(page.id)
    ? [page.id, ...featured.filter((id) => id !== page.id)]
    : featured;
  const suggestions = showTopics ? guideTopics : suggestedIds.map(guideTopic);

  return (
    <aside className={styles.guide} lang={language} dir={language === "ur" ? "rtl" : "ltr"}>
      <button ref={trigger} type="button" className={styles.trigger} aria-expanded={open}
        aria-controls="portal-guide-panel" onClick={() => open ? close() : setOpen(true)}>
        <Sparkles size={20} aria-hidden="true" /> {labels.title}
      </button>
      <dialog id="portal-guide-panel" className={styles.panel} data-expanded={expanded && !step} open={open} aria-labelledby="portal-guide-heading"
        onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); close(); } }}>
        <header className={styles.header}>
          <Sparkles size={26} className={styles.headerIcon} aria-hidden="true" />
          <div>
            <h2 id="portal-guide-heading">{labels.title}</h2>
            {page && <p>{labels.here} · {page.title[language]}</p>}
          </div>
          <button type="button" className={styles.resize} disabled={Boolean(step)}
            aria-label={expanded ? labels.collapse : labels.expand} onClick={() => setExpanded(!expanded)}>
            {expanded ? <Minimize2 size={20} aria-hidden="true" /> : <Maximize2 size={20} aria-hidden="true" />}
          </button>
          <button ref={focus} type="button" aria-label={labels.close} onClick={close}><X size={22} aria-hidden="true" /></button>
        </header>
        {step && tour && page && (
          <section className={styles.walkthrough} aria-live="polite">
            <strong>{tour.index + 1} / {page.steps.length}</strong>
            <p>{step[language]}</p>
            {!highlighted && <p>{labels.missing}{" "}
              {path !== page.path && <Link href={page.path} onClick={() => setTour(undefined)}>{labels.open} {page.title[language]}</Link>}
            </p>}
            <div className={styles.actions}>
              {tour.index + 1 < page.steps.length && <button type="button"
                onClick={() => setTour({ path, index: tour.index + 1 })}>{labels.next}</button>}
              <button type="button" onClick={() => setTour(undefined)}>{labels.done}</button>
            </div>
          </section>
        )}
        <div ref={history} className={styles.history}>
          <div className={styles.welcome}>
            <span className={styles.avatar}><Bot size={44} strokeWidth={1.6} aria-hidden="true" /></span>
            <div><strong>{labels.greeting}</strong><p>{labels.welcome}</p></div>
          </div>
          <h3 id="portal-guide-topics">{labels.topics}</h3>
          <div className={styles.suggestions} role="group" aria-labelledby="portal-guide-topics">
            {suggestions.map((topic) => {
              if (!topic) return null;
              const Icon = topicIcons[topic.id] ?? Sparkles;
              return (
              <button type="button" key={topic.id} disabled={pending} onClick={() =>
                setTurns((prior) => [...prior, { question: topic.question[language], topics: [topic.id], language }])
              }><Icon size={22} aria-hidden="true" /><span>{topic.question[language]}</span></button>
              );
            })}
          </div>
          <div className={styles.actions}>
            {page && !step && <button type="button" onClick={() => setTour({ path, index: 0 })}>{labels.tour}</button>}
            <button type="button" aria-expanded={showTopics} onClick={() => setShowTopics(!showTopics)}>{labels.all}</button>
          </div>
          <div role="log" aria-live="polite">
            {turns.map((turn, index) => (
              <article key={index} lang={turn.language} dir={turn.language === "ur" ? "rtl" : "ltr"}>
                <p className={styles.question} dir="auto">{turn.question}</p>
                {turn.status && <p>{copy[turn.language][turn.status]}</p>}
                {turn.status === "unsupported" && <Link href="/assistant" onClick={() => setTour(undefined)}>
                  {guideTopic("assistant")?.title[turn.language]}
                </Link>}
                {turn.answer && <p dir="auto">{turn.answer}</p>}
                {turn.topics.map((id) => {
                  const topic = guideTopic(id);
                  if (!topic) return null;
                  return <section key={id}>
                    <h3>{topic.title[turn.language]}</h3>
                    <ol>{topic.steps.map((item, i) => <li key={i}>{item[turn.language]}</li>)}</ol>
                    <Link href={topic.path} onClick={() => setTour(undefined)}>
                      {copy[turn.language].open} {topic.title[turn.language]}
                    </Link>
                  </section>;
                })}
              </article>
            ))}
            {pending && <p>{labels.waiting}</p>}
          </div>
        </div>
        <div className={styles.languages} role="group" aria-label={labels.languages}>
          <button type="button" lang="en" aria-pressed={language === "en"} onClick={() => setPreferred("en")}><Globe size={16} aria-hidden="true" /> English</button>
          <button type="button" lang="ur" aria-pressed={language === "ur"} onClick={() => setPreferred("ur")}>اردو</button>
        </div>
        <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void ask(); }}>
          <Sparkles size={18} aria-hidden="true" />
          <input aria-label={labels.input} placeholder={labels.input} value={question} maxLength={600}
            dir="auto" onChange={(event) => setQuestion(event.target.value)} />
          <button type="submit" aria-label={labels.send} disabled={pending || !question.trim()}><Send size={19} aria-hidden="true" /></button>
        </form>
      </dialog>
    </aside>
  );
}

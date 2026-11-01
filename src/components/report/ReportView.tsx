"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandMark } from "@/components/landing/Brand";
import { Gola, Tick } from "@/components/landing/Marks";
import { getSessionId } from "@/lib/log/client";
import { decodeReport, encodeReport, formatDuration, parseReport, summarize, type AiSummary, type Report } from "@/lib/report/model";
import { LOCAL_KEY } from "@/lib/report/recorder";
import AiCard, { type AiState } from "./AiCard";
import QuestionCard from "./QuestionCard";
import { SectionTitle, Tally } from "./bits";

const KID_KEY = "masterg.report.kid"; // name and class, remembered on this device only

type Loaded = { kind: "loading" } | { kind: "empty" } | { kind: "error"; message: string } | { kind: "ok"; report: Report; local: boolean };

async function load(): Promise<Loaded> {
  const hash = window.location.hash.slice(1);
  const data = new URLSearchParams(hash).get("r");
  try {
    if (data) return { kind: "ok", report: await decodeReport(data), local: false };
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return { kind: "empty" };
    const report = parseReport(JSON.parse(raw));
    try {
      const kid = JSON.parse(localStorage.getItem(KID_KEY) ?? "{}") as { nm?: string; cl?: string };
      report.nm ??= kid.nm;
      report.cl ??= kid.cl;
    } catch {}
    return { kind: "ok", report, local: true };
  } catch (e) {
    console.warn("[report] could not read the report:", e);
    return { kind: "error", message: data ? "the link is cut short or damaged" : "the saved copy is damaged" };
  }
}

export default function ReportView() {
  const [loaded, setLoaded] = useState<Loaded>({ kind: "loading" });
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [aiState, setAiState] = useState<AiState>({ kind: "idle" });
  const asked = useRef(false);

  useEffect(() => {
    let alive = true;
    void load().then((l) => {
      if (!alive) return;
      setLoaded(l);
      if (l.kind === "ok" && l.report.ai) setAiState({ kind: "done", summary: l.report.ai });
    });
    return () => {
      alive = false;
    };
  }, []);

  const report = loaded.kind === "ok" ? loaded.report : null;
  const sum = useMemo(() => (report ? summarize(report) : null), [report]);
  const hasSteps = !!report?.qs.some((q) => q.st.length);

  const update = (patch: Partial<Report>) => setLoaded((l) => (l.kind === "ok" ? { ...l, report: { ...l.report, ...patch } } : l));

  const writeSummary = async () => {
    if (!report) return;
    setAiState({ kind: "loading" });
    try {
      const res = await fetch("/api/report-summary", {
        method: "POST",
        headers: { "content-type": "application/json", "x-session-id": getSessionId() },
        body: JSON.stringify({ report: { ...report, ai: undefined } }),
      });
      const json = (await res.json()) as { summary?: AiSummary; error?: string };
      if (!res.ok || !json.summary) throw new Error(json.error ?? `HTTP ${res.status}`);
      setAiState({ kind: "done", summary: json.summary });
      update({ ai: json.summary });
    } catch (e) {
      setAiState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  // The teacher's own copy writes its AI note once, automatically. A shared link never calls the AI by itself.
  useEffect(() => {
    if (loaded.kind !== "ok" || !loaded.local || loaded.report.ai || asked.current || !hasSteps) return;
    asked.current = true;
    const t = setTimeout(() => void writeSummary(), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once when the local report first loads
  }, [loaded.kind, hasSteps]);

  // Keep the share link (and the address bar) in step with the report, so a reload or a copy shows the same thing.
  useEffect(() => {
    if (!report) return;
    let alive = true;
    const t = setTimeout(async () => {
      const enc = await encodeReport(report);
      if (!alive) return;
      const url = `${window.location.origin}/report#r=${enc}`;
      setLink(url);
      history.replaceState(null, "", `#r=${enc}`);
      if (loaded.kind === "ok" && loaded.local) {
        try {
          localStorage.setItem(LOCAL_KEY, JSON.stringify(report));
          localStorage.setItem(KID_KEY, JSON.stringify({ nm: report.nm, cl: report.cl }));
        } catch {}
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [report, loaded]);

  if (loaded.kind === "loading") return <Shell><p className="py-24 text-center font-hand text-2xl">Opening the report…</p></Shell>;
  if (loaded.kind === "error") return <Shell><Empty title="This report link is broken" body={`It could not be read: ${loaded.message}. Ask for the link again.`} /></Shell>;
  if (loaded.kind === "empty" || !report || !sum || report.qs.length === 0)
    return (
      <Shell>
        <Empty title="No practice yet" body="Solve a sum with Masterji, then tap 📋 Report on the notebook. The report shows only what happened in that session." />
      </Shell>
    );

  const date = new Date(report.t0);
  const day = date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  const time = (t: number) => new Date(t).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const who = report.nm?.trim() || "Your child";
  const shareText = [
    `📋 ${report.nm?.trim() ? `${report.nm.trim()}'s` : "Maths"} practice report${report.cl ? ` (Class ${report.cl})` : ""}: ${sum.solved} of ${sum.attempted} sum${sum.attempted === 1 ? "" : "s"} solved`,
    sum.firstTry ? `, ${sum.firstTry} first try` : "",
    sum.mistakes[0] ? `. To work on: ${sum.mistakes[0].label}${sum.mistakes[0].count > 1 ? ` ×${sum.mistakes[0].count}` : ""}` : sum.wrongSteps === 0 && hasSteps ? ". No mistakes!" : "",
    `. ${link}`,
  ].join("");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", link);
    }
  };

  return (
    <Shell>
      {/* Report card */}
      <section className="overflow-hidden rounded-window border-[2.5px] border-kohl bg-paper shadow-hard-lg print:shadow-none">
        <div className="border-b-[2.5px] border-kohl bg-peela px-4 py-4 md:px-7">
          <p className="text-xs font-bold tracking-[0.14em] uppercase">Home practice report</p>
          <h1 className="mt-1 font-display text-[clamp(30px,8vw,46px)] leading-[0.95] font-black tracking-[-0.01em] [font-stretch:118%]">
            {report.nm?.trim() ? `${report.nm.trim()}'s report card` : "Masterji's report card"}
          </h1>
          <p className="mt-2 text-sm font-medium text-kohl/80">
            {day} · {time(report.t0)}–{time(report.t1)} · {formatDuration(sum.durationMs)}
          </p>
        </div>

        <div className="grid gap-3 px-4 pt-4 md:grid-cols-[1fr_8rem] md:px-7">
          <label className="flex items-end gap-2">
            <span className="pb-1 text-sm font-semibold text-muted">Name</span>
            <input
              value={report.nm ?? ""}
              onChange={(e) => update({ nm: e.target.value.slice(0, 60) })}
              placeholder="write the name"
              className="min-w-0 flex-1 border-b-2 border-dashed border-kohl/40 bg-transparent px-1 font-hand text-[24px] leading-tight font-bold text-kohl outline-none placeholder:font-normal placeholder:text-kohl/30 focus:border-red-pen print:placeholder:text-transparent"
            />
          </label>
          <label className="flex items-end gap-2">
            <span className="pb-1 text-sm font-semibold text-muted">Class</span>
            <input
              value={report.cl ?? ""}
              onChange={(e) => update({ cl: e.target.value.slice(0, 20) })}
              placeholder="class"
              inputMode="numeric"
              className="w-full min-w-0 border-b-2 border-dashed border-kohl/40 bg-transparent px-1 font-hand text-[24px] leading-tight font-bold text-kohl outline-none placeholder:font-normal placeholder:text-kohl/30 focus:border-red-pen print:placeholder:text-transparent"
            />
          </label>
        </div>

        <div className="grid items-center gap-5 px-4 pt-5 pb-6 sm:grid-cols-[auto_1fr] md:px-7">
          <div className="relative mx-auto flex size-[150px] flex-col items-center justify-center">
            <Gola className="absolute inset-0 size-full" draw="load" delay="0.2s" />
            <p className="font-hand text-[56px] leading-none font-bold text-red-pen">
              {sum.solved}
              <span className="text-[34px]">/{sum.attempted}</span>
            </p>
            <p className="mt-1 text-xs font-bold tracking-wide text-muted uppercase">sums solved</p>
          </div>
          <dl className="grid grid-cols-2 gap-2.5">
            <Stat label="First try" value={sum.firstTryRate === null ? "–" : `${Math.round(sum.firstTryRate * 100)}%`} sub={`${sum.firstTry} of ${sum.checkable} checked`} />
            <Stat label="Steps checked" value={String(sum.steps)} sub={`${sum.correctSteps} right · ${sum.wrongSteps} with a mistake`} />
            <Stat label="Said “I don’t know”" value={String(sum.stuck)} sub={sum.stuck ? "asked for help" : "never stuck"} />
            <Stat label="Method taught" value={String(sum.taught)} sub={sum.taught === 1 ? "question" : "questions"} />
          </dl>
        </div>
      </section>

      {/* Mistakes and strengths */}
      <section className="mt-8 grid gap-5 md:grid-cols-[1.4fr_1fr]">
        <div className="break-inside-avoid rounded-window border-[2.5px] border-kohl bg-white p-5 shadow-hard print:shadow-none">
          <SectionTitle>Mistakes to work on</SectionTitle>
          {sum.mistakes.length === 0 ? (
            <p className="flex items-center gap-3 text-[15px]">
              <Tick className="size-8 shrink-0" />
              {sum.wrongSteps ? "Mistakes were made, but none had a known type." : "No mistakes this session."}
            </p>
          ) : (
            <ul className="grid gap-4">
              {sum.mistakes.map((m) => (
                <li key={m.id} className="border-b border-dashed border-kohl/20 pb-3 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-hand text-[21px] leading-[1.2] font-bold">{m.label}</p>
                    <span className={`shrink-0 rounded-full border-2 border-kohl px-2.5 py-0.5 font-display text-sm font-black ${m.count > 1 ? "bg-rabar" : "bg-paper"}`}>
                      ×{m.count}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Tally count={m.count} />
                    <span className="text-[13px] text-muted">
                      {m.count > 1 ? "repeated · " : ""}
                      {m.fixed === m.count ? "put right later" : m.fixed ? `${m.fixed} of ${m.count} put right later` : "not put right yet"} · in {m.questions.map((q) => q || "free practice").join(", ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="break-inside-avoid rounded-window border-[2.5px] border-kohl bg-rabar-wash p-5 shadow-hard print:shadow-none">
          <SectionTitle>Strong at</SectionTitle>
          {sum.strengths.length === 0 ? (
            <p className="text-[15px] text-muted">No topic solved cleanly yet in this session. A first-try sum with no hints shows up here.</p>
          ) : (
            <ul className="grid gap-2.5">
              {sum.strengths.map((s) => (
                <li key={s.topic} className="flex items-center gap-2.5 text-[16px] font-semibold">
                  <Tick className="size-6 shrink-0" />
                  {s.topic}
                  <span className="text-sm font-normal text-muted">· {s.solved} first try</span>
                </li>
              ))}
            </ul>
          )}
          {sum.messy > 0 && <p className="mt-4 border-t border-dashed border-kohl/25 pt-3 text-[14px]">✎ Handwriting was hard to read on {sum.messy} step{sum.messy > 1 ? "s" : ""}.</p>}
        </div>
      </section>

      {/* On paper only when it has a note: an empty "write the summary" card prints as a blank box. */}
      <div className={`mt-10 ${aiState.kind === "done" ? "" : "print:hidden"}`}>
        <AiCard state={aiState} onWrite={() => void writeSummary()} canWrite={hasSteps} />
      </div>

      <section className="mt-10">
        <SectionTitle>Every question</SectionTitle>
        <p className="-mt-2 mb-4 text-[13px] text-muted">Each line is what Masterji read on the notebook, with his mark: ✓ right, ✗ mistake, ? couldn&apos;t check.</p>
        <div className="grid gap-5">
          {report.qs.map((q, i) => (
            <QuestionCard key={i} q={q} index={i} outcome={sum.outcomes[i]} />
          ))}
        </div>
      </section>

      <p className="mt-10 pb-4 text-center text-[13px] text-muted">
        {who === "Your child" ? "This" : `${who}'s`} report is made from the session itself: every step, mark and count above happened. Only the yellow note is written by AI.
      </p>

      <p className="report-print-footer">
        Master G · home maths practice with Masterji · printed {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </p>

      {/* Actions */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t-[2.5px] border-kohl bg-paper/95 px-4 py-3 backdrop-blur md:mx-0 md:rounded-t-control md:border-x-[2.5px] print:hidden">
        <div className="flex gap-2">
          <ActionButton onClick={() => void copy()} disabled={!link}>
            {copied ? "Copied ✓" : "Copy link"}
          </ActionButton>
          <a
            href={link ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : undefined}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-1.5 rounded-control border-[2.5px] border-kohl bg-[#25D366] px-3 py-2.5 text-center font-display text-[15px] font-black text-kohl shadow-hard-sm transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none"
          >
            WhatsApp
          </a>
          <ActionButton onClick={() => window.print()}>Print / PDF</ActionButton>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="report-page min-h-screen w-full bg-kagaz font-body text-kohl">
      <div className="mx-auto max-w-[760px] px-4 pt-5 print:max-w-none print:px-0 print:pt-0 print:pb-0">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="size-9" />
            <span className="font-display text-[20px] leading-none font-black tracking-tight whitespace-nowrap [font-stretch:112%]">Master G</span>
          </Link>
          <span className="text-right font-hand text-[15px] leading-tight font-bold text-red-pen md:text-[17px]">
            your maths teacher&apos;s
            <br className="sm:hidden" /> assistant at home
          </span>
        </header>
        {children}
      </div>
    </main>
  );
}

function Empty({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-window border-[2.5px] border-kohl bg-paper px-5 py-12 text-center shadow-hard-lg">
      <h1 className="font-display text-[30px] leading-tight font-black [font-stretch:112%]">{title}</h1>
      <p className="mx-auto mt-3 max-w-md text-[16px] leading-relaxed text-muted">{body}</p>
      <Link
        href="/learn"
        className="mt-6 inline-flex rounded-control border-[2.5px] border-kohl bg-peela px-5 py-3 font-display font-black shadow-hard-sm transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none"
      >
        Open the notebook
      </Link>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-control border-2 border-kohl bg-white px-3 py-2.5">
      <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-display text-[28px] leading-none font-black [font-stretch:112%]">{value}</dd>
      <dd className="mt-1 text-[12px] leading-tight text-muted">{sub}</dd>
    </div>
  );
}

function ActionButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-control border-[2.5px] border-kohl bg-white px-3 py-2.5 font-display text-[15px] font-black shadow-hard-sm transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50"
    >
      {children}
    </button>
  );
}

"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import AiCard, { type AiCopy, type AiState } from "@/components/report/AiCard";
import { Stamp, StepMark, Tally, pretty } from "@/components/report/bits";
import { rememberTeacherClass, teacherClasses } from "@/lib/classroom/client";
import { classOverview, mergeReports, normalizeCode, type ClassInfo, type ClassOverview, type SessionDoc, type StudentRow } from "@/lib/classroom/model";
import { OUTCOME_LABEL, encodeReport, formatDuration, summarize, type AiSummary, type Outcome } from "@/lib/report/model";
import { Button, Card, H1, Shell, ago } from "./ui";

// /teacher/<CODE>: the teacher's view of the class. Everything here is rolled up from the kids' real
// session reports (classOverview); only the yellow "What to reteach" note is written by AI.
// Refreshes every 10 s, so a child's work shows up while they practise.

type Load = { kind: "loading" } | { kind: "nokey" } | { kind: "error"; message: string } | { kind: "ok"; info: ClassInfo; sessions: SessionDoc[]; at: number };

const CLASS_COPY: AiCopy = {
  title: "What to reteach",
  source: "Written by Gemini Flash from the class counts on this page only (no names are sent). Answers to the practice questions are worked out by Master G's maths checker, not the AI.",
  lacking: "Where the class is lacking",
  next: "Reteach first",
  worksheet: "For the class worksheet",
  writing: "Masterji is reading the class's work…",
};

function teacherKey(code: string): string | null {
  const fromLink = new URLSearchParams(window.location.hash.slice(1)).get("k");
  if (fromLink) return fromLink;
  return teacherClasses().find((c) => c.code === code)?.key ?? null;
}

export default function Dashboard() {
  const code = normalizeCode(useParams<{ code: string }>().code ?? "");
  const [key, setKey] = useState<string | null>(null);
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [open, setOpen] = useState<string | null>(null); // student id whose page is open
  const [ai, setAi] = useState<AiState>({ kind: "idle" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const k = teacherKey(code);
    /* eslint-disable react-hooks/set-state-in-effect -- the key lives in the URL fragment / localStorage, readable only after mount */
    setKey(k);
    if (!k) setLoad({ kind: "nokey" });
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [code]);

  const fetchNow = useCallback(async () => {
    if (!key) return;
    try {
      const res = await fetch(`/api/class/${code}/dashboard`, { headers: { "x-teacher-key": key }, cache: "no-store" });
      const json = (await res.json()) as { info?: ClassInfo; sessions?: SessionDoc[]; error?: string };
      if (!res.ok || !json.info) throw new Error(json.error ?? `HTTP ${res.status}`);
      rememberTeacherClass({ code, name: json.info.name, key });
      setLoad({ kind: "ok", info: json.info, sessions: json.sessions ?? [], at: Date.now() });
    } catch (e) {
      setLoad((l) => (l.kind === "ok" ? l : { kind: "error", message: e instanceof Error ? e.message : String(e) }));
    }
  }, [code, key]);

  useEffect(() => {
    if (!key) return;
    const first = setTimeout(() => void fetchNow(), 0);
    const t = setInterval(() => void fetchNow(), 10000);
    return () => {
      clearTimeout(first);
      clearInterval(t);
    };
  }, [key, fetchNow]);

  const overview = useMemo(() => (load.kind === "ok" ? classOverview(load.info, load.sessions) : null), [load]);

  const writeNote = async () => {
    if (!key) return;
    setAi({ kind: "loading" });
    try {
      const res = await fetch(`/api/class/${code}/summary`, { method: "POST", headers: { "x-teacher-key": key } });
      const json = (await res.json()) as { summary?: AiSummary; error?: string };
      if (!res.ok || !json.summary) throw new Error(json.error ?? `HTTP ${res.status}`);
      setAi({ kind: "done", summary: json.summary });
    } catch (e) {
      setAi({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  if (load.kind === "loading") return <Shell tagline="for the teacher" wide><p className="py-24 text-center font-hand text-2xl">Class khul rahi hai…</p></Shell>;
  if (load.kind === "nokey" || load.kind === "error")
    return (
      <Shell tagline="for the teacher">
        <Card className="px-5 py-10 text-center">
          <h1 className="font-display text-[28px] font-black">{load.kind === "nokey" ? "This class needs its teacher link" : "Couldn't open the class"}</h1>
          <p className="mx-auto mt-3 max-w-md text-muted">
            {load.kind === "nokey" ? "Open the private dashboard link you got when you made the class, on this browser." : load.message}
          </p>
          <Link href="/teacher" className="mt-6 inline-flex rounded-control border-[2.5px] border-kohl bg-peela px-5 py-3 font-display font-black shadow-hard-sm">
            Teacher home
          </Link>
        </Card>
      </Shell>
    );

  const { info, sessions } = load;
  const o = overview!;
  const joinLink = `${window.location.origin}/join?c=${info.code}`;
  const shareText = `Join our class "${info.name}" on Master G and practise maths with Masterji at home. Class code: ${info.code}. ${joinLink}`;
  const student = open ? o.rows.find((r) => r.student.id === open) : undefined;
  const flagged = o.rows.filter((r) => r.attention);

  const copyJoin = async () => {
    try {
      await navigator.clipboard.writeText(joinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link", joinLink);
    }
  };

  return (
    <Shell tagline="for the teacher" wide>
      {/* Class header */}
      <Card tone="peela" className="overflow-hidden">
        <div className="grid gap-5 px-5 py-6 md:grid-cols-[1fr_auto] md:px-7">
          <div>
            <H1 kicker={[info.school, info.grade ? `Class ${info.grade}` : ""].filter(Boolean).join(" · ") || "Class"}>{info.name}</H1>
            <p className="mt-2 text-[13px] text-kohl/75">Updated {ago(load.at)} · refreshes every 10 s</p>
          </div>
          <div className="rounded-control border-[2.5px] border-kohl bg-paper px-4 py-3">
            <p className="text-[11px] font-bold tracking-wide text-muted uppercase">Class code for students</p>
            <p className="font-mono text-[34px] leading-none font-black tracking-[0.18em]">{info.code}</p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => void copyJoin()} className="flex-1 px-3 py-2 text-[13px]">
                {copied ? "Copied ✓" : "Copy join link"}
              </Button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center rounded-control border-[2.5px] border-kohl bg-[#25D366] px-3 py-2 font-display text-[13px] font-black shadow-hard-sm"
              >
                WhatsApp
              </a>
            </div>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-px border-t-[2.5px] border-kohl bg-kohl md:grid-cols-4">
          <Big label="Students joined" value={String(o.totals.students)} sub={`${o.totals.active} practised`} />
          <Big label="Sessions" value={String(o.totals.sessions)} sub="at home with Masterji" />
          <Big label="Sums solved" value={`${o.totals.solved}/${o.totals.attempted}`} sub="whole class" />
          <Big label="First try" value={o.totals.firstTryRate === null ? "–" : `${Math.round(o.totals.firstTryRate * 100)}%`} sub="of sums the checker can verify" />
        </dl>
      </Card>

      {o.totals.students === 0 ? (
        <Card tone="white" className="mt-8 px-5 py-10 text-center">
          <h2 className="font-display text-[24px] font-black">No students yet</h2>
          <p className="mx-auto mt-2 max-w-md text-muted">
            Share the class code or the join link. When a child joins and practises with Masterji, their work shows up here within seconds.
          </p>
        </Card>
      ) : (
        <>
          {/* Needs attention */}
          {flagged.length > 0 && (
            <section className="mt-8">
              <Title hand="dhyaan do">Needs your attention</Title>
              <div className="flex flex-wrap gap-2">
                {flagged.map((r) => (
                  <button
                    key={r.student.id}
                    onClick={() => setOpen(r.student.id)}
                    className="rounded-control border-2 border-red-pen bg-paper px-3 py-2 text-left transition hover:bg-rabar-wash"
                  >
                    <span className="font-display text-[15px] font-black">{r.student.name}</span>
                    <span className="block text-[13px] text-red-pen">{r.attention}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="mt-8 grid items-start gap-6 lg:grid-cols-2 [&>*]:min-w-0">
            <MistakesChart o={o} />
            <AiCard state={ai} onWrite={() => void writeNote()} canWrite={o.totals.attempted > 0} copy={CLASS_COPY} />
          </section>

          <TopicGrid o={o} onOpen={setOpen} />

          <Roster rows={o.rows} onOpen={setOpen} openId={open} />

          {student && <StudentPanel row={student} sessions={sessions.filter((s) => s.studentId === student.student.id)} onClose={() => setOpen(null)} />}
        </>
      )}

      <p className="mt-10 text-center text-[13px] text-muted">
        Every number here comes from the children&apos;s own sessions: each step Masterji read and checked. Nothing is sample data.
      </p>
    </Shell>
  );
}

function Big({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-paper px-4 py-3 md:px-6">
      <dt className="text-[11px] font-bold tracking-wide text-muted uppercase">{label}</dt>
      <dd className="font-display text-[30px] leading-none font-black [font-stretch:112%]">{value}</dd>
      <dd className="mt-1 text-[12px] leading-tight text-muted">{sub}</dd>
    </div>
  );
}

function Title({ children, hand }: { children: React.ReactNode; hand?: string }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline gap-x-3">
      <h2 className="font-display text-[22px] leading-tight font-black [font-stretch:112%] md:text-[26px]">{children}</h2>
      {hand && <span className="font-hand text-lg font-bold text-red-pen">{hand}</span>}
    </div>
  );
}

// One series: how many children made each mistake. Bars in red pen, labels in ink, value on the bar end.
function MistakesChart({ o }: { o: ClassOverview }) {
  const total = Math.max(1, o.totals.students);
  const names = new Map(o.rows.map((r) => [r.student.id, r.student.name]));
  return (
    <Card tone="white" className="p-5">
      <Title hand="galtiyan">Mistakes the class shares</Title>
      {o.mistakes.length === 0 ? (
        <p className="flex items-center gap-3 text-[15px]">
          <StepMark status="c" className="size-8 shrink-0" />
          No mistakes with a known type yet.
        </p>
      ) : (
        <ul className="grid gap-4">
          {o.mistakes.slice(0, 8).map((m) => {
            const kidNames = m.kids.map((k) => names.get(k) ?? "?").join(", ");
            return (
              <li key={m.id} title={`${m.label}: ${m.kids.length} of ${total} children (${kidNames}), ${m.count} times`}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-hand text-[19px] leading-tight font-bold">{m.label}</p>
                  <p className="shrink-0 text-[13px] text-muted">{m.count}×</p>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-5 flex-1 rounded-r bg-mist">
                    <div className="h-full rounded-r-[4px] bg-red-pen" style={{ width: `${Math.max(4, (m.kids.length / total) * 100)}%` }} />
                  </div>
                  <span className="w-[5.5rem] shrink-0 text-right font-display text-[14px] font-black">
                    {m.kids.length} of {total} kids
                  </span>
                </div>
                {m.example && (
                  <p className="mt-1 text-[12px] text-muted">
                    e.g. wrote <b className="font-hand text-[15px] text-kohl">{pretty(m.example.t)}</b>
                    {m.example.q ? ` for ${pretty(m.example.q)}` : ""} · {kidNames}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const CELL: Record<Outcome, { glyph: string; cls: string }> = {
  first_try: { glyph: "✓", cls: "bg-paper text-red-pen border-red-pen" },
  fixed: { glyph: "✓✗", cls: "bg-rabar-wash text-red-pen border-red-pen" },
  helped: { glyph: "✋", cls: "bg-peela text-kohl border-kohl" },
  unfinished: { glyph: "…", cls: "bg-mist text-muted border-muted/50" },
  unchecked: { glyph: "·", cls: "bg-mist text-muted border-muted/50" },
};

function TopicGrid({ o, onOpen }: { o: ClassOverview; onOpen: (id: string) => void }) {
  const active = o.rows.filter((r) => r.sessions > 0);
  if (!o.topics.length || !active.length) return null;
  return (
    <section className="mt-8">
      <Title hand="topic by topic">Who is strong where</Title>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-muted">
        {(["first_try", "fixed", "helped", "unfinished"] as Outcome[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`inline-flex size-5 items-center justify-center rounded border text-[11px] font-black ${CELL[k].cls}`}>{CELL[k].glyph}</span>
            {OUTCOME_LABEL[k]}
          </span>
        ))}
        <span>· latest sum on each topic</span>
      </div>
      <div className="overflow-x-auto rounded-window border-[2.5px] border-kohl bg-white shadow-hard">
        <table className="w-full min-w-[520px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b-2 border-kohl bg-paper">
              <th className="sticky left-0 bg-paper px-4 py-2.5 text-left font-display font-black">Student</th>
              {o.topics.map((t) => (
                <th key={t} className="px-2 py-2.5 text-center text-[12px] leading-tight font-bold">
                  {t}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.map((r) => (
              <tr key={r.student.id} className="border-b border-dashed border-kohl/20 last:border-0">
                <th className="sticky left-0 bg-white px-4 py-2 text-left font-semibold">
                  <button onClick={() => onOpen(r.student.id)} className="underline decoration-dotted underline-offset-4 hover:text-red-pen">
                    {r.student.name}
                  </button>
                </th>
                {o.topics.map((t) => {
                  const c = o.grid[r.student.id]?.[t];
                  return (
                    <td key={t} className="px-2 py-1.5 text-center">
                      {c ? (
                        <span
                          title={`${r.student.name} · ${t}: ${OUTCOME_LABEL[c.outcome]} (latest of ${c.n} sum${c.n > 1 ? "s" : ""})`}
                          className={`inline-flex h-8 min-w-10 items-center justify-center rounded-md border-2 px-1.5 font-black ${CELL[c.outcome].cls}`}
                        >
                          {CELL[c.outcome].glyph}
                          {c.n > 1 && <sub className="ml-0.5 text-[10px] font-bold">{c.n}</sub>}
                        </span>
                      ) : (
                        <span className="text-kohl/20">–</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// First-try share per session, oldest to newest. Gaps where nothing was checkable.
function Sparkline({ trend }: { trend: (number | null)[] }) {
  const pts = trend.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v !== null);
  if (pts.length === 0) return <span className="text-[12px] text-muted">–</span>;
  const w = 72,
    h = 24,
    n = Math.max(1, trend.length - 1);
  const xy = (p: { v: number; i: number }) => [trend.length === 1 ? w / 2 : (p.i / n) * (w - 8) + 4, h - 4 - p.v * (h - 8)];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-6 w-[72px]" aria-label={`first try per session: ${pts.map((p) => Math.round(p.v * 100) + "%").join(", ")}`}>
      <line x1="2" x2={w - 2} y1={h - 4} y2={h - 4} stroke="#161513" strokeOpacity="0.15" />
      {pts.length > 1 && <polyline points={pts.map((p) => xy(p).join(",")).join(" ")} fill="none" stroke="#C83A22" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
      {pts.map((p) => {
        const [x, y] = xy(p);
        return <circle key={p.i} cx={x} cy={y} r="3" fill="#C83A22" stroke="#fff" strokeWidth="1.5" />;
      })}
    </svg>
  );
}

function Roster({ rows, onOpen, openId }: { rows: StudentRow[]; onOpen: (id: string) => void; openId: string | null }) {
  const sorted = [...rows].sort((a, b) => (b.lastActive ?? 0) - (a.lastActive ?? 0) || a.student.name.localeCompare(b.student.name));
  return (
    <section className="mt-8">
      <Title hand="poori class">Every student</Title>
      <div className="overflow-x-auto rounded-window border-[2.5px] border-kohl bg-white shadow-hard">
        <table className="w-full min-w-[720px] border-collapse text-[14px]">
          <thead>
            <tr className="border-b-2 border-kohl bg-paper text-left text-[12px] font-bold tracking-wide text-muted uppercase">
              <th className="px-4 py-2.5">Student</th>
              <th className="px-2 py-2.5">Last practice</th>
              <th className="px-2 py-2.5 text-right">Solved</th>
              <th className="px-2 py-2.5 text-right">First try</th>
              <th className="px-2 py-2.5">Trend</th>
              <th className="px-2 py-2.5">Top mistake</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.student.id} className={`border-b border-dashed border-kohl/20 last:border-0 ${openId === r.student.id ? "bg-peela/40" : ""}`}>
                <td className="px-4 py-2.5">
                  <span className="font-display text-[16px] font-black">{r.student.name}</span>
                  {r.student.roll && <span className="ml-2 text-[12px] text-muted">roll {r.student.roll}</span>}
                  {r.attention && <span className="mt-0.5 block text-[12px] font-semibold text-red-pen">⚑ {r.attention}</span>}
                </td>
                <td className="px-2 py-2.5 text-muted">
                  {ago(r.lastActive)}
                  {r.sessions > 0 && <span className="block text-[12px]">{r.sessions} session{r.sessions > 1 ? "s" : ""} · {r.minutes} min</span>}
                </td>
                <td className="px-2 py-2.5 text-right font-display font-black">{r.attempted ? `${r.solved}/${r.attempted}` : "–"}</td>
                <td className="px-2 py-2.5 text-right font-display font-black">{r.firstTryRate === null ? "–" : `${Math.round(r.firstTryRate * 100)}%`}</td>
                <td className="px-2 py-2.5">
                  <Sparkline trend={r.trend} />
                </td>
                <td className="px-2 py-2.5">
                  {r.topMistake ? (
                    <span className="font-hand text-[16px] leading-tight font-bold">
                      {r.topMistake.label} <span className="text-red-pen">×{r.topMistake.count}</span>
                    </span>
                  ) : r.attempted ? (
                    <span className="text-muted">none</span>
                  ) : (
                    ""
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {r.sessions > 0 && (
                    <button onClick={() => onOpen(r.student.id)} className="rounded-control border-2 border-kohl bg-paper px-3 py-1.5 text-[13px] font-black hover:bg-peela">
                      Open
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StudentPanel({ row, sessions, onClose }: { row: StudentRow; sessions: SessionDoc[]; onClose: () => void }) {
  const sorted = [...sessions].sort((a, b) => b.report.t0 - a.report.t0);
  const merged = mergeReports(sorted.map((s) => s.report));
  const sum = merged ? summarize(merged) : null;

  const openReport = async (s: SessionDoc) => {
    const w = window.open("", "_blank");
    const enc = await encodeReport({ ...s.report, nm: row.student.name });
    if (w) w.location.href = `/report#r=${enc}`;
  };

  useEffect(() => {
    document.getElementById("student-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [row.student.id]);

  return (
    <section id="student-panel" className="mt-8 scroll-mt-4">
      <Card className="overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b-[2.5px] border-kohl bg-rabar-wash px-5 py-4 md:px-7">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] uppercase">Student{row.student.roll ? ` · roll ${row.student.roll}` : ""}</p>
            <h2 className="font-display text-[30px] leading-none font-black [font-stretch:115%]">{row.student.name}</h2>
            <p className="mt-1 text-[13px] text-muted">
              Joined {new Date(row.student.joined).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {row.sessions} session{row.sessions === 1 ? "" : "s"} ·{" "}
              {row.minutes} min practice
            </p>
          </div>
          <Button onClick={onClose} className="px-3 py-1.5 text-[13px]">
            Close
          </Button>
        </div>

        <div className="grid gap-6 px-5 py-5 md:grid-cols-2 md:px-7">
          <div>
            <h3 className="font-hand text-lg font-bold text-red-pen">Mistakes</h3>
            {!sum || sum.mistakes.length === 0 ? (
              <p className="mt-1 text-[15px] text-muted">{sum?.wrongSteps ? "Mistakes were made, but none had a known type." : "No mistakes so far."}</p>
            ) : (
              <ul className="mt-2 grid gap-3">
                {sum.mistakes.map((m) => (
                  <li key={m.id} className="border-b border-dashed border-kohl/20 pb-2 last:border-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-hand text-[19px] leading-tight font-bold">{m.label}</p>
                      <span className="shrink-0 font-display text-sm font-black">×{m.count}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3">
                      <Tally count={m.count} />
                      <span className="text-[12px] text-muted">{m.fixed === m.count ? "put right later" : m.fixed ? `${m.fixed} of ${m.count} put right` : "not put right yet"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {sum && sum.strengths.length > 0 && (
              <>
                <h3 className="mt-4 font-hand text-lg font-bold text-red-pen">Strong at</h3>
                <p className="mt-1 text-[15px]">{sum.strengths.map((s) => s.topic).join(" · ")}</p>
              </>
            )}
          </div>
          <div>
            <h3 className="font-hand text-lg font-bold text-red-pen">Sessions</h3>
            <ul className="mt-2 grid gap-2">
              {sorted.map((s) => {
                const ss = summarize(s.report);
                return (
                  <li key={s.id} className="rounded-control border-2 border-kohl bg-white px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-display text-[15px] font-black">
                          {new Date(s.report.t0).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                          {new Date(s.report.t0).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                        </p>
                        <p className="text-[12px] text-muted">
                          {ss.solved}/{ss.attempted} solved · {ss.wrongSteps} mistake{ss.wrongSteps === 1 ? "" : "s"} · {formatDuration(ss.durationMs)}
                        </p>
                      </div>
                      <button onClick={() => void openReport(s)} className="shrink-0 rounded-control border-2 border-kohl bg-peela px-3 py-1.5 text-[13px] font-black">
                        Report →
                      </button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.report.qs.map((q, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 text-[13px]">
                          <span className="font-semibold">{q.q ? pretty(q.q) : "free practice"}</span>
                          <Stamp outcome={ss.outcomes[i]} className="scale-75" />
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </Card>
    </section>
  );
}

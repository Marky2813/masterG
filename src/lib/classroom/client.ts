"use client";

// The kid's side of a class: which class this device joined (localStorage), and the sync that sends
// this session's report (src/lib/report/recorder.ts) to the teacher while the kid works.
// Not in a class: nothing is sent and /learn works exactly as before.
import { bus } from "../bus";
import { getSessionId } from "../log/client";
import { dropIds } from "../report/model";
import { snapshot } from "../report/recorder";

export const MEMBER_KEY = "masterg.class.member";
export const TEACHER_KEY = "masterg.class.teacher"; // classes this browser created: [{ code, name, key }]

export interface Membership {
  code: string;
  className: string;
  studentId: string;
  name: string;
  roll?: string;
}

export function getMembership(): Membership | null {
  try {
    const m = JSON.parse(localStorage.getItem(MEMBER_KEY) ?? "null") as Membership | null;
    return m && m.code && m.studentId ? m : null;
  } catch {
    return null;
  }
}

export function setMembership(m: Membership | null): void {
  try {
    if (m) localStorage.setItem(MEMBER_KEY, JSON.stringify(m));
    else localStorage.removeItem(MEMBER_KEY);
  } catch {}
}

export interface TeacherClass {
  code: string;
  name: string;
  key: string;
}

export function teacherClasses(): TeacherClass[] {
  try {
    const list = JSON.parse(localStorage.getItem(TEACHER_KEY) ?? "[]") as TeacherClass[];
    return Array.isArray(list) ? list.filter((c) => c && c.code && c.key) : [];
  } catch {
    return [];
  }
}

export function rememberTeacherClass(c: TeacherClass): void {
  try {
    const rest = teacherClasses().filter((x) => x.code !== c.code);
    localStorage.setItem(TEACHER_KEY, JSON.stringify([c, ...rest]));
  } catch {}
}

export type SyncState = { kind: "off" } | { kind: "saved"; at: number } | { kind: "error"; message: string };

// Sends the report when it changes: soon after each checked step, every 15 s as a backstop, and
// once more (sendBeacon) when the tab is hidden or closed. Returns a stop function.
export function startClassSync(onState: (s: SyncState) => void = () => {}): () => void {
  const m = getMembership();
  if (!m) {
    onState({ kind: "off" });
    return () => {};
  }
  const url = `/api/class/${m.code}/session`;
  let last = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  const body = () => {
    const r = snapshot();
    if (!r || !r.qs.length) return null;
    const json = JSON.stringify({ studentId: m.studentId, sessionId: getSessionId(), report: { ...r, nm: m.name } }, dropIds);
    return json === last ? null : json;
  };

  const send = async () => {
    const json = body();
    if (!json) return;
    try {
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: json, keepalive: true });
      if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? `HTTP ${res.status}`);
      last = json;
      onState({ kind: "saved", at: Date.now() });
    } catch (e) {
      onState({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  };

  const soon = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void send(), 2000);
  };

  const beacon = () => {
    const json = body();
    if (json && navigator.sendBeacon?.(url, new Blob([json], { type: "application/json" }))) last = json;
  };
  const onHide = () => {
    if (document.visibilityState === "hidden") beacon();
  };

  const offs = [bus.on("verdict", soon), bus.on("questionConfirmed", soon), bus.on("clusterRemoved", soon)];
  const every = setInterval(() => void send(), 15000);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", beacon);
  return () => {
    offs.forEach((off) => off());
    clearInterval(every);
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", beacon);
  };
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClassInfo } from "@/lib/classroom/model";
import { rememberTeacherClass, teacherClasses, type TeacherClass } from "@/lib/classroom/client";
import { Button, Card, Field, H1, Shell, inputCls } from "./ui";

// /teacher: make a class (no account: the private dashboard link is the login) and reopen classes
// made on this browser.
export default function TeacherHome() {
  const [mine, setMine] = useState<TeacherClass[]>([]);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [school, setSchool] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    setMine(teacherClasses());
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/class", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, grade, school }) });
      const json = (await res.json()) as { info?: ClassInfo; key?: string; error?: string };
      if (!res.ok || !json.info || !json.key) throw new Error(json.error ?? `HTTP ${res.status}`);
      rememberTeacherClass({ code: json.info.code, name: json.info.name, key: json.key });
      window.location.href = `/teacher/${json.info.code}#k=${json.key}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Shell tagline="for the teacher">
      <Card tone="peela" className="px-5 py-6 md:px-7">
        <H1 kicker="Teacher">Your class, practising at home</H1>
        <p className="mt-3 max-w-[52ch] text-[15px] leading-relaxed">
          Make a class and share its code. Each child practises with Masterji at home; you see every child&apos;s progress, the mistakes the class shares, and what to
          reteach.
        </p>
      </Card>

      <Card className="mt-6 px-5 py-6 md:px-7">
        <h2 className="font-display text-[22px] font-black [font-stretch:112%]">Make a class</h2>
        <form onSubmit={create} className="mt-4 grid gap-4">
          <Field label="Class name">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="6B Maths" maxLength={50} className={inputCls} />
          </Field>
          <div className="grid grid-cols-[7rem_1fr] gap-4">
            <Field label="Class (1–8)">
              <input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="6" inputMode="numeric" maxLength={10} className={inputCls} />
            </Field>
            <Field label="School (optional)">
              <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="school name" maxLength={60} className={inputCls} />
            </Field>
          </div>
          {error && <p className="text-sm font-semibold text-red-pen">Couldn&apos;t make the class: {error}</p>}
          <Button type="submit" tone="kohl" disabled={busy || !name.trim()} className="justify-self-start">
            {busy ? "Making…" : "Make class →"}
          </Button>
        </form>
      </Card>

      {mine.length > 0 && (
        <Card tone="white" className="mt-6 px-5 py-6 md:px-7">
          <h2 className="font-display text-[22px] font-black [font-stretch:112%]">Your classes</h2>
          <p className="mt-1 text-[13px] text-muted">Classes made on this browser. Keep the dashboard link safe: it is your key to the class.</p>
          <ul className="mt-4 grid gap-2">
            {mine.map((c) => (
              <li key={c.code}>
                <Link
                  href={`/teacher/${c.code}#k=${c.key}`}
                  className="flex items-center justify-between gap-3 rounded-control border-2 border-kohl bg-paper px-4 py-3 transition hover:bg-peela"
                >
                  <span className="font-display text-[18px] font-black">{c.name}</span>
                  <span className="font-mono text-[15px] font-bold tracking-[0.2em]">{c.code}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Shell>
  );
}

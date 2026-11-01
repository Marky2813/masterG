"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { normalizeCode, type Student } from "@/lib/classroom/model";
import { getMembership, setMembership, type Membership } from "@/lib/classroom/client";
import { Button, Card, Field, H1, Shell, inputCls } from "./ui";

type ClassName = { code: string; name: string; grade?: string; school?: string };

// /join?c=CODE: the child (or a parent) types the name once; this device remembers the student id,
// and every practice session on /learn goes to the teacher from then on.
export default function JoinClass() {
  const [code, setCode] = useState("");
  const [found, setFound] = useState<ClassName | null>(null);
  const [lookup, setLookup] = useState<"idle" | "busy" | "missing">("idle");
  const [name, setName] = useState("");
  const [roll, setRoll] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [current, setCurrent] = useState<Membership | null>(null);

  useEffect(() => {
    const c = normalizeCode(new URLSearchParams(window.location.search).get("c") ?? "");
    const m = getMembership();
    /* eslint-disable react-hooks/set-state-in-effect -- URL and localStorage are only readable after mount */
    setCurrent(m);
    if (m) {
      setName(m.name);
      setRoll(m.roll ?? "");
    }
    if (c) setCode(c);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (code.length !== 6) {
      setFound(null); // eslint-disable-line react-hooks/set-state-in-effect -- reset when the code is edited
      setLookup("idle");
      return;
    }
    let alive = true;
    setLookup("busy");
    fetch(`/api/class/${code}`)
      .then(async (r) => (r.ok ? ((await r.json()) as ClassName) : null))
      .then((c) => {
        if (!alive) return;
        setFound(c);
        setLookup(c ? "idle" : "missing");
      })
      .catch(() => alive && setLookup("missing"));
    return () => {
      alive = false;
    };
  }, [code]);

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!found) return;
    setBusy(true);
    setError("");
    try {
      const sameClass = current?.code === found.code ? current.studentId : undefined;
      const res = await fetch(`/api/class/${found.code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, roll, studentId: sameClass }),
      });
      const json = (await res.json()) as { student?: Student; error?: string };
      if (!res.ok || !json.student) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMembership({ code: found.code, className: found.name, studentId: json.student.id, name: json.student.name, roll: json.student.roll });
      window.location.href = "/learn";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  const leave = () => {
    setMembership(null);
    setCurrent(null);
  };

  return (
    <Shell>
      <Card tone="peela" className="px-5 py-6 md:px-7">
        <H1 kicker="Join your class">Practise with Masterji, and your teacher sees how you did</H1>
      </Card>

      {current && (
        <Card tone="white" className="mt-6 px-5 py-4 md:px-7">
          <p className="text-[15px]">
            This device is in <b>{current.className}</b> as <b>{current.name}</b>.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/learn" className="rounded-control border-[2.5px] border-kohl bg-peela px-4 py-2.5 font-display text-[15px] font-black shadow-hard-sm">
              Open the notebook →
            </Link>
            <Button onClick={leave}>Leave this class</Button>
          </div>
        </Card>
      )}

      <Card className="mt-6 px-5 py-6 md:px-7">
        <form onSubmit={join} className="grid gap-5">
          <Field label="Class code (from your teacher)">
            <input
              value={code}
              onChange={(e) => setCode(normalizeCode(e.target.value))}
              placeholder="ABC234"
              autoCapitalize="characters"
              className={`${inputCls} font-mono tracking-[0.3em] uppercase`}
            />
          </Field>
          {lookup === "busy" && <p className="-mt-2 text-sm text-muted">Looking for the class…</p>}
          {lookup === "missing" && <p className="-mt-2 text-sm font-semibold text-red-pen">No class with this code. Check it with your teacher.</p>}
          {found && (
            <p className="-mt-2 flex items-center gap-2 font-hand text-[20px] font-bold text-red-pen">
              ✓ {found.name}
              {found.grade ? ` · Class ${found.grade}` : ""}
              {found.school ? ` · ${found.school}` : ""}
            </p>
          )}
          <div className="grid grid-cols-[1fr_6rem] gap-4">
            <Field label="Your name">
              <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Aarav" maxLength={40} className={inputCls} />
            </Field>
            <Field label="Roll no.">
              <input value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="12" maxLength={10} className={inputCls} />
            </Field>
          </div>
          {error && <p className="text-sm font-semibold text-red-pen">Couldn&apos;t join: {error}</p>}
          <Button type="submit" tone="kohl" disabled={!found || !name.trim() || busy} className="justify-self-start">
            {busy ? "Joining…" : "Join and start →"}
          </Button>
          <p className="text-[12px] leading-snug text-muted">
            Your teacher will see the sums you practise, each step Masterji checked, and the mistakes. Your teacher does not see or hear what you say to Masterji.
          </p>
        </form>
      </Card>
    </Shell>
  );
}

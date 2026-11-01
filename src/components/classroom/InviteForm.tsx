"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Card, Field, H1, Shell, inputCls } from "./ui";

// /invite?next=/learn: the hosted site is invite-only for now. One code; the server keeps it.
export default function InviteForm() {
  const next = useSearchParams().get("next") || "/learn";
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/invite", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code }) });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      window.location.href = next.startsWith("/") && !next.startsWith("//") ? next : "/learn";
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setBusy(false);
    }
  };

  return (
    <Shell>
      <Card tone="peela" className="px-5 py-6 md:px-7">
        <H1 kicker="Early access">MasterG is invite-only for now</H1>
        <p className="mt-3 text-[15px] leading-relaxed">Enter the invite code you were given. You only need to do this once on this device.</p>
      </Card>
      <Card className="mt-6 px-5 py-6 md:px-7">
        <form onSubmit={submit} className="grid gap-5">
          <Field label="Invite code">
            <input value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoCapitalize="none" autoComplete="off" className={inputCls} aria-label="Invite code" />
          </Field>
          {error && <p className="text-sm font-semibold text-red-pen">{error}</p>}
          <Button type="submit" tone="kohl" disabled={busy || !code.trim()} className="justify-self-start">
            {busy ? "Checking…" : "Continue →"}
          </Button>
        </form>
      </Card>
    </Shell>
  );
}

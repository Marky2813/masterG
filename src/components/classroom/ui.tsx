import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/landing/Brand";

// Shared look for /teacher and /join: the landing page's paper, kohl borders and hard shadows.

export function Shell({ children, tagline = "your maths teacher's assistant at home", wide = false }: { children: ReactNode; tagline?: string; wide?: boolean }) {
  return (
    <main className="report-page min-h-screen w-full bg-kagaz font-body text-kohl">
      <div className={`mx-auto px-4 pt-5 pb-16 ${wide ? "max-w-[1120px]" : "max-w-[640px]"}`}>
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark className="size-9" />
            <span className="font-display text-[20px] leading-none font-black tracking-tight whitespace-nowrap [font-stretch:112%]">Master G</span>
          </Link>
          <span className="text-right font-hand text-[15px] leading-tight font-bold text-red-pen md:text-[17px]">{tagline}</span>
        </header>
        {children}
      </div>
    </main>
  );
}

export function Card({ children, className = "", tone = "paper" }: { children: ReactNode; className?: string; tone?: "paper" | "white" | "peela" | "rabar" }) {
  const bg = { paper: "bg-paper", white: "bg-white", peela: "bg-peela", rabar: "bg-rabar-wash" }[tone];
  return <section className={`rounded-window border-[2.5px] border-kohl ${bg} shadow-hard ${className}`}>{children}</section>;
}

export function Button({
  children,
  onClick,
  disabled,
  tone = "white",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "white" | "peela" | "kohl" | "green";
  type?: "button" | "submit";
  className?: string;
}) {
  const bg = { white: "bg-white", peela: "bg-peela", kohl: "bg-kohl text-paper", green: "bg-[#25D366]" }[tone];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-control border-[2.5px] border-kohl px-4 py-2.5 font-display text-[15px] font-black shadow-hard-sm transition-[transform,box-shadow] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:opacity-50 ${bg} ${className}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-[12px] font-bold tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}

export const inputCls =
  "w-full min-w-0 border-b-2 border-dashed border-kohl/40 bg-transparent px-1 font-hand text-[24px] leading-tight font-bold text-kohl outline-none placeholder:font-normal placeholder:text-kohl/30 focus:border-red-pen";

export function H1({ children, kicker }: { children: ReactNode; kicker?: string }) {
  return (
    <div>
      {kicker && <p className="text-xs font-bold tracking-[0.14em] uppercase">{kicker}</p>}
      <h1 className="mt-1 font-display text-[clamp(28px,7vw,44px)] leading-[0.95] font-black tracking-[-0.01em] [font-stretch:118%]">{children}</h1>
    </div>
  );
}

export const ago = (t: number | null, now = Date.now()) => {
  if (t === null) return "never";
  const m = Math.round((now - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
};

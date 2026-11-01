"use client";

import type React from "react";
import { EQUALS_FACE, FACES } from "./faces";

// All the landing page's motion in one place: the cube's own drift / hover / drag / roll loop,
// the scroll story (the cube "rig" glides from the hero into the lesson corner, the notebook
// writes one line per scroll step), the sideways tools strip and the header progress bar.
// It is a plain object, not a hook: rAF loops and pointer handlers read the latest values from
// `s` synchronously, and push what the page renders through `push` (a React state setter).

export interface View {
  face: number;
  rollX: number; // committed cube angles (deg)
  rollY: number;
  dragging: boolean;
  free: boolean; // the rAF loop owns the cube's transform; fx/fy are the frozen base angles
  fx: string;
  fy: string;
  tx: number; // pointer offset over the stage, -0.5..0.5
  ty: number;
  w: number[]; // hero headline weights, one per line
  step: number; // lesson line 1..5
  react: "" | "nod" | "shake";
  rk: boolean; // flips so the same reaction can replay
}

export const INITIAL_VIEW: View = {
  face: 0,
  rollX: 0,
  rollY: 0,
  dragging: false,
  free: false,
  fx: "0",
  fy: "0",
  tx: 0,
  ty: 0,
  w: [800, 800, 800, 800],
  step: 1,
  react: "",
  rk: false,
};

type ElKey = "root" | "stage" | "rig" | "fade" | "story" | "navProg" | "fSec" | "fPin" | "fTrack" | "hProg" | "turn";
type Loop = { ax: number; ay: number; vx: number; vy: number; tvx: number; tvy: number; bx: number; by: number; mode: "idle" | "hover" | "hold" | "drag"; holdUntil: number; rollDone: number; last: number; raf: number };
type Targets = Partial<Record<"nav" | "x" | "y" | "s" | "fade" | "strip" | "sp", number>> & { stripOn?: boolean };

const NAV = 84; // header height
const STEPS = 5;
const IDLE_X = 14; // deg/s, the slow drift it does on its own
const IDLE_Y = 20;
const cl = (x: number) => Math.max(0, Math.min(1, x));
const viewH = () => Math.min(window.innerHeight || 800, 1100);

export class LandingMotion {
  s: View;
  private push: (v: View) => void;
  private el: Partial<Record<ElKey, HTMLElement | null>> = {};
  private refFns = new Map<ElKey, (e: HTMLElement | null) => void>();
  private m: Loop | null = null;
  private drag: { x: number; y: number; sx: number; sy: number; moved: boolean; lx: number; ly: number } | null = null;
  private craf = 0;
  private praf = 0;
  private sraf = 0;
  private glideRaf = 0;
  private tg: Targets = {};
  private cur: Targets = {};
  private lastY: number | undefined;
  private dir: "up" | "down" = "down";
  private inStory = false;
  private reduced = false;
  private mql: MediaQueryList | null = null;

  constructor(initial: View, push: (v: View) => void) {
    this.s = initial;
    this.push = push;
  }

  set(p: Partial<View>) {
    this.s = { ...this.s, ...p };
    this.push(this.s);
  }

  /** Stable callback ref for one of the elements the motion drives. */
  ref(key: ElKey) {
    let f = this.refFns.get(key);
    if (!f) {
      f = (e: HTMLElement | null) => {
        this.el[key] = e;
      };
      this.refFns.set(key, f);
    }
    return f;
  }

  mount() {
    this.mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reduced = this.mql.matches;
    this.mql.addEventListener("change", this.onReducedChange);
    this.lastY = undefined;
    this.inStory = false;
    this.startMotion();
    window.addEventListener("scroll", this.onScroll, { passive: true });
    window.addEventListener("resize", this.onScroll);
    this.measure();
    document.fonts?.ready.then(() => {
      if (this.m) this.measure();
    });
  }

  unmount() {
    if (this.m) cancelAnimationFrame(this.m.raf);
    this.m = null;
    for (const r of [this.craf, this.praf, this.sraf, this.glideRaf]) if (r) cancelAnimationFrame(r);
    this.craf = this.praf = this.sraf = this.glideRaf = 0;
    window.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onScroll);
    this.mql?.removeEventListener("change", this.onReducedChange);
  }

  private onReducedChange = () => {
    this.reduced = !!this.mql?.matches;
  };

  private onScroll = () => {
    if (this.sraf) return;
    this.sraf = requestAnimationFrame(() => {
      this.sraf = 0;
      this.measure();
    });
  };

  // ---- the cube's motion loop ----

  private turnEl() {
    return this.el.turn ?? null;
  }

  private freeze() {
    const m = this.m;
    if (!m) return;
    const st = this.s;
    m.bx = st.rollX - 14;
    m.by = st.rollY + 24;
    m.ax = 0;
    m.ay = 0;
    const fx = m.bx - st.ty * 24;
    const fy = m.by + st.tx * 30;
    this.set({ free: true, fx: fx.toFixed(1), fy: fy.toFixed(1) });
  }

  // One loop drives the cube: a gentle drift on its own, faster towards the cursor while it is on
  // a face, and a short hold after a roll or drag so the question can be read.
  private startMotion() {
    const m: Loop = { ax: 0, ay: 0, vx: 0, vy: 0, tvx: IDLE_X, tvy: IDLE_Y, bx: 0, by: 0, mode: "idle", holdUntil: 0, rollDone: 0, last: performance.now(), raf: 0 };
    this.m = m;
    this.freeze();
    const step = (now: number) => {
      if (this.m !== m) return;
      const dt = Math.min(0.05, (now - m.last) / 1000);
      m.last = now;
      if (m.mode === "hold") {
        if (now >= m.holdUntil) {
          m.mode = "idle";
          m.vx = 0;
          m.vy = 0;
          this.freeze();
        }
      } else if (m.mode !== "drag") {
        if (m.mode === "idle") {
          m.tvx = this.reduced ? 0 : IDLE_X;
          m.tvy = this.reduced ? 0 : IDLE_Y;
        }
        const ease = Math.min(1, dt * (m.mode === "hover" ? 3.5 : 1.4));
        m.vx += (m.tvx - m.vx) * ease;
        m.vy += (m.tvy - m.vy) * ease;
        m.ax += m.vx * dt;
        m.ay += m.vy * dt;
        const el = this.turnEl();
        if (el && this.s.free) {
          const s = this.s;
          el.style.transform = `rotateX(${(m.bx - s.ty * 24 + m.ax).toFixed(2)}deg) rotateY(${(m.by + s.tx * 30 + m.ay).toFixed(2)}deg)`;
        }
      }
      m.raf = requestAnimationFrame(step);
    };
    m.raf = requestAnimationFrame(step);
  }

  private hoverCube(e: React.PointerEvent<HTMLElement>) {
    const m = this.m;
    if (!m || m.mode === "drag" || this.reduced) return;
    const target = e.target as HTMLElement | null;
    const onCube = (!e.pointerType || e.pointerType === "mouse") && target?.closest?.(".face");
    if (!onCube) {
      if (m.mode === "hover") m.mode = "idle";
      return;
    }
    const now = performance.now();
    if (m.mode === "hold") {
      if (now < m.rollDone) return; // let the landing finish first
      m.mode = "hover";
      m.vx = 0;
      m.vy = 0;
      this.freeze();
    }
    const r = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 110));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / 110));
    const MAX = 110; // deg/s at the cube's edge: calm but clearly moving
    m.mode = "hover";
    m.tvx = -ny * MAX;
    m.tvy = nx * MAX;
  }

  // Fold the loop's free rotation into the committed angles.
  private takeOffset() {
    const st = this.s;
    const m = this.m;
    let x = st.rollX;
    let y = st.rollY;
    if (m && st.free) {
      x += m.ax;
      y += m.ay;
      m.ax = m.ay = m.vx = m.vy = 0;
    }
    return { x, y };
  }

  private holdFor(ms: number) {
    const m = this.m;
    if (!m) return;
    const now = performance.now();
    m.mode = "hold";
    m.rollDone = now + 1200;
    m.holdUntil = now + ms;
  }

  /** Roll to a different random face (tap, Enter/Space, "Roll again"). */
  roll = () => {
    if (this.inStory) return;
    const cur = this.s.face;
    let next = cur;
    while (next === cur) next = Math.floor(Math.random() * FACES.length);
    const f = FACES[next];
    const c = this.takeOffset();
    this.holdFor(1200 + 2800);
    this.set({
      face: next,
      dragging: false,
      free: false,
      rollX: (Math.floor(c.x / 360) + 2) * 360 + f.x,
      rollY: (Math.floor(c.y / 360) + 2) * 360 + f.y,
    });
  };

  // After a drag: snap to the nearest face and pick its question.
  private snap(lx: number, ly: number) {
    const rx = Math.round(lx / 90) * 90;
    const ry = Math.round(ly / 90) * 90;
    const n = (a: number) => ((a % 360) + 360) % 360;
    const x = n(rx);
    const y = n(ry);
    let sym: string;
    if (x === 270) sym = "=";
    else if (x === 90) sym = "%";
    else {
      const t = x === 0 ? n(-y) : n(180 - y);
      sym = ({ 0: "+", 90: "×", 180: "−", 270: "÷" } as Record<number, string>)[t];
    }
    const idx = FACES.findIndex((f) => f.sym === sym);
    this.holdFor(1200 + 2400);
    this.set({ rollX: rx, rollY: ry, face: idx < 0 ? 0 : idx, dragging: false, free: false });
  }

  // ---- pointer and keyboard handlers ----

  onStageMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.pointerType === "touch" || this.inStory || this.reduced) return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top) / r.height;
    if (this.praf) return;
    this.praf = requestAnimationFrame(() => {
      this.praf = 0;
      const base = 260 + nx * 1.3 * 560;
      const row = ny * 5 - 0.8;
      const next = [0, 1, 2, 3].map((i) => Math.round(Math.max(250, Math.min(800, base + 200 - Math.abs(i - row) * 160)) / 10) * 10);
      const p: Partial<View> = { tx: nx - 0.5, ty: ny - 0.5 };
      if (next.some((x, i) => Math.abs(x - this.s.w[i]) > 20)) p.w = next;
      this.set(p);
    });
  };

  onStageLeave = () => this.set({ tx: 0, ty: 0, w: [800, 800, 800, 800] });

  onCubeDown = (e: React.PointerEvent<HTMLElement>) => {
    if (this.inStory) return;
    const c = this.takeOffset();
    if (this.m) this.m.mode = "drag";
    if (this.s.free) this.set({ free: false, dragging: true, rollX: c.x, rollY: c.y });
    this.drag = { x: e.clientX, y: e.clientY, sx: c.x, sy: c.y, moved: false, lx: c.x, ly: c.y };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* pointer already gone */
    }
  };

  onCubeMove = (e: React.PointerEvent<HTMLElement>) => {
    const d = this.drag;
    if (!d) {
      this.hoverCube(e);
      return;
    }
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
    d.moved = true;
    d.lx = d.sx - dy * 0.6;
    d.ly = d.sy + dx * 0.6;
    if (this.craf) return;
    this.craf = requestAnimationFrame(() => {
      this.craf = 0;
      this.set({ dragging: true, free: false, rollX: d.lx, rollY: d.ly });
    });
  };

  onCubeUp = () => {
    const d = this.drag;
    this.drag = null;
    if (this.craf) {
      cancelAnimationFrame(this.craf);
      this.craf = 0;
    }
    if (!d) return;
    if (d.moved) this.snap(d.lx, d.ly);
    else this.roll();
  };

  onCubeLeave = () => {
    const m = this.m;
    if (m && m.mode === "hover") m.mode = "idle";
  };

  onCubeKey = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.roll();
    }
  };

  // ---- scroll: rig glide, lesson steps, sideways strip, progress bar ----

  private measure() {
    const ui = this.el;
    const vh = viewH();
    const vw = window.innerWidth || 1200;
    const de = document.documentElement;
    const y = window.scrollY || de.scrollTop || 0;
    const tg = this.tg;
    const up = this.lastY !== undefined && y < this.lastY - 0.5;
    const down = this.lastY === undefined || y > this.lastY + 0.5;
    this.lastY = y;
    if (up) this.dir = "up";
    else if (down) this.dir = "down";
    if (ui.root) {
      ui.root.classList.toggle("scroll-up", this.dir === "up");
      if (this.dir !== "up")
        ui.root.querySelectorAll(".wt-scroll:not(.done),.cta-a:not(.done),.cta-b:not(.done),.reveal:not(.done),.reveal-draw:not(.done)").forEach((el) => {
          if (el.getBoundingClientRect().top < vh * 0.5) el.classList.add("done");
        });
    }
    tg.nav = cl(y / Math.max(1, de.scrollHeight - vh));
    let enter = 0;
    let sp = 0;
    if (ui.story) {
      const r = ui.story.getBoundingClientRect();
      enter = cl((vh - r.top) / (vh - NAV));
      sp = cl((NAV - r.top) / Math.max(1, r.height - (vh - NAV)));
    }
    // the cube glides from the hero to the corner of the lesson
    const kr = cl((enter - 0.15) / 0.75);
    const k = kr * kr * (3 - 2 * kr);
    const mob = vw < 900;
    const W = ui.stage ? ui.stage.clientWidth : vw;
    const H = ui.stage ? ui.stage.clientHeight : vh;
    // [x, y, scale] as fractions of the stage: hero spot, lesson corner
    const hp = mob ? [0.83, 0.12, 0.32] : [0.72, 0.47, 1];
    const lp = mob ? [0.88, 0.1, 0.24] : [0.8, 0.25, 0.6];
    if (this.dir === "up") {
      const at = k > 0.5 ? lp : hp;
      tg.x = at[0] * W - 235;
      tg.y = at[1] * H - 235;
      tg.s = at[2];
      tg.fade = k > 0.5 ? 0 : 1;
    } else {
      tg.x = (hp[0] + (lp[0] - hp[0]) * k) * W - 235;
      tg.y = (hp[1] + (lp[1] - hp[1]) * k) * H - 235;
      tg.s = hp[2] + (lp[2] - hp[2]) * k;
      tg.fade = Math.max(0, 1 - k * 2.2);
    }
    if (k > 0.5 && !this.inStory) {
      this.inStory = true;
      this.enterStory();
    }
    if (k <= 0.5 && this.inStory) {
      this.inStory = false;
      this.exitStory();
    }
    const st = this.s;
    let step = Math.max(1, Math.min(STEPS, 1 + Math.floor(sp * 5.4)));
    // going back up: keep what is already written; replay only after leaving the lesson below
    if (this.dir === "up" && enter > 0.02) step = Math.max(st.step, step);
    if (step !== st.step) {
      const p: Partial<View> = { step };
      if (this.inStory && this.dir !== "up") {
        p.react = step === 4 ? "shake" : "nod";
        p.rk = !st.rk;
      }
      this.set(p);
    }
    // sideways strip (desktop); on phones it is a plain column
    if (ui.fSec && ui.fTrack && ui.fPin) {
      if (vw > 900) {
        const maxX = Math.max(0, ui.fTrack.scrollWidth - ui.fPin.clientWidth);
        const want = Math.round(maxX + vh - NAV + 40);
        if (Math.abs(ui.fSec.offsetHeight - want) > 4) ui.fSec.style.height = want + "px";
        const r = ui.fSec.getBoundingClientRect();
        const p = cl((NAV - r.top) / Math.max(1, r.height - (vh - NAV)));
        if (this.dir !== "up" || tg.strip === undefined) {
          tg.strip = -p * maxX;
          tg.sp = p;
        }
        tg.stripOn = true;
      } else {
        ui.fSec.style.height = "";
        ui.fTrack.style.transform = "";
        tg.stripOn = false;
      }
    }
    this.glide();
  }

  private glide() {
    if (this.glideRaf) return;
    let last = performance.now();
    const step = (now: number) => {
      const ui = this.el;
      const tg = this.tg;
      const cur = this.cur;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // eased on the way down, direct on the way up (and always direct with reduced motion)
      const a = this.dir === "up" || this.reduced ? 1 : 1 - Math.pow(0.0006, dt);
      let moving = false;
      for (const key of ["nav", "x", "y", "s", "fade", "strip", "sp"] as const) {
        const t = tg[key];
        if (t === undefined) continue;
        const c = cur[key] ?? t;
        const d = t - c;
        let v = c + d * a;
        if (Math.abs(d) > (key === "x" || key === "y" || key === "strip" ? 0.3 : 0.0008)) moving = true;
        else v = t;
        cur[key] = v;
      }
      if (ui.navProg && cur.nav !== undefined) ui.navProg.style.transform = `scaleX(${cur.nav.toFixed(4)})`;
      if (ui.rig && cur.x !== undefined && cur.y !== undefined && cur.s !== undefined)
        ui.rig.style.transform = `translate3d(${cur.x.toFixed(2)}px,${cur.y.toFixed(2)}px,0) scale(${cur.s.toFixed(4)})`;
      if (ui.fade && cur.fade !== undefined) ui.fade.style.opacity = cur.fade.toFixed(3);
      if (tg.stripOn && ui.fTrack && cur.strip !== undefined) {
        ui.fTrack.style.transform = `translate3d(${cur.strip.toFixed(2)}px,0,0)`;
        if (ui.hProg && cur.sp !== undefined) ui.hProg.style.transform = `scaleX(${cur.sp.toFixed(4)})`;
      }
      this.glideRaf = moving ? requestAnimationFrame(step) : 0;
    };
    this.glideRaf = requestAnimationFrame(step);
  }

  // Turn to the '=' face for the fractions lesson and hold it there.
  private enterStory() {
    const c = this.takeOffset();
    this.holdFor(1e9);
    const f = FACES[EQUALS_FACE];
    this.set({
      face: EQUALS_FACE,
      dragging: false,
      free: false,
      rollX: (Math.floor(c.x / 360) + 1) * 360 + f.x,
      rollY: (Math.floor(c.y / 360) + 1) * 360 + f.y,
      tx: 0,
      ty: 0,
    });
  }

  private exitStory() {
    if (this.m) this.m.holdUntil = performance.now() + 600;
  }

  /** Rail buttons: scroll the lesson to line n. */
  goStep = (n: number) => {
    const story = this.el.story;
    if (!story) return;
    const vh = viewH();
    const r = story.getBoundingClientRect();
    const top = r.top + (window.scrollY || 0);
    const len = Math.max(1, r.height - (vh - NAV));
    window.scrollTo({ top: Math.round(top - NAV + ((n - 1 + 0.5) / 5.4) * len), behavior: this.reduced ? "auto" : "smooth" });
  };
}

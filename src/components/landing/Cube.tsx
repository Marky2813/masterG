"use client";

import { FACES } from "./faces";
import type { LandingMotion, View } from "./motion";

// The cube layer: sticky behind the hero and the lesson. The "rig" (cube + orbit + hint) is moved
// by LandingMotion from the hero spot into the lesson corner as you scroll.
const FACE_TRANSFORMS = ["translateZ(100px)", "rotateY(90deg) translateZ(100px)", "rotateY(180deg) translateZ(100px)", "rotateY(-90deg) translateZ(100px)", "rotateX(90deg) translateZ(100px)", "rotateX(-90deg) translateZ(100px)"];
const CHECK = "M3 16c4 2 7 6 9 10C16 16 23 8 31 3";
const sat = { border: "2.5px solid var(--color-kohl)", boxShadow: "3px 3px 0 var(--color-kohl-ink)", whiteSpace: "nowrap" } as const;

export default function Cube({ motion, view }: { motion: LandingMotion; view: View }) {
  const { free, fx, fy, rollX, rollY, tx, ty, dragging, react, rk, face } = view;
  const cubeX = free ? fx : (rollX - 14 - ty * 24).toFixed(1);
  const cubeY = free ? fy : (rollY + 24 + tx * 30).toFixed(1);
  const floatCls = react ? `r-${react}${rk ? "2" : ""}` : "";
  return (
    <div
      ref={motion.ref("stage")}
      onPointerMove={motion.onStageMove}
      onPointerLeave={motion.onStageLeave}
      style={{ position: "sticky", top: 0, height: "var(--vh)", marginBottom: "calc(var(--vh) * -1)", zIndex: 1, overflow: "hidden" }}
    >
      <div className="rig" ref={motion.ref("rig")}>
        <div className="drop" style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="rig-fade" ref={motion.ref("fade")} style={{ position: "absolute", inset: 0 }}>
            <div className="orbit" aria-hidden="true">
              <span className="sat" style={{ left: "50%", top: 0 }}>
                <span style={{ ...sat, display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "var(--color-paper)", borderRadius: "999px", padding: "6px 12px 6px 8px", fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: "18px", color: "var(--color-red-pen)" }}>
                  <svg width="22" height="20" viewBox="0 0 34 30" aria-hidden="true">
                    <path d={CHECK} fill="none" stroke="#C83A22" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Correct!
                </span>
              </span>
              <span className="sat" style={{ left: "93%", top: "75%" }}>
                <span style={{ ...sat, display: "inline-block", backgroundColor: "var(--color-rabar)", borderRadius: "4px", padding: "7px 10px", fontFamily: "var(--font-hand)", fontWeight: 700, fontSize: "16px", lineHeight: 1.05, color: "var(--color-kohl)", rotate: "4deg" }}>
                  Same mistake
                  <br />
                  again!
                </span>
              </span>
              <span className="sat" style={{ left: "7%", top: "75%" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "7px", backgroundColor: "var(--color-kohl)", color: "#FFFFFF", border: "2px solid var(--color-peela)", borderRadius: "999px", padding: "6px 12px", fontSize: "13px", fontWeight: 700, whiteSpace: "nowrap" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFE36E" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Watching
                </span>
              </span>
            </div>
            <span className="hint" aria-hidden="true">
              Roll it
              <br />
              or drag it!
              <svg width="58" height="54" viewBox="0 0 58 54" style={{ marginTop: "14px" }}>
                <path className="pen" pathLength={100} d="M4 6c18 2 34 14 44 38" fill="none" stroke="#161513" strokeWidth="3.5" strokeLinecap="round" style={{ animationDelay: "1.6s" }} />
                <path className="pen" pathLength={100} d="M38 40l10 8 4-13" fill="none" stroke="#161513" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ animationDelay: "2s" }} />
              </svg>
            </span>
          </div>
          <button
            type="button"
            className="cube-btn pop"
            data-face={FACES[face].sym}
            onPointerDown={motion.onCubeDown}
            onPointerMove={motion.onCubeMove}
            onPointerUp={motion.onCubeUp}
            onPointerCancel={motion.onCubeUp}
            onPointerLeave={motion.onCubeLeave}
            onKeyDown={motion.onCubeKey}
            aria-label={`Maths cube showing ${FACES[face].op}. Tap or press Enter to roll, drag to spin.`}
            style={{ animationDelay: ".6s" }}
          >
            <span className={`cube-float ${floatCls}`}>
              <span
                className="cube-turn"
                ref={motion.ref("turn")}
                style={{ transform: `rotateX(${cubeX}deg) rotateY(${cubeY}deg)`, transition: dragging || free ? "none" : "transform 1.2s cubic-bezier(.34,1.3,.5,1)" }}
              >
                <span className="cube">
                  {FACES.map((f, i) => (
                    <span key={f.sym} className="face" style={{ transform: FACE_TRANSFORMS[i], backgroundColor: f.bg, color: f.fg }}>
                      {f.sym}
                    </span>
                  ))}
                </span>
              </span>
            </span>
            <span className="cube-shadow" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

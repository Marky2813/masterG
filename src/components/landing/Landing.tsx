"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Closing from "./Closing";
import Cube from "./Cube";
import Header from "./Header";
import Hero from "./Hero";
import HowItWorks from "./HowItWorks";
import { INITIAL_VIEW, LandingMotion } from "./motion";
import Story from "./Story";
import Tapes from "./Tapes";
import Tools from "./Tools";
import "./landing.css";

// The landing page. One sticky cube layer is shared by the hero and the lesson story below it;
// LandingMotion owns every rAF loop and listener and is torn down on unmount.
const FLOATERS: [string, CSSProperties][] = [
  ["+", { left: "3%", top: "60%", fontSize: "64px", color: "rgba(255,227,110,.22)", animationDuration: "9s" }],
  ["÷", { left: "46%", top: "8%", fontSize: "48px", color: "rgba(22,21,19,.12)", animationDuration: "11s", animationDelay: "-3s" }],
  ["×", { right: "4%", top: "46%", fontSize: "56px", color: "rgba(229,143,163,.25)", animationDuration: "10s", animationDelay: "-5s" }],
  ["=", { left: "38%", bottom: "6%", fontSize: "52px", color: "rgba(22,21,19,.1)", animationDuration: "12s", animationDelay: "-2s" }],
  ["½", { right: "30%", bottom: "3%", fontSize: "46px", color: "rgba(255,227,110,.18)", animationDuration: "13s", animationDelay: "-6s" }],
];

export default function Landing() {
  const [view, setView] = useState(INITIAL_VIEW);
  const [motion] = useState(() => new LandingMotion(INITIAL_VIEW, setView));
  useEffect(() => {
    motion.mount();
    return () => motion.unmount();
  }, [motion]);

  return (
    <div ref={motion.ref("root")} className="mg">
      <Header progressRef={motion.ref("navProg")} />
      {/* hero + lesson share one cube */}
      <div id="top" className="grid-bg" style={{ position: "relative" }}>
        <div aria-hidden="true" className="hide-sm" style={{ position: "absolute", left: 0, right: 0, top: 0, height: "var(--vh)", pointerEvents: "none", fontWeight: 800, zIndex: 0 }}>
          {FLOATERS.map(([sym, style]) => (
            <span key={sym} className="float" style={{ position: "absolute", ...style }}>
              {sym}
            </span>
          ))}
        </div>
        <div aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: "var(--vh)", zIndex: 0, backgroundColor: "var(--color-mist)", borderTop: "3px solid var(--color-kohl)" }} />
        <Cube motion={motion} view={view} />
        <Hero w={view.w} face={view.face} roll={motion.roll} />
        <Story step={view.step} storyRef={motion.ref("story")} goStep={motion.goStep} />
      </div>
      <Tapes />
      <HowItWorks />
      <Tools motion={motion} />
      <Closing />
    </div>
  );
}

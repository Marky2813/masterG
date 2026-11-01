// Two tilted tapes that run across the page, in a teacher's voice.
export default function Tapes() {
  return (
    <div aria-hidden="true" style={{ position: "relative", height: "190px", overflow: "hidden", backgroundColor: "var(--color-kagaz)" }}>
      <div style={{ position: "absolute", left: "-10%", width: "120%", top: "64px", transform: "rotate(3.5deg)", backgroundColor: "var(--color-red-pen)", borderTop: "3px solid var(--color-kohl)", borderBottom: "3px solid var(--color-kohl)", padding: "14px 0", overflow: "hidden", color: "#FFFFFF", fontWeight: 800, fontSize: "24px" }}>
        <div className="marq-rev" style={{ whiteSpace: "nowrap" }}>
          <span style={{ paddingRight: "32px" }}>Mistake caught ✱ Try again ✱ Find it yourself ✱ Mistake caught ✱ Try again ✱ Find it yourself ✱</span>
          <span style={{ paddingRight: "32px" }}>Mistake caught ✱ Try again ✱ Find it yourself ✱ Mistake caught ✱ Try again ✱ Find it yourself ✱</span>
        </div>
      </div>
      <div style={{ position: "absolute", left: "-10%", width: "120%", top: "70px", transform: "rotate(-3deg)", backgroundColor: "var(--color-peela)", borderTop: "3px solid var(--color-kohl)", borderBottom: "3px solid var(--color-kohl)", padding: "14px 0", overflow: "hidden", color: "var(--color-kohl)", fontWeight: 800, fontSize: "24px" }}>
        <div className="marq" style={{ whiteSpace: "nowrap" }}>
          <span style={{ paddingRight: "32px" }}>That&apos;s not right. ✱ Same mistake again? ✱ Read the question carefully. ✱ Write neatly. ✱ Well done! ✱</span>
          <span style={{ paddingRight: "32px" }}>That&apos;s not right. ✱ Same mistake again? ✱ Read the question carefully. ✱ Write neatly. ✱ Well done! ✱</span>
        </div>
      </div>
    </div>
  );
}

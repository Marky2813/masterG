import CtaButton from "./CtaButton";
import RoleLinks from "./RoleLinks";

// The closing call to action. The same button as the hero (open the app at /learn),
// with the teacher / join-a-class links under it.
export default function Closing() {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-[1360px] px-4 md:px-10">
        <h2 className="landing-reveal font-display text-[clamp(52px,8.4vw,120px)] leading-[0.9] font-black text-balance [font-stretch:125%]">
          Notebook kholo. Masterji ready hain.
        </h2>
        <div className="landing-reveal mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
          <CtaButton />
          <p className="max-w-xs text-sm leading-snug text-muted">Stylus ke saath best. Voice ke liye mic chahiye.</p>
            <RoleLinks />
        </div>
      </div>
    </section>
  );
}

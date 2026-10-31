// How Masterji talks: what he says, what he never says, and three rules of the
// class. Rules here describe the prompt and the hint ladder in the app.
const SAYS = ["Ye galat hai.", "Phir se wahi galti?", "Dhyan se padho question.", "Saaf likho beta."];
const NEVER = ["Tumse nahi hoga.", "Sharma ji ke bete ko dekho.", "Itna bhi nahi aata?"];

export default function Rules() {
  return (
    <section className="border-y-[2.5px] border-kohl bg-rabar-wash py-24 md:py-32">
      <div className="mx-auto max-w-[1360px] px-4 md:px-10">
        <h2 className="landing-reveal font-display text-[clamp(40px,6vw,84px)] leading-[0.95] font-black text-balance [font-stretch:125%]">
          Galti ko daant. Bachche ko kabhi nahi.
        </h2>
        <p className="landing-reveal mt-6 max-w-2xl text-lg leading-[1.55] text-muted">
          Masterji is strict the way good teachers are strict: about the work, never about the child.
        </p>

        <div className="mt-14 grid gap-6 md:grid-cols-2">
          <article className="landing-reveal rounded-tile border-[2.5px] border-kohl bg-white p-8 shadow-hard-lg md:p-10">
            <h3 className="font-display text-2xl font-black [font-stretch:112%]">Masterji kehte hain</h3>
            <ul className="mt-6 flex flex-col gap-3 font-hand text-[26px] leading-snug text-pencil md:text-[28px]">
              {SAYS.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-3 size-2 shrink-0 rounded-full bg-red-pen" />
                  {line}
                </li>
              ))}
            </ul>
          </article>

          <article className="landing-reveal rounded-tile border-[2.5px] border-kohl bg-white p-8 shadow-hard-lg md:p-10">
            <h3 className="font-display text-2xl font-black [font-stretch:112%]">Ye Masterji nahi kehta</h3>
            <ul className="mt-6 flex flex-col gap-3 font-hand text-[26px] leading-snug text-pencil md:text-[28px]">
              {NEVER.map((line) => (
                <li key={line} className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-3 size-2 shrink-0 rounded-full bg-kohl" />
                  <s className="decoration-red-pen decoration-[2.5px]">{line}</s>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <RuleCard title="Jawab nahi, ishaara">
            Masterji points at the wrong step, then asks. The correct step is written only as the last hint, after
            you’ve been pointed at, narrowed and led.
          </RuleCard>
          <RuleCard title="Apni speed se">Masterji waits while you think. No timer, no rush, no race.</RuleCard>
          <RuleCard title="Khud pakda, toh shabaash">
            When you fix a galti yourself, Masterji praises the effort: “Dekha? Khud pakda!”
          </RuleCard>
        </div>
      </div>
    </section>
  );
}

function RuleCard({ title, children }: { title: string; children: string }) {
  return (
    <article className="landing-reveal rounded-tile border-[2.5px] border-kohl bg-white p-7 shadow-hard">
      <h3 className="font-display text-xl font-black [font-stretch:112%]">{title}</h3>
      <p className="mt-3 text-[15px] leading-[1.55] text-muted">{children}</p>
    </article>
  );
}

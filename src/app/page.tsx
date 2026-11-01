import type { Metadata } from "next";
import Landing from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: "MasterG · the maths teacher who checks every step",
  description:
    "MasterG watches every line of a Class 1–8 maths sum on a digital notebook, stays quiet while it's right, and circles the mistake in red pen so your child can find the fix.",
};

// Landing page at /. "Start a class" opens the notebook at /learn; the cube's question opens it
// with that question already set (/learn?q=…).
export default function Page() {
  return (
    <main>
      <Landing />
    </main>
  );
}

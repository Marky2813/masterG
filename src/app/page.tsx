import type { Metadata } from "next";
import Closing from "@/components/landing/Closing";
import Features from "@/components/landing/Features";
import Footer from "@/components/landing/Footer";
import Header from "@/components/landing/Header";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Rules from "@/components/landing/Rules";
import Tapes from "@/components/landing/Tapes";

export const metadata: Metadata = {
  title: "Master G · Masterji, AI maths tuition",
  description:
    "Masterji checks each step of a Class 5–8 maths sum written on a digital notebook, ticks what is right, and circles the galti in red pen.",
};

// Landing page at /. Its one call to action opens the whiteboard app at /learn.
export default function Landing() {
  return (
    <main className="landing-ruled font-body text-kohl">
      <Header />
      <Hero />
      <Tapes />
      <HowItWorks />
      <Features />
      <Rules />
      <Closing />
      <Footer />
    </main>
  );
}

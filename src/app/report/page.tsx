import type { Metadata, Viewport } from "next";
import ReportView from "@/components/report/ReportView";
import "./report.css";

export const metadata: Metadata = {
  title: "Practice report · MasterG",
  description: "A home maths practice session with Masterji: every step checked, mistakes grouped, and what to practise next.",
};

export const viewport: Viewport = { themeColor: "#FFE36E", colorScheme: "light" };

// /report#r=<data>: the whole report travels in the link fragment (never sent to a server).
// /report#local: the copy saved by the 📋 Report button on /learn.
export default function ReportPage() {
  return <ReportView />;
}

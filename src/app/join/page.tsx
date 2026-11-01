import type { Metadata, Viewport } from "next";
import JoinClass from "@/components/classroom/JoinClass";
import "../report/report.css";

export const metadata: Metadata = { title: "Join your class · MasterG" };
export const viewport: Viewport = { themeColor: "#FFE36E", colorScheme: "light" };

// /join?c=<CODE>: a child joins their teacher's class on this device, then practises at /learn.
export default function JoinPage() {
  return <JoinClass />;
}

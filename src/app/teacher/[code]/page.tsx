import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import Dashboard from "@/components/classroom/Dashboard";
import "../../report/report.css";

export const metadata: Metadata = { title: "Class dashboard · MasterG" };
export const viewport: Viewport = { themeColor: "#FFE36E", colorScheme: "light" };

// /teacher/<CODE>#k=<teacher key>: the key stays in the fragment (never sent as a URL to the server)
// and is kept in this browser after the first visit. The page is all client-side: the class code
// comes from useParams, so nothing here waits on request data during prerendering.
export default function ClassPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-kagaz" />}>
      <Dashboard />
    </Suspense>
  );
}

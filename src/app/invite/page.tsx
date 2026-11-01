import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import InviteForm from "@/components/classroom/InviteForm";
import "../report/report.css";

export const metadata: Metadata = { title: "Invite code · Master G" };
export const viewport: Viewport = { themeColor: "#FFE36E", colorScheme: "light" };

export default function InvitePage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-kagaz" />}>
      <InviteForm />
    </Suspense>
  );
}

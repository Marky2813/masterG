import type { Metadata, Viewport } from "next";
import TeacherHome from "@/components/classroom/TeacherHome";
import "../report/report.css";

export const metadata: Metadata = {
  title: "Teacher · Master G",
  description: "Make a class, share its code with your students, and see where each child is lacking from their home practice with Masterji.",
};
export const viewport: Viewport = { themeColor: "#FFE36E", colorScheme: "light" };

export default function TeacherPage() {
  return <TeacherHome />;
}

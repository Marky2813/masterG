import type { Metadata } from "next";
import { Archivo, Bricolage_Grotesque, Geist, Geist_Mono, Kalam } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Archivo (print and headings) for /report, /teacher, /join and /invite; Kalam for handwriting.
// They are CSS variables, so /learn keeps its own fonts.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Landing page only (src/components/landing/landing.css): Bricolage Grotesque for print and
// headings. The width and optical-size axes are loaded because the headings animate weight and
// width as you move the pointer and scroll.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  axes: ["opsz", "wdth"],
});

const kalam = Kalam({
  variable: "--font-kalam",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
});

export const metadata: Metadata = {
  title: "Master G",
  description: "Masterji, your AI maths tuition teacher",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${archivo.variable} ${bricolage.variable} ${kalam.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

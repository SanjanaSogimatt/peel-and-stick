import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Nav, Reveal, Ending } from "../components/site";
import "./globals.css";

const description =
  "Realistic peel-and-stick stickers for React. Peel them off a glossy backing, stick them anywhere on your page, and peel them again.";

export const metadata: Metadata = {
  title: { default: "peel-and-stick", template: "%s · peel-and-stick" },
  description,
  openGraph: { title: "peel-and-stick: stickers your users can actually peel", description, type: "website" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a className="skip" href="#main">Skip to content</a>
        <Nav />
        <Reveal />
        <main id="main" tabIndex={-1} style={{ outline: "none" }}>
          {children}
          <Ending />
        </main>
        <Analytics />
      </body>
    </html>
  );
}

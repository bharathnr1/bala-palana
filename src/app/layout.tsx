import type { Metadata, Viewport } from "next";

import { strings } from "@/lib/strings";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: strings.appName, template: `%s · ${strings.appName}` },
  description: strings.appTagline,
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

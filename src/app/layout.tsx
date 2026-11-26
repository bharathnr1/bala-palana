import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegister } from "@/components/shell/service-worker-register";
import { strings } from "@/lib/strings";
import { THEME_COLORS, THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: strings.appName, template: `%s · ${strings.appName}` },
  description: strings.appTagline,
  applicationName: strings.appName,
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: strings.appName, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Dark is the default; the script in <head> removes the class for a stored
    // light choice before paint, so hydration must tolerate the difference.
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <head>
        {/* Rendered here so the theme script can keep it in step with the choice. */}
        <meta name="theme-color" content={THEME_COLORS.dark} />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { AppShell } from "@/components/shell";
import { getCurrentAccount } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Haramaya Trip — University Transportation",
    template: "%s | Haramaya Trip",
  },
  description: "Official Haramaya University transportation booking, ticket issuance, and gate departure management platform.",
  icons: {
    icon: [
      { url: "/brand/favicon.ico", type: "image/x-icon" },
      { url: "/brand/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/brand/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Haramaya Trip",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const account = await getCurrentAccount();
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#087A55" />
      </head>
      <body className="min-h-full flex flex-col">
        <AppShell account={account}>{children}</AppShell>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}

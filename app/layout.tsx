import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: "Leadership 360 Feedback · Illustrative report",
    description: "A private, guided Leadership 360 feedback experience.",
    icons: { icon: "/bnp-logo.png", shortcut: "/bnp-logo.png" },
    robots: { index: false, follow: false },
    openGraph: {
      title: "See the pattern. Choose what matters.",
      description: "A private, guided Leadership 360 feedback experience.",
      images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "See the pattern. Choose what matters." }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "See the pattern. Choose what matters.",
      description: "A private, guided Leadership 360 feedback experience.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}

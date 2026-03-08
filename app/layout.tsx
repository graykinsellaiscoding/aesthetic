import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";

export const metadata: Metadata = {
  title: "Aesthetic — Your Personal Lookbook",
  description:
    "Personalized menswear discovery. The right clothes, from the right brands, at the right prices.",
  openGraph: {
    title: "Aesthetic",
    description: "Your personal menswear lookbook",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#FAFAF7",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AnalyticsProvider />
        <main className="mx-auto max-w-[430px] min-h-screen bg-bg relative">
          {children}
        </main>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, Chewy, Patrick_Hand } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Nostalgic scrapbook typography: chunky rounded display + handwritten body
const chewy = Chewy({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

const patrickHand = Patrick_Hand({
  variable: "--font-hand",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PhotoMerge — a cute 2048 with photos",
  description:
    "Merge matching photos to unlock the next cuteness level, all the way to the big reveal. A cozy scrapbook-style photo puzzle with color-matched effects and lo-fi vibes.",
  keywords: ["2048", "photo game", "puzzle", "merge game", "cute game"],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${chewy.variable} ${patrickHand.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}

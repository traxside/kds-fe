import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SimulationProvider } from "@/context/SimulationContext";
import React, { lazy, Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

export const metadata: Metadata = {
  title: "Bacteria Simulation Lab",
  description:
    "Interactive bacteria population dynamics and antibiotic resistance simulation",
};

// Stagewise toolbar component - only in development
function StagewiseDevToolbar() {
  if (process.env.NODE_ENV !== "development") {
    return null;
  }

  try {
    // Dynamic import to ensure it's only loaded in development
    const StagewiseToolbar = lazy(() => import("@stagewise/toolbar-next").then(module => ({ default: module.StagewiseToolbar })));

    const stagewiseConfig = {
      plugins: [],
    };

    return (
      <Suspense fallback={null}>
        <StagewiseToolbar config={stagewiseConfig} />
      </Suspense>
    );
  } catch (error) {
    // Gracefully handle toolbar loading errors
    console.warn("Stagewise toolbar failed to load:", error);
    return null;
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-surface text-white`}
        suppressHydrationWarning
      >
        <SimulationProvider autoRefresh={true} refreshInterval={1000}>
          {children}
        </SimulationProvider>
        <StagewiseDevToolbar />
      </body>
    </html>
  );
}

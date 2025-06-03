import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SimulationProvider } from "@/context/SimulationContext";
import StyleLoader from "@/components/StyleLoader";

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
  title: "Bacteria Simulation Dashboard",
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
    const { StagewiseToolbar } = require("@stagewise/toolbar-next");

    const stagewiseConfig = {
      plugins: [],
    };

    return <StagewiseToolbar config={stagewiseConfig} />;
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
        <StyleLoader>
          <SimulationProvider autoRefresh={true} refreshInterval={1000}>
            {children}
          </SimulationProvider>
        </StyleLoader>
        <StagewiseDevToolbar />
      </body>
    </html>
  );
}

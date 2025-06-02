import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SimulationProvider } from "@/context/SimulationContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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

  // Dynamic import to ensure it's only loaded in development
  const { StagewiseToolbar } = require("@stagewise/toolbar-next");

  const stagewiseConfig = {
    plugins: [],
  };

  return <StagewiseToolbar config={stagewiseConfig} />;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SimulationProvider autoRefresh={true} refreshInterval={1000}>
          {children}
        </SimulationProvider>
        <StagewiseDevToolbar />
      </body>
    </html>
  );
}

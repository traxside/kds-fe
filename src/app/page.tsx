"use client";

import React from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SimulationProvider } from "@/context/SimulationContext";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardContent from "@/components/dashboard/DashboardContent";
import { colors } from "@/lib/colors";

export default function Dashboard() {
  return (
      <ErrorBoundary>
        <SimulationProvider>
          <div
              className="min-h-screen"
              style={{
                backgroundColor: colors.surface.a0,
                color: colors.light,
              }}
          >
            <DashboardHeader />
            <DashboardContent />
          </div>
        </SimulationProvider>
      </ErrorBoundary>
  );
}

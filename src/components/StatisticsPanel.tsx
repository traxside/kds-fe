"use client";

import React, { useMemo, memo } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  // Activity,
  // Shield,
  TrendingUp,
  Microscope,
  FileText,
} from "lucide-react";
import { SimulationStatistics } from "@/types/simulation";

interface StatisticsPanelProps {
  statistics?: SimulationStatistics;
  isLoading?: boolean;
}

// Mock data generator for testing - moved outside component to prevent recreation
const generateMockStatistics = (): SimulationStatistics => {
  const generations = Array.from({ length: 50 }, (_, i) => i + 1);

  return {
    generations,
    totalPopulation: generations.map((gen) =>
      Math.floor(50 + Math.random() * 30 + gen * 2)
    ),
    resistantCount: generations.map((gen) =>
      Math.floor(Math.min(10 + gen * 1.5 + Math.random() * 15, gen * 2))
    ),
    sensitiveCount: generations.map((gen) =>
      Math.max(
        0,
        50 +
          Math.random() * 30 +
          gen * 2 -
          (10 + gen * 1.5 + Math.random() * 15)
      )
    ),
    averageFitness: generations.map(() => 0.3 + Math.random() * 0.5),
    mutationEvents: generations.map(() => Math.floor(Math.random() * 8)),
    antibioticDeaths: generations.map(() => Math.floor(Math.random() * 5)),
    naturalDeaths: generations.map(() => Math.floor(Math.random() * 3)),
    reproductions: generations.map(() => Math.floor(Math.random() * 12 + 8)),
  };
};

// Memoized CustomTooltip component
interface TooltipPayload {
  color: string;
  name: string;
  value: number;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

const CustomTooltip = memo(function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg">
        <p className="font-medium">{`Generation ${label}`}</p>
        {payload.map((entry: TooltipPayload, index: number) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {`${entry.name}: ${
              typeof entry.value === "number"
                ? entry.value.toFixed(entry.dataKey === "fitness" ? 2 : 0)
                : entry.value
            }`}
            {entry.dataKey === "resistanceRatio" && "%"}
          </p>
        ))}
      </div>
    );
  }
  return null;
});

const StatisticsPanel = memo<StatisticsPanelProps>(function StatisticsPanel({
  statistics,
  isLoading = false,
}) {
  // Use mock data if no statistics provided - memoized to prevent recreation
  const mockStats = useMemo(() => generateMockStatistics(), []);
  const currentStats = statistics || mockStats;

  // Prepare data for population trends chart
  const populationData = useMemo(() => {
    return currentStats.generations.map((gen, i) => ({
      generation: gen,
      total: currentStats.totalPopulation[i] || 0,
      resistant: currentStats.resistantCount[i] || 0,
      sensitive: currentStats.sensitiveCount[i] || 0,
    }));
  }, [currentStats]);

  // Prepare data for resistance ratio chart
  const resistanceData = useMemo(() => {
    return currentStats.generations.map((gen, i) => {
      const total = currentStats.totalPopulation[i] || 1;
      const resistant = currentStats.resistantCount[i] || 0;
      return {
        generation: gen,
        resistanceRatio: (resistant / total) * 100,
        resistant,
        total,
      };
    });
  }, [currentStats]);

  // Prepare data for fitness and mutations
  const fitnessData = useMemo(() => {
    return currentStats.generations.map((gen, i) => ({
      generation: gen,
      fitness: currentStats.averageFitness[i] || 0,
      mutations: currentStats.mutationEvents[i] || 0,
    }));
  }, [currentStats]);

  // Calculate summary statistics
  // const latestData = useMemo(() => {
  //   const lastIndex = currentStats.generations.length - 1;
  //   if (lastIndex < 0) return null;
  //
  //   return {
  //     totalPop: currentStats.totalPopulation[lastIndex] || 0,
  //     resistantPop: currentStats.resistantCount[lastIndex] || 0,
  //     sensitivePop: currentStats.sensitiveCount[lastIndex] || 0,
  //     avgFitness: currentStats.averageFitness[lastIndex] || 0,
  //     resistanceRate:
  //       ((currentStats.resistantCount[lastIndex] || 0) /
  //         (currentStats.totalPopulation[lastIndex] || 1)) *
  //       100,
  //   };
  // }, [currentStats]);

  // Memoized loading component
  const loadingComponent = useMemo(() => (
    <div className="space-y-4">
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-64 rounded-lg"></div>
      <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg"></div>
    </div>
  ), []);

  if (isLoading) {
    return loadingComponent;
  }

  return (
    <div className="space-y-6 statistics-panel">
      {/* Charts Tabs */}
      <Tabs defaultValue="population" className="space-y-4">
        <TabsList
          className="grid w-full grid-cols-3 p-1 rounded-lg border"
          style={{
            backgroundColor: "#282828",
            borderColor: "#3f3f3f",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
          }}
        >
          <TabsTrigger
            value="population"
            className="text-xs transition-all duration-200 data-[state=active]:shadow-md"
            style={{
              color: "#8b8b8b",
              backgroundColor: "transparent",
              border: "1px solid transparent",
              borderRadius: "6px",
            }}
            data-active-style={{
              backgroundColor: "#01fbd9",
              color: "#121212",
              borderColor: "#73fde1",
              boxShadow: "0 0 15px rgba(1, 251, 217, 0.4)",
            }}
          >
            Population
          </TabsTrigger>
          <TabsTrigger
            value="resistance"
            className="text-xs transition-all duration-200 data-[state=active]:shadow-md"
            style={{
              color: "#8b8b8b",
              backgroundColor: "transparent",
              border: "1px solid transparent",
              borderRadius: "6px",
            }}
            data-active-style={{
              backgroundColor: "#01fbd9",
              color: "#121212",
              borderColor: "#73fde1",
              boxShadow: "0 0 15px rgba(1, 251, 217, 0.4)",
            }}
          >
            Resistance
          </TabsTrigger>
          <TabsTrigger
            value="fitness"
            className="text-xs transition-all duration-200 data-[state=active]:shadow-md"
            style={{
              color: "#8b8b8b",
              backgroundColor: "transparent",
              border: "1px solid transparent",
              borderRadius: "6px",
            }}
            data-active-style={{
              backgroundColor: "#01fbd9",
              color: "#121212",
              borderColor: "#73fde1",
              boxShadow: "0 0 15px rgba(1, 251, 217, 0.4)",
            }}
          >
            Fitness
          </TabsTrigger>
        </TabsList>

        {/* Population Trends Chart */}
        <TabsContent value="population">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
                Population Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={populationData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="generation"
                    fontSize={12}
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis fontSize={12} tick={{ fill: "currentColor" }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend fontSize={12} />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    name="Total"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="resistant"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Resistant"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="sensitive"
                    stroke="#22c55e"
                    strokeWidth={2}
                    name="Sensitive"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resistance Ratio Chart */}
        <TabsContent value="resistance">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <Microscope className="h-4 w-4 mr-2 text-red-600" />
                Resistance Evolution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={resistanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="generation"
                    fontSize={12}
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis fontSize={12} tick={{ fill: "currentColor" }} />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="resistanceRatio"
                    stroke="#ef4444"
                    fill="url(#resistanceGradient)"
                    name="Resistance %"
                    strokeWidth={2}
                  />
                  <defs>
                    <linearGradient
                      id="resistanceGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#ef4444"
                        stopOpacity={0.05}
                      />
                    </linearGradient>
                  </defs>
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fitness and Mutations Chart */}
        <TabsContent value="fitness">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center">
                <FileText className="h-4 w-4 mr-2 text-purple-600" />
                Fitness & Mutations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={fitnessData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis
                    dataKey="generation"
                    fontSize={12}
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis
                    yAxisId="fitness"
                    fontSize={12}
                    tick={{ fill: "currentColor" }}
                  />
                  <YAxis
                    yAxisId="mutations"
                    orientation="right"
                    fontSize={12}
                    tick={{ fill: "currentColor" }}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Legend fontSize={12} />
                  <Line
                    yAxisId="fitness"
                    type="monotone"
                    dataKey="fitness"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    name="Avg Fitness"
                    dot={false}
                  />
                  <Line
                    yAxisId="mutations"
                    type="monotone"
                    dataKey="mutations"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    name="Mutations"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});

export default StatisticsPanel;

"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Activity,
  BarChart3,
  Beaker,
  Zap,
  Dna,
  Loader2,
  Info,
  AlertTriangle,
  X,
} from "lucide-react";
import PetriDish from "@/components/PetriDish";
import SimulationParameterForm from "@/components/SimulationParameterForm";
import StatisticsPanel from "@/components/StatisticsPanel";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ConnectionStatus, {
  ConnectionStatusCompact,
} from "@/components/ConnectionStatus";
import { useSimulation } from "@/hooks/useSimulation";
import { Bacterium, SimulationParametersInput } from "@/types/simulation";

export default function Dashboard() {
  // Use the new simulation hook with auto-refresh enabled
  const {
    simulation,
    bacteria,
    isLoading,
    isSimulationRunning,
    error,
    isConnected,
    createSimulation,
    startSimulation,
    stopSimulation,
    resetSimulation,
    clearError,
    checkConnection,
  } = useSimulation({
    autoRefresh: true,
    refreshInterval: 1000,
  });

  // Local state for UI
  const [simulationName, setSimulationName] = useState(
    "Bacteria Evolution Simulation"
  );
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);

  // Generate sample bacteria for when no simulation exists (fallback)
  const generateSampleBacteria = useCallback(() => {
    const sampleBacteria: Bacterium[] = [];
    const centerX = 300;
    const centerY = 300;
    const maxRadius = 250;

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * maxRadius;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      const isResistant = Math.random() < 0.2;

      const bacterium: Bacterium = {
        id: `bacteria-${i}`,
        x,
        y,
        isResistant,
        fitness: 0.5 + Math.random() * 0.5,
        age: Math.floor(Math.random() * 10),
        generation: Math.floor(Math.random() * 5),
        parentId:
          i > 10 ? `bacteria-${Math.floor(Math.random() * 10)}` : undefined,
        color: isResistant ? "#ef4444" : "#22c55e",
        size: 3 + Math.random() * 3,
      };

      sampleBacteria.push(bacterium);
    }

    return sampleBacteria;
  }, []);

  // Sample bacteria for display when no simulation exists
  const [sampleBacteria, setSampleBacteria] = useState<Bacterium[]>([]);

  // Initialize sample data on mount
  useEffect(() => {
    setSampleBacteria(generateSampleBacteria());
  }, [generateSampleBacteria]);

  // Handle form submission - create new simulation
  const handleSimulationSubmit = useCallback(
    async (parameters: SimulationParametersInput) => {
      try {
        await createSimulation(simulationName, parameters);
      } catch (err) {
        console.error("Failed to create simulation:", err);
      }
    },
    [createSimulation, simulationName]
  );

  // Handle play/pause
  const handlePlayPause = useCallback(async () => {
    try {
      if (isSimulationRunning) {
        await stopSimulation();
      } else {
        if (simulation) {
          await startSimulation();
        }
      }
    } catch (err) {
      console.error("Failed to toggle simulation:", err);
    }
  }, [isSimulationRunning, simulation, startSimulation, stopSimulation]);

  // Handle reset
  const handleReset = useCallback(async () => {
    try {
      if (simulation) {
        await resetSimulation();
      } else {
        // If no simulation exists, just regenerate sample bacteria
        setSampleBacteria(generateSampleBacteria());
      }
    } catch (err) {
      console.error("Failed to reset simulation:", err);
    }
  }, [simulation, resetSimulation, generateSampleBacteria]);

  // Use real bacteria data if available, otherwise fallback to sample data
  const displayBacteria = bacteria.length > 0 ? bacteria : sampleBacteria;
  const resistancePercentage =
    displayBacteria.length > 0
      ? (displayBacteria.filter((b) => b.isResistant).length /
          displayBacteria.length) *
        100
      : 0;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Header */}
        <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-gray-900/80 sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Activity className="h-8 w-8 text-blue-600 animate-pulse" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Bacteria Simulation
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Interactive bacterial evolution simulator
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge variant="outline" className="text-sm font-mono">
                  <Dna className="h-3 w-3 mr-1" />
                  Gen: {simulation?.currentState?.generation || 0}
                </Badge>
                <Badge
                  variant={isSimulationRunning ? "default" : "secondary"}
                  className="animate-pulse"
                >
                  {isSimulationRunning ? (
                    <>
                      <Zap className="h-3 w-3 mr-1" />
                      Running
                    </>
                  ) : (
                    "Paused"
                  )}
                </Badge>
                <ConnectionStatusCompact
                  isConnected={isConnected}
                  error={error}
                  onRetry={checkConnection}
                  isRetrying={isLoading}
                />
              </div>
            </div>
          </div>
        </header>

        {/* Error Alert */}
        {error && (
          <div className="container mx-auto px-4 pt-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{error}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content - Split Screen Layout */}
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
            {/* Left Side - Petri Dish Visualization (2/3 width on large screens) */}
            <div className="lg:col-span-2">
              <Card className="h-full border-2 border-blue-200/50 dark:border-blue-800/50 shadow-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Beaker className="h-5 w-5 text-blue-600" />
                      <span>Petri Dish Visualization</span>
                      {simulation && (
                        <Badge variant="outline" className="text-xs">
                          {simulation.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant={
                          isSimulationRunning ? "destructive" : "default"
                        }
                        size="sm"
                        onClick={handlePlayPause}
                        disabled={isLoading || (!simulation && !isConnected)}
                        className="transition-all duration-200"
                        aria-label={
                          isSimulationRunning
                            ? "Pause simulation"
                            : "Start simulation"
                        }
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            {isSimulationRunning
                              ? "Stopping..."
                              : "Starting..."}
                          </>
                        ) : isSimulationRunning ? (
                          <>
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-1" />
                            {simulation ? "Resume" : "Start"}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReset}
                        disabled={isLoading}
                        aria-label="Reset simulation"
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-1" />
                        )}
                        Reset
                      </Button>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[calc(100%-5rem)]">
                  <div className="relative w-full h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center shadow-inner">
                    {isLoading && (
                      <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 rounded-xl flex items-center justify-center z-10">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                          <span className="text-blue-600 font-medium">
                            Processing...
                          </span>
                        </div>
                      </div>
                    )}
                    {/* PetriDish Component */}
                    <PetriDish
                      bacteria={displayBacteria}
                      width={600}
                      height={600}
                      isSimulationRunning={isSimulationRunning}
                      onBacteriumClick={(bacterium) => {
                        console.log("Clicked bacterium:", bacterium);
                        // TODO: Show bacterium details in a modal or sidebar
                      }}
                    />
                    {!isConnected && displayBacteria === sampleBacteria && (
                      <div className="absolute bottom-4 left-4 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-lg text-sm">
                        <Info className="h-4 w-4 inline mr-1" />
                        Showing sample data (API disconnected)
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Side - Controls and Charts (1/3 width on large screens) */}
            <div className="lg:col-span-1">
              <div className="space-y-6 h-full">
                {/* Quick Stats */}
                <Card className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                      Population Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {displayBacteria.length}
                        </div>
                        <div className="text-xs text-blue-600/70">Total</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">
                          {displayBacteria.filter((b) => b.isResistant).length}
                        </div>
                        <div className="text-xs text-red-600/70">Resistant</div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          Sensitive
                        </span>
                        <Badge variant="outline" className="font-mono">
                          {displayBacteria.filter((b) => !b.isResistant).length}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>Resistance Rate</span>
                          <span>{resistancePercentage.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500 ease-out"
                            style={{
                              width: `${resistancePercentage}%`,
                            }}
                            role="progressbar"
                            aria-label={`Resistance rate: ${resistancePercentage.toFixed(
                              1
                            )}%`}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Controls and Parameters */}
                <Card className="flex-1 border-l-4 border-l-green-500">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center justify-between">
                      <div className="flex items-center">
                        <Settings className="h-5 w-5 mr-2 text-green-600" />
                        Controls & Parameters
                      </div>
                      <ConnectionStatusCompact
                        isConnected={isConnected}
                        error={error}
                        onRetry={checkConnection}
                        isRetrying={isLoading}
                      />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-5rem)]">
                    <Tabs defaultValue="parameters" className="h-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="parameters" className="text-sm">
                          Parameters
                        </TabsTrigger>
                        <TabsTrigger value="charts" className="text-sm">
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Charts
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent
                        value="parameters"
                        className="mt-4 space-y-6"
                      >
                        {/* Simulation Name Input */}
                        <div className="space-y-2">
                          <Label
                            htmlFor="simulation-name"
                            className="text-sm font-medium"
                          >
                            Simulation Name
                          </Label>
                          <Input
                            id="simulation-name"
                            value={simulationName}
                            onChange={(e) => setSimulationName(e.target.value)}
                            placeholder="Enter simulation name"
                            disabled={isLoading || !!simulation}
                            className="text-sm"
                          />
                        </div>

                        <Separator />

                        <SimulationParameterForm
                          onSubmit={handleSimulationSubmit}
                          isLoading={isLoading}
                          defaultValues={simulation?.parameters || undefined}
                          disabled={isSimulationRunning || !isConnected}
                        />
                      </TabsContent>

                      <TabsContent value="charts" className="mt-4">
                        <StatisticsPanel
                          statistics={simulation?.statistics}
                          isLoading={isLoading}
                        />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

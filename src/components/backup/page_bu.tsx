"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    LuPlay,
    LuPause,
    LuRefreshCw,
    LuSettings,
    LuActivity,
    LuChartBar,
    LuZap,
    LuInfo,
    LuTriangleAlert,
    LuX,
    LuFlaskConical,
    LuList,
    LuSave,
    LuFolderOpen,
} from "react-icons/lu";
import PetriDish from "@/components/PetriDishComponent";
import SimulationParameterForm from "@/components/SimulationParameterForm";
import StatisticsPanel from "@/components/StatisticsPanel";
import SimulationControls from "@/components/SimulationControls";
import VirtualizedBacteriaList from "@/components/VirtualizedBacteriaList";
import SaveSimulationModal from "@/components/SaveSimulationModal";
import LoadSimulationModal from "@/components/LoadSimulationModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
    ConnectionStatusCompact,
} from "@/components/ConnectionStatus";
import { useSimulationContext } from "@/context/SimulationContext";
import { Bacterium, SimulationParametersInput, Simulation } from "@/types/simulation";
import { simulationApiSimple } from "@/lib/api";
import Image from "next/image";
import { BacteriaLegend } from "@/components/BacteriaLegend";

// Move colors outside component to prevent recreation on every render
const colors = {
    surface: {
        a0: "#121212",
        a10: "#282828",
        a20: "#3f3f3f",
        a30: "#575757",
        a40: "#717171",
        a50: "#8b8b8b",
    },
    surfaceTonal: {
        a0: "#1a2623",
        a10: "#2f3a38",
        a20: "#46504d",
        a30: "#5e6764",
        a40: "#767e7c",
        a50: "#909795",
    },
    primary: {
        a0: "#01fbd9",
        a10: "#51fcdd",
        a20: "#73fde1",
        a30: "#8dfee5",
        a40: "#a4feea",
        a50: "#b8ffee",
    },
    light: "#ffffff",
};

// Generate sample bacteria function moved outside to prevent recreation
const generateSampleBacteria = (): Bacterium[] => {
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
};

export default function Dashboard() {
    // Use the simulation context instead of the direct hook
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
        loadSimulation,
    } = useSimulationContext();

    // Local state for UI
    const [simulationName, setSimulationName] = useState(
        "Bacteria Evolution Simulation"
    );
    const [sampleBacteria, setSampleBacteria] = useState<Bacterium[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [savedSimulations, setSavedSimulations] = useState<Simulation[]>([]);
    const [savingSimulation, setSavingSimulation] = useState(false);

    // Initialize sample data on mount
    useEffect(() => {
        setSampleBacteria(generateSampleBacteria());
    }, []);

    // Load saved simulations when load modal opens
    useEffect(() => {
        if (showLoadModal) {
            const loadSimulations = async () => {
                try {
                    const simulations = await simulationApiSimple.getSimulations();
                    setSavedSimulations(simulations);
                } catch (err) {
                    console.error("Failed to load simulations:", err);
                    setSavedSimulations([]);
                }
            };
            loadSimulations();
        }
    }, [showLoadModal]);

    // Memoized event handlers
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
    }, [simulation, resetSimulation]);

    const handleSimulationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSimulationName(e.target.value);
    }, []);

    const handleOpenSaveModal = useCallback(() => {
        setShowSaveModal(true);
    }, []);

    const handleCloseSaveModal = useCallback(() => {
        setShowSaveModal(false);
    }, []);

    const handleOpenLoadModal = useCallback(() => {
        setShowLoadModal(true);
    }, []);

    const handleCloseLoadModal = useCallback(() => {
        setShowLoadModal(false);
    }, []);

    const handleSaveSimulation = useCallback(async (name: string, description?: string) => {
        if (!simulation) return;

        setSavingSimulation(true);
        try {
            await simulationApiSimple.saveSimulationSnapshot(
                simulation.id,
                name,
                description
            );
            console.log("Simulation saved successfully");
            setShowSaveModal(false);
        } catch (err) {
            console.error("Failed to save simulation:", err);
            throw err; // Re-throw to let modal handle the error
        } finally {
            setSavingSimulation(false);
        }
    }, [simulation]);

    const handleLoadSimulation = useCallback(async (selectedSimulation: Simulation) => {
        try {
            await loadSimulation(selectedSimulation.id);
            setShowLoadModal(false);
        } catch (err) {
            console.error("Failed to load simulation:", err);
            throw err; // Re-throw to let modal handle the error
        }
    }, [loadSimulation]);

    // Memoized computed values
    const displayBacteria = useMemo(() => {
        return bacteria.length > 0 ? bacteria : sampleBacteria;
    }, [bacteria, sampleBacteria]);

    // Use simulation statistics from backend when available, otherwise calculate from bacteria
    const currentStats = useMemo(() => {
        if (simulation?.statistics && simulation.statistics.totalPopulation.length > 0) {
            const latestIndex = simulation.statistics.totalPopulation.length - 1;
            const totalCount = simulation.statistics.totalPopulation[latestIndex];
            const resistantCount = simulation.statistics.resistantCount[latestIndex];

            return {
                totalPopulation: totalCount,
                resistantCount: resistantCount,
                sensitiveCount: totalCount - resistantCount,
                resistancePercentage: totalCount > 0 ? (resistantCount / totalCount) * 100 : 0,
                isLiveData: true
            };
        } else if (displayBacteria.length > 0) {
            const totalCount = displayBacteria.length;
            const resistantCount = displayBacteria.filter(b => b.isResistant).length;

            return {
                totalPopulation: totalCount,
                resistantCount: resistantCount,
                sensitiveCount: totalCount - resistantCount,
                resistancePercentage: totalCount > 0 ? (resistantCount / totalCount) * 100 : 0,
                isLiveData: false
            };
        }

        // Default fallback
        return {
            totalPopulation: 0,
            resistantCount: 0,
            sensitiveCount: 0,
            resistancePercentage: 0,
            isLiveData: false
        };
    }, [simulation, displayBacteria]);

    return (
        <ErrorBoundary>
            <div
                className="min-h-screen"
                style={{
                    backgroundColor: colors.surface.a0,
                    color: colors.light,
                }}
            >
                {/* Header */}
                <header
                    className="sticky top-0 z-10 border-b"
                    style={{
                        backgroundColor: `${colors.surface.a10}cc`,
                        backdropFilter: "blur(12px)",
                        borderColor: colors.surface.a20,
                    }}
                >
                    <div className="container mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="relative">
                                    <Image
                                        src="/icon1.png"
                                        alt="Bacteria Simulation Logo"
                                        className="h-10 w-10 object-cover shadow-lg"
                                        width={40}
                                        height={40}
                                    />
                                    <div
                                        className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse ${
                                            isSimulationRunning ? "animate-pulse" : ""
                                        }`}
                                        style={{
                                            backgroundColor: colors.primary.a0,
                                            boxShadow: `0 0 10px ${colors.primary.a0}50`,
                                        }}
                                    ></div>
                                </div>
                                <div>
                                    <h1
                                        className="text-xl font-medium flex items-center space-x-2"
                                        style={{ color: colors.light }}
                                    >
                                        <span>Bacteria Simulation</span>
                                    </h1>
                                    <p className="text-sm" style={{ color: colors.surface.a50 }}>
                                        Interactive evolution simulator
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Badge
                                    variant="outline"
                                    className="text-xs"
                                    style={{
                                        backgroundColor: `${colors.surface.a20}80`,
                                        borderColor: colors.surface.a20,
                                        color: colors.primary.a20,
                                    }}
                                >
                                    <LuActivity className="h-3 w-3 mr-1" />
                                    Gen: {simulation?.currentState?.generation || 0}
                                </Badge>
                                <Badge
                                    variant={isSimulationRunning ? "default" : "secondary"}
                                    style={{
                                        backgroundColor: isSimulationRunning
                                            ? colors.primary.a0
                                            : colors.surface.a20,
                                        color: isSimulationRunning
                                            ? colors.surface.a0
                                            : colors.surface.a50,
                                        borderColor: colors.surface.a20,
                                        boxShadow: isSimulationRunning
                                            ? `0 0 10px ${colors.primary.a0}30`
                                            : "none",
                                    }}
                                >
                                    {isSimulationRunning ? (
                                        <>
                                            <LuZap className="h-3 w-3 mr-1" />
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
                    <div className="container mx-auto px-6 pt-4">
                        <Alert
                            variant="destructive"
                            style={{
                                backgroundColor: "#7f1d1d80",
                                borderColor: "#dc262680",
                                backdropFilter: "blur(12px)",
                            }}
                        >
                            <LuTriangleAlert className="h-4 w-4" />
                            <AlertDescription className="flex items-center justify-between">
                                <span style={{ color: "#fca5a5" }}>{error}</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearError}
                                    className="h-6 w-6 p-0"
                                    style={{
                                        backgroundColor: "transparent",
                                        color: "#fca5a5",
                                    }}
                                >
                                    <LuX className="h-4 w-4" />
                                </Button>
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                {/* Main Content */}
                <div className="container mx-auto px-6 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Petri Dish Visualization */}
                        <div className="lg:col-span-2">
                            <Card
                                className="h-full border"
                                style={{
                                    backgroundColor: `${colors.surface.a10}cc`,
                                    backdropFilter: "blur(12px)",
                                    borderColor: colors.surface.a20,
                                    boxShadow: `0 0 20px ${colors.primary.a0}20`,
                                }}
                            >
                                <CardHeader className="pb-3">
                                    <CardTitle className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                            <LuFlaskConical
                                                className="h-5 w-5"
                                                style={{ color: colors.primary.a0 }}
                                            />
                                            <span
                                                className="text-lg font-medium"
                                                style={{ color: colors.light }}
                                            >
                        Petri Dish
                      </span>
                                            {simulation && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                    style={{
                                                        backgroundColor: `${colors.primary.a0}10`,
                                                        borderColor: `${colors.primary.a0}50`,
                                                        color: colors.primary.a20,
                                                    }}
                                                >
                                                    {simulation.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex space-x-2">
                                            {/* Save Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleOpenSaveModal}
                                                disabled={isLoading || !simulation || !isConnected}
                                                style={{
                                                    backgroundColor: `${colors.surface.a20}80`,
                                                    borderColor: colors.surface.a20,
                                                    color: colors.surface.a50,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = colors.surface.a20;
                                                    e.currentTarget.style.color = colors.light;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = `${colors.surface.a20}80`;
                                                    e.currentTarget.style.color = colors.surface.a50;
                                                }}
                                            >
                                                <LuSave className="h-4 w-4 mr-1" />
                                                Save
                                            </Button>

                                            {/* Load Button */}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleOpenLoadModal}
                                                disabled={isLoading || !isConnected}
                                                style={{
                                                    backgroundColor: `${colors.surface.a20}80`,
                                                    borderColor: colors.surface.a20,
                                                    color: colors.surface.a50,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = colors.surface.a20;
                                                    e.currentTarget.style.color = colors.light;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = `${colors.surface.a20}80`;
                                                    e.currentTarget.style.color = colors.surface.a50;
                                                }}
                                            >
                                                <LuFolderOpen className="h-4 w-4 mr-1" />
                                                Load
                                            </Button>

                                            {/* Play/Pause Button */}
                                            <Button
                                                variant={
                                                    isSimulationRunning ? "destructive" : "default"
                                                }
                                                size="sm"
                                                onClick={handlePlayPause}
                                                disabled={isLoading || (!simulation && !isConnected)}
                                                style={{
                                                    backgroundColor: isSimulationRunning
                                                        ? "#dc2626"
                                                        : colors.primary.a0,
                                                    color: isSimulationRunning
                                                        ? colors.light
                                                        : colors.surface.a0,
                                                    borderColor: colors.surface.a20,
                                                }}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <LuRefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                                        {isSimulationRunning
                                                            ? "Stopping..."
                                                            : "Starting..."}
                                                    </>
                                                ) : isSimulationRunning ? (
                                                    <>
                                                        <LuPause className="h-4 w-4 mr-1" />
                                                        Pause
                                                    </>
                                                ) : (
                                                    <>
                                                        <LuPlay className="h-4 w-4 mr-1" />
                                                        {simulation ? "Resume" : "Start"}
                                                    </>
                                                )}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleReset}
                                                disabled={isLoading}
                                                style={{
                                                    backgroundColor: `${colors.surface.a20}80`,
                                                    borderColor: colors.surface.a20,
                                                    color: colors.surface.a50,
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor =
                                                        colors.surface.a20;
                                                    e.currentTarget.style.color = colors.light;
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = `${colors.surface.a20}80`;
                                                    e.currentTarget.style.color = colors.surface.a50;
                                                }}
                                            >
                                                {isLoading ? (
                                                    <LuRefreshCw className="h-4 w-4 mr-1 animate-spin" />
                                                ) : (
                                                    <LuRefreshCw className="h-4 w-4 mr-1" />
                                                )}
                                                Reset
                                            </Button>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="h-[calc(100%-5rem)]">
                                    <div
                                        className="relative w-full h-full rounded-xl border flex items-center justify-center"
                                        style={{
                                            backgroundColor: colors.surfaceTonal.a0,
                                            borderColor: colors.surfaceTonal.a20,
                                        }}
                                    >
                                        {isLoading && (
                                            <div
                                                className="absolute inset-0 rounded-xl flex items-center justify-center z-10"
                                                style={{
                                                    backgroundColor: `${colors.surface.a10}cc`,
                                                    backdropFilter: "blur(12px)",
                                                }}
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <LuRefreshCw
                                                        className="h-6 w-6 animate-spin"
                                                        style={{ color: colors.primary.a0 }}
                                                    />
                                                    <span
                                                        className="font-medium"
                                                        style={{ color: colors.primary.a0 }}
                                                    >
                            Processing...
                          </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Bacteria Legend */}
                                        <BacteriaLegend />

                                        <PetriDish
                                            bacteria={displayBacteria}
                                            width={600}
                                            height={600}
                                            isSimulationRunning={isSimulationRunning}
                                            maxDisplayNodes={1000}
                                            enableSpatialSampling={true}
                                            onBacteriumClick={(bacterium) => {
                                                console.log("Clicked bacterium:", bacterium);
                                            }}
                                        />
                                        {!isConnected && displayBacteria === sampleBacteria && (
                                            <div
                                                className="absolute bottom-4 left-4 px-3 py-2 rounded-lg text-sm border"
                                                style={{
                                                    backgroundColor: "#78716c80",
                                                    color: "#fde047",
                                                    borderColor: "#ca8a0480",
                                                    backdropFilter: "blur(12px)",
                                                }}
                                            >
                                                <LuInfo className="h-4 w-4 inline mr-1" />
                                                Sample data (API disconnected)
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right Side Panel */}
                        <div className="lg:col-span-1">
                            <div className="space-y-4 h-full">
                                {/* Population Stats */}
                                <Card
                                    className="border"
                                    style={{
                                        backgroundColor: `${colors.surface.a10}cc`,
                                        backdropFilter: "blur(12px)",
                                        borderColor: colors.surface.a20,
                                        height: '280px'
                                    }}
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center">
                                            <LuChartBar
                                                className="h-5 w-5 mr-2"
                                                style={{ color: colors.primary.a0 }}
                                            />
                                            <span style={{ color: colors.light }}>Population</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div
                                                className="text-center p-3 rounded-lg border"
                                                style={{
                                                    backgroundColor: colors.surfaceTonal.a10,
                                                    borderColor: colors.surfaceTonal.a20,
                                                }}
                                            >
                                                <div
                                                    className="text-2xl font-semibold"
                                                    style={{ color: colors.primary.a0 }}
                                                >
                                                    {currentStats.totalPopulation}
                                                </div>
                                                <div
                                                    className="text-xs"
                                                    style={{ color: colors.primary.a20 }}
                                                >
                                                    Total {currentStats.isLiveData && <span className="text-green-400">●</span>}
                                                </div>
                                            </div>
                                            <div
                                                className="text-center p-3 rounded-lg border"
                                                style={{
                                                    backgroundColor: "#7f1d1d50",
                                                    borderColor: "#7f1d1d80",
                                                }}
                                            >
                                                <div
                                                    className="text-2xl font-semibold"
                                                    style={{ color: "#f87171" }}
                                                >
                                                    {currentStats.resistantCount}
                                                </div>
                                                <div className="text-xs" style={{ color: "#fca5a5" }}>
                                                    Resistant {currentStats.isLiveData && <span className="text-green-400">●</span>}
                                                </div>
                                            </div>
                                        </div>

                                        <Separator
                                            style={{ backgroundColor: colors.surface.a20 }}
                                        />

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                        <span
                            className="text-sm"
                            style={{ color: colors.surface.a50 }}
                        >
                          Sensitive
                        </span>
                                                <Badge
                                                    variant="outline"
                                                    style={{
                                                        backgroundColor: `${colors.surface.a20}80`,
                                                        borderColor: colors.surface.a20,
                                                        color: colors.primary.a20,
                                                    }}
                                                >
                                                    {currentStats.sensitiveCount}
                                                </Badge>
                                            </div>

                                            <div className="space-y-2">
                                                <div
                                                    className="flex justify-between text-xs"
                                                    style={{ color: colors.surface.a40 }}
                                                >
                                                    <span>Resistance Rate</span>
                                                    <span>{currentStats.resistancePercentage.toFixed(1)}%</span>
                                                </div>
                                                <div
                                                    className="w-full rounded-full h-2 overflow-hidden"
                                                    style={{ backgroundColor: colors.surface.a20 }}
                                                >
                                                    <div
                                                        className="h-2 rounded-full transition-all duration-500 ease-out"
                                                        style={{
                                                            width: `${currentStats.resistancePercentage}%`,
                                                            background: `linear-gradient(135deg, ${colors.primary.a0}, ${colors.primary.a20})`,
                                                            boxShadow: `0 0 10px ${colors.primary.a0}30`,
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Simulation Controls */}
                                <SimulationControls
                                    showKeyboardShortcuts={true}
                                    showAdvancedControls={true}
                                />

                                {/* Parameters Only */}
                                <Card
                                    className="border flex-grow"
                                    style={{
                                        backgroundColor: `${colors.surface.a10}cc`,
                                        backdropFilter: "blur(12px)",
                                        borderColor: colors.surface.a20,
                                    }}
                                >
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-lg flex items-center justify-between">
                                            <div className="flex items-center">
                                                <LuSettings
                                                    className="h-5 w-5 mr-2"
                                                    style={{ color: colors.primary.a0 }}
                                                />
                                                <span style={{ color: colors.light }}>Parameters</span>
                                            </div>
                                            <ConnectionStatusCompact
                                                isConnected={isConnected}
                                                error={error}
                                                onRetry={checkConnection}
                                                isRetrying={isLoading}
                                            />
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent style={{ overflow: 'auto', height: 'calc(100% - 5rem)' }}>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label
                                                    htmlFor="simulation-name"
                                                    className="text-sm font-medium"
                                                    style={{ color: colors.surface.a50 }}
                                                >
                                                    Simulation Name
                                                </Label>
                                                <Input
                                                    id="simulation-name"
                                                    value={simulationName}
                                                    onChange={handleSimulationNameChange}
                                                    placeholder="Enter simulation name"
                                                    disabled={isLoading || !!simulation}
                                                    style={{
                                                        backgroundColor: colors.surface.a10,
                                                        borderColor: colors.surface.a20,
                                                        color: colors.light,
                                                    }}
                                                />
                                            </div>

                                            <Separator
                                                style={{ backgroundColor: colors.surface.a20 }}
                                            />

                                            <div style={{ overflow: 'hidden' }}>
                                                <SimulationParameterForm
                                                    onSubmit={handleSimulationSubmit}
                                                    isLoading={isLoading}
                                                    defaultValues={simulation?.parameters || undefined}
                                                    disabled={isSimulationRunning || !isConnected}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </div>

                    {/* Charts and Data Section - Horizontal Cards Below */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                        {/* Charts Card */}
                        <Card
                            className="border"
                            style={{
                                backgroundColor: `${colors.surface.a10}cc`,
                                backdropFilter: "blur(12px)",
                                borderColor: colors.surface.a20,
                            }}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center">
                                    <LuChartBar
                                        className="h-5 w-5 mr-2"
                                        style={{ color: colors.primary.a0 }}
                                    />
                                    <span style={{ color: colors.light }}>Charts</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <StatisticsPanel
                                    statistics={simulation?.statistics}
                                    isLoading={isLoading}
                                />
                            </CardContent>
                        </Card>

                        {/* Data Card */}
                        <Card
                            className="border"
                            style={{
                                backgroundColor: `${colors.surface.a10}cc`,
                                backdropFilter: "blur(12px)",
                                borderColor: colors.surface.a20,
                            }}
                        >
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center">
                                    <LuList
                                        className="h-5 w-5 mr-2"
                                        style={{ color: colors.primary.a0 }}
                                    />
                                    <span style={{ color: colors.light }}>Data</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <VirtualizedBacteriaList
                                    bacteria={displayBacteria}
                                    height={350}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Save Simulation Modal */}
                <SaveSimulationModal
                    isOpen={showSaveModal}
                    onClose={handleCloseSaveModal}
                    onSave={handleSaveSimulation}
                    currentSimulation={simulation || undefined}
                    existingSimulations={savedSimulations}
                    defaultName={simulation?.name ? `${simulation.name} Copy` : `Simulation ${new Date().toLocaleString()}`}
                    loading={savingSimulation}
                />

                {/* Load Simulation Modal */}
                <LoadSimulationModal
                    isOpen={showLoadModal}
                    onClose={handleCloseLoadModal}
                    onLoad={handleLoadSimulation}
                    simulations={savedSimulations}
                    loading={false}
                    currentSimulation={simulation || undefined}
                />
            </div>
        </ErrorBoundary>
    );
}

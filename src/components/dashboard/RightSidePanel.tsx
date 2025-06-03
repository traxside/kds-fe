import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { LuChartBar, LuSettings } from "react-icons/lu";
import SimulationParameterForm from "@/components/SimulationParameterForm";
import SimulationControls from "@/components/SimulationControls";
import { ConnectionStatusCompact } from "@/components/ConnectionStatus";
import { useSimulationContext } from "@/context/SimulationContext";
import { useBacteriaDisplay } from "@/hooks/useBacteriaDisplay";
import { SimulationParametersInput } from "@/types/simulation";
import { colors } from "@/lib/colors";

export default function RightSidePanel() {
    const {
        simulation,
        isLoading,
        error,
        isConnected,
        createSimulation,
        checkConnection,
    } = useSimulationContext();

    const { currentStats } = useBacteriaDisplay();
    const [simulationName, setSimulationName] = useState("Bacteria Evolution Simulation");

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

    const handleSimulationNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSimulationName(e.target.value);
    }, []);

    return (
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
                                    disabled={false} // You might want to pass this as a prop or derive from context
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

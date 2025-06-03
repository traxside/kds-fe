import React from "react";
import { Badge } from "@/components/ui/badge";
import { LuActivity, LuZap } from "react-icons/lu";
import { ConnectionStatusCompact } from "@/components/ConnectionStatus";
import { useSimulationContext } from "@/context/SimulationContext";
import { colors } from "@/lib/colors";
import Image from "next/image";

export default function DashboardHeader() {
    const {
        simulation,
        isSimulationRunning,
        error,
        isConnected,
        isLoading,
        checkConnection,
    } = useSimulationContext();

    return (
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
                                className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full ${
                                    isSimulationRunning ? "animate-pulse" : ""
                                }`}
                                style={{
                                    backgroundColor: colors.primary.a0,
                                    boxShadow: `0 0 10px ${colors.primary.a0}50`,
                                }}
                            />
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
    );
}

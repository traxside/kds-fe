import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LuFlaskConical, LuInfo } from "react-icons/lu";
import PetriDish from "@/components/PetriDishComponent";
import { BacteriaLegend } from "@/components/BacteriaLegend";
import PetriDishControls from "./PetriDishControls";
import { useSimulationContext } from "@/context/SimulationContext";
import { useBacteriaDisplay } from "@/hooks/useBacteriaDisplay";
import { colors } from "@/lib/colors";

interface PetriDishSectionProps {
    onOpenSaveModal: () => void;
    onOpenLoadModal: () => void;
}

export default function PetriDishSection({
                                             onOpenSaveModal,
                                             onOpenLoadModal,
                                         }: PetriDishSectionProps) {
    const {
        simulation,
        isLoading,
        isSimulationRunning,
        isConnected,
    } = useSimulationContext();

    const { displayBacteria, isSampleData } = useBacteriaDisplay();

    return (
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
                        <PetriDishControls
                            onOpenSaveModal={onOpenSaveModal}
                            onOpenLoadModal={onOpenLoadModal}
                        />
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
                                    <div
                                        className="h-6 w-6 animate-spin rounded-full border-2 border-current border-r-transparent"
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

                        {!isConnected && isSampleData && (
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
    );
}

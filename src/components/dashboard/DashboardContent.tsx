import React, { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { LuTriangleAlert, LuX } from "react-icons/lu";
import { useSimulationContext } from "@/context/SimulationContext";
// import { colors } from "@/lib/colors";
import { simulationApiSimple } from "@/lib/api_new";
import { Simulation } from "@/types/simulation";
import MainSimulationView from "./MainSimulationView";
import ChartsAndDataSection from "./ChartsAndDataSection";
import SimulationModals from "./SimulationModals";

export default function DashboardContent() {
    const { error, clearError } = useSimulationContext();
    const [savedSimulations, setSavedSimulations] = useState<Simulation[]>([]);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [showLoadModal, setShowLoadModal] = useState(false);
    const [savingSimulation, setSavingSimulation] = useState(false);

    // Load saved simulations when load modal opens
    useEffect(() => {
        if (showLoadModal) {
            const loadSimulations = async () => {
                try {
                    const response = await simulationApiSimple.getSimulations();
                    // Extract the simulations array from the pagination response
                    const simulations = Array.isArray(response) ? response : response.simulations || [];
                    setSavedSimulations(simulations);
                } catch (err) {
                    console.error("Failed to load simulations:", err);
                    setSavedSimulations([]);
                }
            };
            loadSimulations();
        }
    }, [showLoadModal]);

    return (
        <>
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
                <MainSimulationView
                    onOpenSaveModal={() => setShowSaveModal(true)}
                    onOpenLoadModal={() => setShowLoadModal(true)}
                />

                <ChartsAndDataSection />
            </div>

            <SimulationModals
                showSaveModal={showSaveModal}
                showLoadModal={showLoadModal}
                savedSimulations={savedSimulations}
                savingSimulation={savingSimulation}
                onCloseSaveModal={() => setShowSaveModal(false)}
                onCloseLoadModal={() => setShowLoadModal(false)}
                onSavingChange={setSavingSimulation}
            />
        </>
    );
}

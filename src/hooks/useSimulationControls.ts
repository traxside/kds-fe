import { useCallback } from "react";
import { useSimulationContext } from "@/context/SimulationContext";
import { useBacteriaDisplay } from "./useBacteriaDisplay";

export function useSimulationControls() {
    const {
        simulation,
        isSimulationRunning,
        startSimulation,
        stopSimulation,
        resetSimulation,
    } = useSimulationContext();

    const { regenerateSampleData } = useBacteriaDisplay();

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
                regenerateSampleData();
            }
        } catch (err) {
            console.error("Failed to reset simulation:", err);
        }
    }, [simulation, resetSimulation, regenerateSampleData]);

    return {
        handlePlayPause,
        handleReset,
    };
}

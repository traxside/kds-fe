import React, { useCallback } from "react";
import SaveSimulationModal from "@/components/SaveSimulationModal";
import LoadSimulationModal from "@/components/LoadSimulationModal";
import { useSimulationContext } from "@/context/SimulationContext";
import { simulationApiSimple } from "@/lib/api";
import { Simulation } from "@/types/simulation";

interface SimulationModalsProps {
    showSaveModal: boolean;
    showLoadModal: boolean;
    savedSimulations: Simulation[];
    savingSimulation: boolean;
    onCloseSaveModal: () => void;
    onCloseLoadModal: () => void;
    onSavingChange: (saving: boolean) => void;
}

export default function SimulationModals({
                                             showSaveModal,
                                             showLoadModal,
                                             savedSimulations,
                                             savingSimulation,
                                             onCloseSaveModal,
                                             onCloseLoadModal,
                                             onSavingChange,
                                         }: SimulationModalsProps) {
    const { simulation, loadSimulation } = useSimulationContext();

    const handleSaveSimulation = useCallback(async (name: string, description?: string) => {
        if (!simulation) return;

        onSavingChange(true);
        try {
            await simulationApiSimple.saveSimulationSnapshot(
                simulation.id,
                name,
                description
            );
            console.log("Simulation saved successfully");
            onCloseSaveModal();
        } catch (err) {
            console.error("Failed to save simulation:", err);
            throw err; // Re-throw to let modal handle the error
        } finally {
            onSavingChange(false);
        }
    }, [simulation, onSavingChange, onCloseSaveModal]);

    const handleLoadSimulation = useCallback(async (selectedSimulation: Simulation) => {
        try {
            await loadSimulation(selectedSimulation.id);
            onCloseLoadModal();
        } catch (err) {
            console.error("Failed to load simulation:", err);
            throw err; // Re-throw to let modal handle the error
        }
    }, [loadSimulation, onCloseLoadModal]);

    return (
        <>
            {/* Save Simulation Modal */}
            <SaveSimulationModal
                isOpen={showSaveModal}
                onClose={onCloseSaveModal}
                onSave={handleSaveSimulation}
                currentSimulation={simulation || undefined}
                existingSimulations={savedSimulations}
                defaultName={simulation?.name ? `${simulation.name} Copy` : `Simulation ${new Date().toLocaleString()}`}
                loading={savingSimulation}
            />

            {/* Load Simulation Modal */}
            <LoadSimulationModal
                isOpen={showLoadModal}
                onClose={onCloseLoadModal}
                onLoad={handleLoadSimulation}
                simulations={savedSimulations}
                loading={false}
                currentSimulation={simulation || undefined}
            />
        </>
    );
}

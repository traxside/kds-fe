import React from "react";
import PetriDishSection from "./PetriDishSection";
import RightSidePanel from "./RightSidePanel";

interface MainSimulationViewProps {
    onOpenSaveModal: () => void;
    onOpenLoadModal: () => void;
}

export default function MainSimulationView({
                                               onOpenSaveModal,
                                               onOpenLoadModal,
                                           }: MainSimulationViewProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <PetriDishSection
                onOpenSaveModal={onOpenSaveModal}
                onOpenLoadModal={onOpenLoadModal}
            />
            <RightSidePanel />
        </div>
    );
}

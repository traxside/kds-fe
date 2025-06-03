// import React, { useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
    LuSave,
    LuFolderOpen,
    LuPlay,
    LuPause,
    LuRefreshCw
} from "react-icons/lu";
import { useSimulationContext } from "@/context/SimulationContext";
import { useSimulationControls } from "@/hooks/useSimulationControls";
import { colors } from "@/lib/colors";

interface PetriDishControlsProps {
    onOpenSaveModal: () => void;
    onOpenLoadModal: () => void;
}

export default function PetriDishControls({
                                              onOpenSaveModal,
                                              onOpenLoadModal,
                                          }: PetriDishControlsProps) {
    const {
        simulation,
        isLoading,
        isSimulationRunning,
        isConnected,
    } = useSimulationContext();

    const { handlePlayPause, handleReset } = useSimulationControls();

    const buttonBaseStyle = {
        backgroundColor: `${colors.surface.a20}80`,
        borderColor: colors.surface.a20,
        color: colors.surface.a50,
    };

    const buttonHoverStyle = {
        backgroundColor: colors.surface.a20,
        color: colors.light,
    };

    return (
        <div className="flex space-x-2">
            {/* Save Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={onOpenSaveModal}
                disabled={isLoading || !simulation || !isConnected}
                style={buttonBaseStyle}
                onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, buttonHoverStyle);
                }}
                onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, buttonBaseStyle);
                }}
            >
                <LuSave className="h-4 w-4 mr-1" />
                Save
            </Button>

            {/* Load Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={onOpenLoadModal}
                disabled={isLoading || !isConnected}
                style={buttonBaseStyle}
                onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, buttonHoverStyle);
                }}
                onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, buttonBaseStyle);
                }}
            >
                <LuFolderOpen className="h-4 w-4 mr-1" />
                Load
            </Button>

            {/* Play/Pause Button */}
            <Button
                variant={isSimulationRunning ? "destructive" : "default"}
                size="sm"
                onClick={handlePlayPause}
                disabled={isLoading || (!simulation && !isConnected)}
                style={{
                    backgroundColor: isSimulationRunning ? "#dc2626" : colors.primary.a0,
                    color: isSimulationRunning ? colors.light : colors.surface.a0,
                    borderColor: colors.surface.a20,
                }}
            >
                {isLoading ? (
                    <>
                        <LuRefreshCw className="h-4 w-4 mr-1 animate-spin" />
                        {isSimulationRunning ? "Stopping..." : "Starting..."}
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

            {/* Reset Button */}
            <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
                style={buttonBaseStyle}
                onMouseEnter={(e) => {
                    Object.assign(e.currentTarget.style, buttonHoverStyle);
                }}
                onMouseLeave={(e) => {
                    Object.assign(e.currentTarget.style, buttonBaseStyle);
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
    );
}

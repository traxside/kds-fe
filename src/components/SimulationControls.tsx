"use client";

import React, { useState, useCallback, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  LuPlay,
  LuPause,
  LuSkipForward,
  LuSkipBack,
  LuChevronsLeft,
  LuChevronsRight,
  LuActivity,
  LuClock,
} from "react-icons/lu";
import { useSimulationControls } from "@/context/SimulationContext";

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

interface SimulationControlsProps {
  className?: string;
}

const SimulationControls = memo<SimulationControlsProps>(function SimulationControls({
  className = "",
}: SimulationControlsProps) {
  const {
    // Navigation state
    allGenerations,
    currentGenerationIndex,
    maxGenerations,
    isPlaybackMode,
    
    // Navigation actions
    navigateToGeneration,
    goToNextGeneration,
    goToPreviousGeneration,
    goToFirstGeneration,
    goToLastGeneration,
    
    // Control availability
    canNavigate,
    canGoNext,
    canGoPrevious,
    canGoToFirst,
    canGoToLast,
    
    isLoading,
  } = useSimulationControls();

  // Local state for auto-playback
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState([2]); // 1-5 scale for playback speed
  const [autoPlayInterval, setAutoPlayInterval] = useState<NodeJS.Timeout | null>(null);

  // Handle generation slider change
  const handleGenerationChange = useCallback((value: number[]) => {
    const newGenerationIndex = value[0];
    navigateToGeneration(newGenerationIndex);
  }, [navigateToGeneration]);

  // Handle auto-playback
  const handleAutoPlayToggle = useCallback(() => {
    if (isAutoPlaying) {
      // Stop auto-play
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
        setAutoPlayInterval(null);
      }
      setIsAutoPlaying(false);
    } else {
      // Start auto-play
      if (canNavigate && currentGenerationIndex < maxGenerations) {
        const speed = playbackSpeed[0];
        const intervalMs = Math.max(100, 1000 / speed); // Speed 1 = 1s, Speed 5 = 200ms
        
        const interval = setInterval(() => {
          if (currentGenerationIndex >= maxGenerations) {
            // Reached the end, stop auto-play
            clearInterval(interval);
            setAutoPlayInterval(null);
            setIsAutoPlaying(false);
            return;
          }
          goToNextGeneration();
        }, intervalMs);
        
        setAutoPlayInterval(interval);
        setIsAutoPlaying(true);
      }
    }
  }, [isAutoPlaying, autoPlayInterval, canNavigate, currentGenerationIndex, maxGenerations, playbackSpeed, goToNextGeneration]);

  // Handle playback speed change
  const handlePlaybackSpeedChange = useCallback((value: number[]) => {
    setPlaybackSpeed(value);
    
    // If auto-playing, restart with new speed
    if (isAutoPlaying && autoPlayInterval) {
      clearInterval(autoPlayInterval);
      const speed = value[0];
      const intervalMs = Math.max(100, 1000 / speed);
      
      const interval = setInterval(() => {
        if (currentGenerationIndex >= maxGenerations) {
          clearInterval(interval);
          setAutoPlayInterval(null);
          setIsAutoPlaying(false);
          return;
        }
        goToNextGeneration();
      }, intervalMs);
      
      setAutoPlayInterval(interval);
    }
  }, [isAutoPlaying, autoPlayInterval, currentGenerationIndex, maxGenerations, goToNextGeneration]);

  // Clean up interval on unmount
  React.useEffect(() => {
    return () => {
      if (autoPlayInterval) {
        clearInterval(autoPlayInterval);
      }
    };
  }, [autoPlayInterval]);

  if (!isPlaybackMode || allGenerations.length === 0) {
    return (
      <Card
        className={`w-full border ${className}`}
        style={{
          backgroundColor: `${colors.surface.a10}cc`,
          backdropFilter: "blur(12px)",
          borderColor: colors.surface.a20,
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <LuActivity className="h-5 w-5 mr-2" style={{ color: colors.primary.a0 }} />
            <span style={{ color: colors.light }}>Simulation Playback</span>
            <Badge
              variant="outline"
              className="text-xs border ml-auto"
              style={{
                backgroundColor: `${colors.surface.a20}80`,
                borderColor: colors.surface.a30,
                color: colors.light
              }}
            >
              No Data
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4" style={{ color: colors.surface.a50 }}>
            <LuClock className="mx-auto h-8 w-8 mb-2" />
            <p>Run a simulation to enable playback controls</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card
        className={`w-full border ${className}`}
        style={{
          backgroundColor: `${colors.surface.a10}cc`,
          backdropFilter: "blur(12px)",
          borderColor: colors.surface.a20,
        }}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <LuActivity className="h-5 w-5 mr-2" style={{ color: colors.primary.a0 }} />
            <span style={{ color: colors.light }}>Simulation Playback</span>
            <Badge
              variant="outline"
              className="text-xs border ml-auto"
              style={{
                backgroundColor: `${colors.surface.a20}80`,
                borderColor: colors.surface.a30,
                color: colors.light
              }}
            >
              Generation {currentGenerationIndex} / {maxGenerations}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Generation Navigation Slider */}
            <div className="space-y-2">
              <Label 
                className="text-sm font-medium flex items-center"
                style={{ color: colors.light }}
              >
                <LuClock className="h-4 w-4 mr-2" style={{ color: colors.primary.a0 }} />
                Generation Navigation
              </Label>
              <div className="space-y-2">
                <div
                  className="relative p-1 rounded-lg border"
                  style={{
                    backgroundColor: `${colors.surface.a20}40`,
                    borderColor: colors.surface.a30,
                  }}
                >
                  <Slider
                    value={[currentGenerationIndex]}
                    onValueChange={handleGenerationChange}
                    max={maxGenerations}
                    min={0}
                    step={1}
                    disabled={isLoading || !canNavigate}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                  <span>0</span>
                  <span>{Math.floor(maxGenerations / 2)}</span>
                  <span>{maxGenerations}</span>
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToFirstGeneration}
                    disabled={isLoading || !canGoToFirst}
                    className="h-8 w-8 p-0 border"
                    style={{
                      backgroundColor: `${colors.surface.a20}80`,
                      backdropFilter: "blur(8px)",
                      borderColor: colors.surface.a30,
                      color: colors.light
                    }}
                  >
                    <LuChevronsLeft className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="border"
                  style={{
                    backgroundColor: `${colors.surface.a10}f0`,
                    backdropFilter: "blur(12px)",
                    borderColor: colors.surface.a20,
                    color: colors.light
                  }}
                >
                  <p>Go to first generation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousGeneration}
                    disabled={isLoading || !canGoPrevious}
                    className="h-8 w-8 p-0 border"
                    style={{
                      backgroundColor: `${colors.surface.a20}80`,
                      backdropFilter: "blur(8px)",
                      borderColor: colors.surface.a30,
                      color: colors.light
                    }}
                  >
                    <LuSkipBack className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="border"
                  style={{
                    backgroundColor: `${colors.surface.a10}f0`,
                    backdropFilter: "blur(12px)",
                    borderColor: colors.surface.a20,
                    color: colors.light
                  }}
                >
                  <p>Previous generation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAutoPlayToggle}
                    disabled={isLoading || !canNavigate}
                    className="h-8 w-12 border"
                    style={{
                      backgroundColor: `${colors.surface.a20}80`,
                      backdropFilter: "blur(8px)",
                      borderColor: colors.surface.a30,
                      color: colors.light
                    }}
                  >
                    {isAutoPlaying ? (
                      <LuPause className="h-3 w-3" />
                    ) : (
                      <LuPlay className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="border"
                  style={{
                    backgroundColor: `${colors.surface.a10}f0`,
                    backdropFilter: "blur(12px)",
                    borderColor: colors.surface.a20,
                    color: colors.light
                  }}
                >
                  <p>{isAutoPlaying ? "Pause auto-playback" : "Start auto-playback"}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextGeneration}
                    disabled={isLoading || !canGoNext}
                    className="h-8 w-8 p-0 border"
                    style={{
                      backgroundColor: `${colors.surface.a20}80`,
                      backdropFilter: "blur(8px)",
                      borderColor: colors.surface.a30,
                      color: colors.light
                    }}
                  >
                    <LuSkipForward className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="border"
                  style={{
                    backgroundColor: `${colors.surface.a10}f0`,
                    backdropFilter: "blur(12px)",
                    borderColor: colors.surface.a20,
                    color: colors.light
                  }}
                >
                  <p>Next generation</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToLastGeneration}
                    disabled={isLoading || !canGoToLast}
                    className="h-8 w-8 p-0 border"
                    style={{
                      backgroundColor: `${colors.surface.a20}80`,
                      backdropFilter: "blur(8px)",
                      borderColor: colors.surface.a30,
                      color: colors.light
                    }}
                  >
                    <LuChevronsRight className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent
                  className="border"
                  style={{
                    backgroundColor: `${colors.surface.a10}f0`,
                    backdropFilter: "blur(12px)",
                    borderColor: colors.surface.a20,
                    color: colors.light
                  }}
                >
                  <p>Go to last generation</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Playback Speed Control */}
            <div className="space-y-2">
              <Label 
                className="text-sm font-medium flex items-center"
                style={{ color: colors.light }}
              >
                <LuActivity className="h-4 w-4 mr-2" style={{ color: colors.primary.a0 }} />
                Playback Speed
              </Label>
              <div className="space-y-2">
                <div
                  className="relative p-1 rounded-lg border"
                  style={{
                    backgroundColor: `${colors.surface.a20}40`,
                    borderColor: colors.surface.a30,
                  }}
                >
                  <Slider
                    value={playbackSpeed}
                    onValueChange={handlePlaybackSpeedChange}
                    max={5}
                    min={1}
                    step={1}
                    disabled={isLoading}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs" style={{ color: colors.surface.a50 }}>
                  <span>Slow</span>
                  <span>Fast</span>
                </div>
              </div>
            </div>

            {/* Current Generation Info */}
            <div className="text-center text-xs" style={{ color: colors.surface.a50 }}>
              <p>Viewing Generation {currentGenerationIndex} of {maxGenerations}</p>
              {isAutoPlaying && (
                <p style={{ color: colors.primary.a30 }} className="mt-1">Auto-playing...</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

export default SimulationControls;

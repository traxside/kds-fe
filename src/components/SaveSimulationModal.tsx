"use client";

import React, { useState } from "react";
import { LuSave, LuX, LuTriangleAlert } from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Simulation } from "@/types/simulation";

interface SaveSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<void>;
  currentSimulation?: Simulation;
  existingSimulations?: Simulation[];
  defaultName?: string;
  loading?: boolean;
}

const SaveSimulationModal: React.FC<SaveSimulationModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentSimulation,
  existingSimulations = [],
  defaultName = "",
  loading = false,
}) => {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setDescription("");
      setError(null);
      setShowOverwriteWarning(false);
    }
  }, [isOpen, defaultName]);

  // Check if name already exists
  const nameExists = existingSimulations.some(sim => 
    sim.name.toLowerCase() === name.toLowerCase().trim()
  );

  // Validation
  const isValidName = name.trim().length > 0 && name.trim().length <= 100;
  const isValidDescription = description.length <= 500;

  const handleSave = async () => {
    if (!isValidName) {
      setError("Simulation name is required and must be under 100 characters");
      return;
    }

    if (!isValidDescription) {
      setError("Description must be under 500 characters");
      return;
    }

    // Check for name conflicts
    if (nameExists && !showOverwriteWarning) {
      setShowOverwriteWarning(true);
      setError(null);
      return;
    }

    try {
      await onSave(name.trim(), description.trim() || undefined);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save simulation");
    }
  };

  const handleCancel = () => {
    setShowOverwriteWarning(false);
    setError(null);
    onClose();
  };

  const generateSuggestedName = () => {
    const base = "Simulation";
    const timestamp = new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    
    let counter = 1;
    let suggested = `${base} ${timestamp}`;
    
    while (existingSimulations.some(sim => sim.name.toLowerCase() === suggested.toLowerCase())) {
      suggested = `${base} ${timestamp} (${counter})`;
      counter++;
    }
    
    return suggested;
  };

  const getCurrentSimulationStats = () => {
    if (!currentSimulation) return null;

    const stats = currentSimulation.statistics;
    const currentPop = stats.totalPopulation[stats.totalPopulation.length - 1] || 0;
    const currentResistant = stats.resistantCount[stats.resistantCount.length - 1] || 0;
    const resistancePercentage = currentPop > 0 ? (currentResistant / currentPop) * 100 : 0;

    return {
      generation: currentSimulation.currentState.generation,
      population: currentPop,
      resistancePercentage,
      isRunning: currentSimulation.currentState.isRunning,
      isPaused: currentSimulation.currentState.isPaused
    };
  };

  if (!isOpen) return null;

  const stats = getCurrentSimulationStats();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Save Simulation</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={loading}
            >
              <LuX className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Simulation Info */}
          {stats && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Current Simulation State</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-muted-foreground">Generation:</span>
                  <span className="ml-1 font-medium">{stats.generation}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-muted-foreground">Population:</span>
                  <span className="ml-1 font-medium">{stats.population}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-muted-foreground">Resistance:</span>
                  <span className="ml-1 font-medium">{stats.resistancePercentage.toFixed(1)}%</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge 
                    variant={stats.isRunning ? "default" : stats.isPaused ? "secondary" : "outline"}
                    className="ml-1"
                  >
                    {stats.isRunning ? "Running" : stats.isPaused ? "Paused" : "Stopped"}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Name Input */}
          <div className="space-y-2">
            <label htmlFor="simulation-name" className="text-sm font-medium">
              Simulation Name *
            </label>
            <div className="space-y-2">
              <Input
                id="simulation-name"
                type="text"
                placeholder="Enter simulation name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setShowOverwriteWarning(false);
                  setError(null);
                }}
                className={nameExists && !showOverwriteWarning ? "border-orange-300" : ""}
                maxLength={100}
                disabled={loading}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{name.length}/100 characters</span>
                {name.trim().length === 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setName(generateSuggestedName())}
                    className="h-auto p-0 text-xs"
                    disabled={loading}
                  >
                    Suggest name
                  </Button>
                )}
              </div>
            </div>
            {nameExists && !showOverwriteWarning && (
              <div className="flex items-center space-x-1 text-xs text-orange-600">
                <LuTriangleAlert className="h-3 w-3" />
                <span>A simulation with this name already exists</span>
              </div>
            )}
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <label htmlFor="simulation-description" className="text-sm font-medium">
              Description (optional)
            </label>
            <textarea
              id="simulation-description"
              placeholder="Describe this simulation run..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              disabled={loading}
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {description.length}/500 characters
            </div>
          </div>

          {/* Overwrite Warning */}
          {showOverwriteWarning && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md p-3">
              <div className="flex items-start space-x-2">
                <LuTriangleAlert className="h-4 w-4 text-orange-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    Overwrite existing simulation?
                  </p>
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    A simulation with the name "{name}" already exists. Saving will replace the existing simulation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValidName || !isValidDescription || loading}
              className="flex-1"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <LuSave className="h-4 w-4" />
                  <span>{showOverwriteWarning ? "Overwrite" : "Save"}</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SaveSimulationModal; 
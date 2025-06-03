"use client";

import React, { useState, useMemo } from "react";
import { LuPlay, LuX, LuSearch, LuCalendar, LuClock, LuShield, LuUsers } from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Simulation } from "@/types/simulation";

interface LoadSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (simulation: Simulation) => Promise<void>;
  simulations: Simulation[];
  loading?: boolean;
  currentSimulation?: Simulation;
}

const LoadSimulationModal: React.FC<LoadSimulationModalProps> = ({
  isOpen,
  onClose,
  onLoad,
  simulations,
  loading = false,
  currentSimulation,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [loadingSimulation, setLoadingSimulation] = useState(false);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedSimulation(null);
      setLoadingSimulation(false);
    }
  }, [isOpen]);

  // Filter simulations based on search query
  const filteredSimulations = useMemo(() => {
    if (!searchQuery.trim()) return simulations;
    
    const query = searchQuery.toLowerCase();
    return simulations.filter(sim => 
      sim.name.toLowerCase().includes(query) ||
      sim.description?.toLowerCase().includes(query)
    );
  }, [simulations, searchQuery]);

  // Sort simulations by creation date (newest first)
  const sortedSimulations = useMemo(() => {
    return [...filteredSimulations].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [filteredSimulations]);

  const handleLoad = async () => {
    if (!selectedSimulation) return;

    try {
      setLoadingSimulation(true);
      await onLoad(selectedSimulation);
      onClose();
    } catch (err) {
      // Error handling is done by parent component
      console.error("Failed to load simulation:", err);
    } finally {
      setLoadingSimulation(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getSimulationStatus = (simulation: Simulation) => {
    if (simulation.currentState.isRunning) {
      return { label: "Running", color: "bg-green-500" };
    } else if (simulation.currentState.isPaused) {
      return { label: "Paused", color: "bg-yellow-500" };
    } else {
      return { label: "Completed", color: "bg-gray-500" };
    }
  };

  const getResistanceInfo = (simulation: Simulation) => {
    const stats = simulation.statistics;
    if (!stats.resistantCount.length || !stats.totalPopulation.length) {
      return 0;
    }
    
    const latest = stats.resistantCount[stats.resistantCount.length - 1];
    const total = stats.totalPopulation[stats.totalPopulation.length - 1];
    return total > 0 ? (latest / total) * 100 : 0;
  };

  const isCurrentSimulation = (simulation: Simulation) => {
    return currentSimulation?.id === simulation.id;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Load Simulation</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loadingSimulation}
            >
              <LuX className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search simulations by name or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={loadingSimulation}
            />
          </div>
        </CardHeader>

        <div className="flex flex-1 overflow-hidden">
          {/* Simulation List */}
          <div className="w-1/2 border-r overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading simulations...</p>
                </div>
              </div>
            ) : sortedSimulations.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-lg text-muted-foreground mb-2">No simulations found</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Try adjusting your search criteria" : "Create your first simulation to get started"}
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {sortedSimulations.map((simulation) => {
                  const status = getSimulationStatus(simulation);
                  const { date, time } = formatDate(simulation.createdAt);
                  const resistance = getResistanceInfo(simulation);
                  const isSelected = selectedSimulation?.id === simulation.id;
                  const isCurrent = isCurrentSimulation(simulation);

                  return (
                    <Card
                      key={simulation.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? "ring-2 ring-primary" : ""
                      } ${isCurrent ? "border-blue-300 bg-blue-50 dark:bg-blue-900/20" : ""}`}
                      onClick={() => setSelectedSimulation(simulation)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium truncate">{simulation.name}</h3>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-xs">
                                  Current
                                </Badge>
                              )}
                            </div>
                            {simulation.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {simulation.description}
                              </p>
                            )}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${status.color} ml-2 mt-1`} />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <LuCalendar className="h-3 w-3" />
                            <span>{date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <LuClock className="h-3 w-3" />
                            <span>{time}</span>
                          </div>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center">
                            <p className="text-muted-foreground">Gen</p>
                            <p className="font-medium">{simulation.currentState.generation}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Pop</p>
                            <p className="font-medium">{simulation.currentState.bacteria.length}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-muted-foreground">Resist</p>
                            <p className="font-medium">{resistance.toFixed(1)}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Simulation Preview */}
          <div className="w-1/2 overflow-y-auto">
            {selectedSimulation ? (
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedSimulation.name}</h3>
                  {selectedSimulation.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedSimulation.description}
                    </p>
                  )}
                </div>

                <Separator />

                {/* Status Info */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Current State</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant="outline">
                        {getSimulationStatus(selectedSimulation).label}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Generation</p>
                      <p className="font-medium">{selectedSimulation.currentState.generation}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Population</p>
                      <div className="flex items-center space-x-1">
                        <LuUsers className="h-3 w-3" />
                        <span className="font-medium">{selectedSimulation.currentState.bacteria.length}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Resistance</p>
                      <div className="flex items-center space-x-1">
                        <LuShield className="h-3 w-3" />
                        <span className="font-medium">{getResistanceInfo(selectedSimulation).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parameters */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Simulation Parameters</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Initial Population</p>
                      <p className="font-medium">{selectedSimulation.parameters.initialPopulation}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Growth Rate</p>
                      <p className="font-medium">{(selectedSimulation.parameters.growthRate * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Antibiotic Concentration</p>
                      <p className="font-medium">{(selectedSimulation.parameters.antibioticConcentration * 100).toFixed(0)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Mutation Rate</p>
                      <p className="font-medium">{(selectedSimulation.parameters.mutationRate * 100).toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{selectedSimulation.parameters.duration} generations</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Petri Dish Size</p>
                      <p className="font-medium">{selectedSimulation.parameters.petriDishSize}px</p>
                    </div>
                  </div>
                </div>

                {/* Statistics */}
                {selectedSimulation.statistics.totalPopulation.length > 1 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Progress Statistics</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Total Generations</p>
                        <p className="font-medium">{selectedSimulation.statistics.generations.length}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mutation Events</p>
                        <p className="font-medium">{selectedSimulation.statistics.mutationEvents.reduce((a, b) => a + b, 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reproductions</p>
                        <p className="font-medium">{selectedSimulation.statistics.reproductions.reduce((a, b) => a + b, 0)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Antibiotic Deaths</p>
                        <p className="font-medium">{selectedSimulation.statistics.antibioticDeaths.reduce((a, b) => a + b, 0)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Created/Updated */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Timeline</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDate(selectedSimulation.createdAt).date} at {formatDate(selectedSimulation.createdAt).time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Updated:</span>
                      <span>{formatDate(selectedSimulation.updatedAt).date} at {formatDate(selectedSimulation.updatedAt).time}</span>
                    </div>
                    {selectedSimulation.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Completed:</span>
                        <span>{formatDate(selectedSimulation.completedAt).date} at {formatDate(selectedSimulation.completedAt).time}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <p>Select a simulation to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t p-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {sortedSimulations.length} simulation{sortedSimulations.length !== 1 ? 's' : ''} available
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loadingSimulation}
              >
                Cancel
              </Button>
              <Button
                onClick={handleLoad}
                disabled={!selectedSimulation || loadingSimulation}
              >
                {loadingSimulation ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LuPlay className="h-4 w-4" />
                    <span>Load Simulation</span>
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LoadSimulationModal; 
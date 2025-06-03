"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LuX,
  LuLayers,
  LuDownload,
  LuArrowRight,
  LuArrowDown,
  LuEqual,
  LuCalendar,
  LuClock,
  LuActivity,
  LuShield,
  LuUsers,
  LuZap,
  LuTrendingUp,
  LuInfo,
} from "react-icons/lu";
import { Simulation } from "@/types/simulation";

interface SimulationComparisonViewProps {
  simulations: Simulation[];
  onClose: () => void;
  onRemoveSimulation: (simulationId: string) => void;
  onExportComparison?: () => void;
  className?: string;
}

// Helper function to determine if two values are different
const isDifferent = (val1: any, val2: any): boolean => {
  if (typeof val1 === 'number' && typeof val2 === 'number') {
    return Math.abs(val1 - val2) > 0.001; // Small threshold for floating point comparison
  }
  return val1 !== val2;
};

// Helper function to get difference indicator
const getDifferenceIndicator = (baseValue: any, compareValue: any) => {
  if (!isDifferent(baseValue, compareValue)) {
    return { icon: LuEqual, color: "text-gray-500", bgColor: "bg-gray-100" };
  }
  
  if (typeof baseValue === 'number' && typeof compareValue === 'number') {
    if (compareValue > baseValue) {
      return { icon: LuTrendingUp, color: "text-green-600", bgColor: "bg-green-100" };
    } else {
      return { icon: LuArrowDown, color: "text-red-600", bgColor: "bg-red-100" };
    }
  }
  
  return { icon: LuArrowRight, color: "text-orange-600", bgColor: "bg-orange-100" };
};

const SimulationComparisonView: React.FC<SimulationComparisonViewProps> = ({
  simulations,
  onClose,
  onRemoveSimulation,
  onExportComparison,
  className = "",
}) => {
  const [syncScroll, setSyncScroll] = useState(true);
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  // Get latest statistics
  const getLatestStats = (simulation: Simulation) => {
    const stats = simulation.statistics;
    if (!stats.totalPopulation.length) return null;
    
    const latest = stats.totalPopulation.length - 1;
    const totalPop = stats.totalPopulation[latest] || 0;
    const resistantPop = stats.resistantCount[latest] || 0;
    const resistancePercentage = totalPop > 0 ? (resistantPop / totalPop) * 100 : 0;
    
    return {
      generation: simulation.currentState.generation,
      totalPopulation: totalPop,
      resistantPopulation: resistantPop,
      resistancePercentage,
      isRunning: simulation.currentState.isRunning,
      isPaused: simulation.currentState.isPaused,
    };
  };

  // Handle synchronized scrolling
  const handleScroll = (index: number, event: React.UIEvent<HTMLDivElement>) => {
    if (!syncScroll) return;
    
    const scrollTop = event.currentTarget.scrollTop;
    scrollRefs.current.forEach((ref, i) => {
      if (i !== index && ref) {
        ref.scrollTop = scrollTop;
      }
    });
  };

  // Get comparison data for parameters
  const parameterComparison = useMemo(() => {
    if (simulations.length < 2) return [];
    
    const baseSimulation = simulations[0];
    const comparisons: Array<{
      label: string;
      baseValue: any;
      values: any[];
      format: (val: any) => string;
      hasDifferences: boolean;
    }> = [];
    
    const parameterKeys = [
      { key: 'initialPopulation', label: 'Initial Population', format: (val: number) => val.toString() },
      { key: 'growthRate', label: 'Growth Rate', format: (val: number) => `${(val * 100).toFixed(1)}%` },
      { key: 'antibioticConcentration', label: 'Antibiotic Concentration', format: (val: number) => `${(val * 100).toFixed(0)}%` },
      { key: 'mutationRate', label: 'Mutation Rate', format: (val: number) => `${(val * 100).toFixed(1)}%` },
      { key: 'duration', label: 'Duration', format: (val: number) => `${val} generations` },
      { key: 'petriDishSize', label: 'Petri Dish Size', format: (val: number) => `${val}px` },
    ];

    parameterKeys.forEach(({ key, label, format }) => {
      const baseValue = baseSimulation.parameters[key as keyof typeof baseSimulation.parameters];
      const values = simulations.map(sim => sim.parameters[key as keyof typeof sim.parameters]);
      const hasDifferences = values.some(val => isDifferent(baseValue, val));
      
      comparisons.push({
        label,
        baseValue,
        values,
        format,
        hasDifferences,
      });
    });
    
    return comparisons;
  }, [simulations]);

  if (simulations.length === 0) {
    return (
      <div className="p-8 text-center">
        <LuLayers className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Simulations to Compare</h3>
        <p className="text-gray-600">Select multiple simulations from the history to start comparing.</p>
      </div>
    );
  }

  if (simulations.length === 1) {
    return (
      <div className="p-8 text-center">
        <LuLayers className="h-16 w-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select More Simulations</h3>
        <p className="text-gray-600">Add at least one more simulation to start comparing.</p>
        <Button variant="outline" onClick={onClose} className="mt-4">
          Back to History
        </Button>
      </div>
    );
  }

  return (
    <div className={`h-full flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white">
        <div className="flex items-center space-x-2">
          <LuLayers className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold">Simulation Comparison</h2>
          <Badge variant="secondary">{simulations.length} simulations</Badge>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSyncScroll(!syncScroll)}
            className={syncScroll ? "bg-blue-50 border-blue-200" : ""}
          >
            {syncScroll ? "Sync: ON" : "Sync: OFF"}
          </Button>
          {onExportComparison && (
            <Button variant="outline" size="sm" onClick={onExportComparison}>
              <LuDownload className="h-4 w-4 mr-1" />
              Export
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>
            <LuX className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Parameter Comparison Table */}
      <div className="p-4 border-b bg-gray-50">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Parameter Comparison</h3>
        <div className="space-y-2">
          {parameterComparison.map((param) => (
            <div key={param.label} className={`grid grid-cols-${Math.min(simulations.length + 1, 6)} gap-2 text-sm`}>
              <div className="font-medium text-gray-700">{param.label}</div>
              {param.values.map((value, index) => {
                const diff = index === 0 ? null : getDifferenceIndicator(param.baseValue, value);
                return (
                  <div key={index} className="flex items-center space-x-1">
                    {diff && (
                      <div className={`p-1 rounded ${diff.bgColor}`}>
                        <diff.icon className={`h-3 w-3 ${diff.color}`} />
                      </div>
                    )}
                    <span className={param.hasDifferences && index > 0 && isDifferent(param.baseValue, value) 
                      ? "font-medium text-blue-600" 
                      : "text-gray-600"}>
                      {param.format(value)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Simulation Comparison Cards */}
      <div className="flex-1 overflow-hidden">
        <div className={`grid h-full ${simulations.length === 2 ? 'grid-cols-2' : simulations.length === 3 ? 'grid-cols-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'} gap-1`}>
          {simulations.map((simulation, index) => {
            const stats = getLatestStats(simulation);
            const { date, time } = formatDate(simulation.createdAt);

            return (
              <div key={simulation.id} className="border-r last:border-r-0 h-full">
                <ScrollArea
                  className="h-full"
                  ref={(el) => { scrollRefs.current[index] = el?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement; }}
                  onScrollCapture={(e) => handleScroll(index, e)}
                >
                  <div className="p-4 space-y-4">
                    {/* Simulation Header */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-gray-900 truncate pr-2">{simulation.name}</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveSimulation(simulation.id)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                        >
                          <LuX className="h-3 w-3" />
                        </Button>
                      </div>
                      {simulation.description && (
                        <p className="text-xs text-gray-600 line-clamp-2">{simulation.description}</p>
                      )}
                    </div>

                    <Separator />

                    {/* Status and Basic Info */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-1 text-gray-600">
                          <LuCalendar className="h-3 w-3" />
                          <span>{date}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-600">
                          <LuClock className="h-3 w-3" />
                          <span>{time}</span>
                        </div>
                      </div>

                      {stats && (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-1 text-gray-600">
                              <LuActivity className="h-3 w-3" />
                              <span>Generation</span>
                            </div>
                            <div className="font-semibold">{stats.generation}</div>
                          </div>
                          
                          <div className="bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-1 text-gray-600">
                              <LuUsers className="h-3 w-3" />
                              <span>Population</span>
                            </div>
                            <div className="font-semibold">{stats.totalPopulation}</div>
                          </div>

                          <div className="bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-1 text-gray-600">
                              <LuShield className="h-3 w-3" />
                              <span>Resistant</span>
                            </div>
                            <div className="font-semibold">{stats.resistantPopulation}</div>
                          </div>

                          <div className="bg-gray-50 p-2 rounded">
                            <div className="flex items-center space-x-1 text-gray-600">
                              <LuZap className="h-3 w-3" />
                              <span>Resistance %</span>
                            </div>
                            <div className="font-semibold">{stats.resistancePercentage.toFixed(1)}%</div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={stats?.isRunning ? "default" : stats?.isPaused ? "secondary" : "outline"}
                          className="text-xs"
                        >
                          {stats?.isRunning ? "Running" : stats?.isPaused ? "Paused" : "Completed"}
                        </Badge>
                        {index === 0 && (
                          <Badge variant="outline" className="text-xs">
                            Base
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Detailed Parameters */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-900">Parameters</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Initial Population:</span>
                          <span className="font-mono">{simulation.parameters.initialPopulation}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Growth Rate:</span>
                          <span className="font-mono">{(simulation.parameters.growthRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Antibiotic:</span>
                          <span className="font-mono">{(simulation.parameters.antibioticConcentration * 100).toFixed(0)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mutation Rate:</span>
                          <span className="font-mono">{(simulation.parameters.mutationRate * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Duration:</span>
                          <span className="font-mono">{simulation.parameters.duration} gen</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-gray-900">Timeline</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created:</span>
                          <span>{formatDate(simulation.createdAt).date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Updated:</span>
                          <span>{formatDate(simulation.updatedAt).date}</span>
                        </div>
                        {simulation.completedAt && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Completed:</span>
                            <span>{formatDate(simulation.completedAt).date}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t bg-gray-50 text-xs text-gray-600 flex items-center space-x-4">
        <div className="flex items-center space-x-1">
          <LuInfo className="h-3 w-3" />
          <span>Synchronized scrolling: {syncScroll ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-blue-100 rounded border border-blue-200"></div>
          <span>Different values highlighted</span>
        </div>
      </div>
    </div>
  );
};

export default SimulationComparisonView; 
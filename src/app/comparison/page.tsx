"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LuLayers, LuArrowLeft, LuHistory } from "react-icons/lu";
import SimulationHistory from "@/components/SimulationHistory";
import SimulationComparisonView from "@/components/SimulationComparisonView";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Simulation } from "@/types/simulation";
import Link from "next/link";

const ComparisonPage: React.FC = () => {
  const [selectedSimulations, setSelectedSimulations] = useState<Simulation[]>([]);
  const [viewMode, setViewMode] = useState<"select" | "compare">("select");

  const handleCompareSimulations = (simulations: Simulation[]) => {
    setSelectedSimulations(simulations);
    setViewMode("compare");
  };

  const handleBackToSelection = () => {
    setViewMode("select");
  };

  const handleRemoveSimulation = (simulationId: string) => {
    setSelectedSimulations(prev => prev.filter(sim => sim.id !== simulationId));
    // If we have less than 2 simulations, go back to selection mode
    if (selectedSimulations.length <= 2) {
      setViewMode("select");
    }
  };

  const handleExportComparison = () => {
    // Create a comprehensive comparison report
    const report = {
      timestamp: new Date().toISOString(),
      simulations: selectedSimulations.map(sim => ({
        id: sim.id,
        name: sim.name,
        description: sim.description,
        createdAt: sim.createdAt,
        parameters: sim.parameters,
        statistics: sim.statistics,
        currentState: sim.currentState,
      })),
      summary: {
        totalSimulations: selectedSimulations.length,
        parameterDifferences: [], // Would be computed
        performanceComparison: {}, // Would be computed
      },
    };

    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `simulation_comparison_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white border-b shadow-sm">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/">
                  <Button variant="ghost" size="sm">
                    <LuArrowLeft className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </Link>
                <div className="h-6 w-px bg-gray-300"></div>
                <div className="flex items-center space-x-2">
                  <LuLayers className="h-6 w-6 text-blue-600" />
                  <h1 className="text-2xl font-bold text-gray-900">
                    Simulation Comparison
                  </h1>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {viewMode === "compare" && (
                  <Badge variant="secondary">
                    Comparing {selectedSimulations.length} simulations
                  </Badge>
                )}
                <Badge variant="outline" className="text-blue-600 border-blue-200">
                  <LuHistory className="h-3 w-3 mr-1" />
                  Analysis Tool
                </Badge>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="container mx-auto px-6 py-6">
          {viewMode === "select" ? (
            <div className="space-y-6">
              {/* Instructions */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start space-x-3">
                    <LuLayers className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-blue-900 mb-1">
                        Compare Multiple Simulations
                      </h3>
                      <p className="text-sm text-blue-700">
                        Select 2 or more simulations from your history to compare their parameters, 
                        results, and evolution patterns side by side. This tool helps you understand 
                        how different settings affect bacterial evolution and resistance development.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Simulation History with Multi-Select */}
              <SimulationHistory
                allowMultiSelect={true}
                compareMode={true}
                onCompareSimulations={handleCompareSimulations}
                className="bg-white rounded-lg shadow-sm"
              />
            </div>
          ) : (
            <div className="h-[calc(100vh-8rem)]">
              <Card className="h-full">
                <CardContent className="p-0 h-full">
                  <SimulationComparisonView
                    simulations={selectedSimulations}
                    onClose={handleBackToSelection}
                    onRemoveSimulation={handleRemoveSimulation}
                    onExportComparison={handleExportComparison}
                    className="h-full"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ComparisonPage; 
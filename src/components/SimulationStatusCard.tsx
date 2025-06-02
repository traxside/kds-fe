"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LuActivity, LuWifi, LuWifiOff, LuTriangleAlert } from "react-icons/lu";
import { useSimulationStatus, useSimulationErrors } from "@/context/SimulationContext";

/**
 * Example component that uses specialized context hooks
 * This demonstrates how the context allows for focused, optimized components
 */
export default function SimulationStatusCard() {
  // Use specific hooks for only the data we need
  const { 
    hasSimulation, 
    currentGeneration, 
    isSimulationRunning, 
    isHealthy 
  } = useSimulationStatus();
  
  const { 
    hasError, 
    errorType, 
    isNetworkError, 
    clearError 
  } = useSimulationErrors();

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center">
          <LuActivity className="h-4 w-4 mr-2" />
          Simulation Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Connection</span>
          <div className="flex items-center">
            {isNetworkError ? (
              <LuWifiOff className="h-4 w-4 mr-1 text-red-500" />
            ) : (
              <LuWifi className="h-4 w-4 mr-1 text-green-500" />
            )}
            <Badge variant={isNetworkError ? "destructive" : "default"}>
              {isNetworkError ? "Offline" : "Online"}
            </Badge>
          </div>
        </div>

        {/* Simulation Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Status</span>
          <Badge variant={isSimulationRunning ? "default" : "secondary"}>
            {hasSimulation 
              ? (isSimulationRunning ? "Running" : "Paused")
              : "No Simulation"
            }
          </Badge>
        </div>

        {/* Generation Counter */}
        {hasSimulation && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Generation</span>
            <span className="font-mono text-sm">{currentGeneration}</span>
          </div>
        )}

        {/* Error Display */}
        {hasError && (
          <Alert variant="destructive" className="mt-3">
            <LuTriangleAlert className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-xs">
                {errorType === 'network' ? 'Connection Error' : 'Simulation Error'}
              </span>
              <button 
                onClick={clearError}
                className="text-xs underline hover:no-underline"
              >
                Clear
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Health Indicator */}
        <div className="pt-2 border-t">
          <div className="flex items-center">
            <div 
              className={`w-2 h-2 rounded-full mr-2 ${
                isHealthy ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-xs text-gray-500">
              System {isHealthy ? 'Healthy' : 'Issues Detected'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
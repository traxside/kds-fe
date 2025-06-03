"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LuLoader, LuHardDrive, LuDatabase, LuActivity } from "react-icons/lu";
import { ProgressiveLoadingState } from "@/hooks/useProgressiveLoader";

interface ProgressiveLoadingIndicatorProps {
  state: ProgressiveLoadingState;
  showDetails?: boolean;
  className?: string;
}

/**
 * Progress indicator for progressive loading operations
 * 
 * Displays loading progress, memory usage, and chunk statistics
 * for progressive data loading systems.
 */
export function ProgressiveLoadingIndicator({
  state,
  showDetails = false,
  className = ""
}: ProgressiveLoadingIndicatorProps) {
  const { isLoading, progress, error, memoryUsage } = state;
  
  const progressPercentage = progress.total > 0 
    ? Math.round((progress.loaded / progress.total) * 100)
    : 0;

  const memoryColor = memoryUsage.estimatedMB > 80 
    ? "text-red-400" 
    : memoryUsage.estimatedMB > 50 
      ? "text-yellow-400" 
      : "text-green-400";

  if (!showDetails && !isLoading && !error) {
    return null;
  }

  return (
    <Card className={`border-gray-600 bg-gray-800/50 ${className}`}>
      <CardContent className="p-3">
        <div className="space-y-3">
          {/* Loading Status */}
          {(isLoading || error) && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isLoading && (
                  <LuLoader className="h-4 w-4 animate-spin text-blue-400" />
                )}
                <span className="text-sm text-gray-300">
                  {error ? "Error" : progress.status || "Loading..."}
                </span>
              </div>
              {isLoading && progress.total > 0 && (
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {progressPercentage}%
                </Badge>
              )}
            </div>
          )}

          {/* Progress Bar */}
          {isLoading && progress.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-400">
                <span>{progress.loaded} / {progress.total} chunks</span>
                <span>{progressPercentage}%</span>
              </div>
              <Progress 
                value={progressPercentage} 
                className="h-2"
              />
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-2 rounded bg-red-900/20 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Memory Usage and Stats */}
          {showDetails && (
            <div className="grid grid-cols-3 gap-3 text-xs">
              {/* Memory Usage */}
              <div className="flex items-center space-x-1">
                <LuHardDrive className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Memory:</span>
                <span className={memoryColor}>
                  {memoryUsage.estimatedMB.toFixed(1)}MB
                </span>
              </div>

              {/* Chunks Loaded */}
              <div className="flex items-center space-x-1">
                <LuDatabase className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Chunks:</span>
                <span className="text-cyan-400">
                  {memoryUsage.chunksLoaded}/{memoryUsage.totalChunks}
                </span>
              </div>

              {/* Cache Hit Rate */}
              <div className="flex items-center space-x-1">
                <LuActivity className="h-3 w-3 text-gray-400" />
                <span className="text-gray-400">Loaded:</span>
                <span className="text-green-400">
                  {memoryUsage.totalChunks > 0 
                    ? ((memoryUsage.chunksLoaded / memoryUsage.totalChunks) * 100).toFixed(0)
                    : 0}%
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact progress indicator for inline display
 */
export function CompactProgressiveLoadingIndicator({
  state,
  className = ""
}: Pick<ProgressiveLoadingIndicatorProps, 'state' | 'className'>) {
  const { isLoading, progress, error, memoryUsage } = state;
  
  const progressPercentage = progress.total > 0 
    ? Math.round((progress.loaded / progress.total) * 100)
    : 0;

  if (!isLoading && !error && memoryUsage.chunksLoaded === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 text-xs ${className}`}>
      {isLoading && (
        <>
          <LuLoader className="h-3 w-3 animate-spin text-blue-400" />
          <span className="text-gray-400">{progressPercentage}%</span>
        </>
      )}
      
      {error && (
        <Badge variant="destructive" className="text-xs">
          Error
        </Badge>
      )}
      
      {memoryUsage.chunksLoaded > 0 && (
        <Badge variant="outline" className="text-xs text-cyan-400 border-cyan-400">
          {memoryUsage.chunksLoaded} chunks
        </Badge>
      )}
      
      {memoryUsage.estimatedMB > 0 && (
        <span className="text-gray-500">
          {memoryUsage.estimatedMB.toFixed(1)}MB
        </span>
      )}
    </div>
  );
}

/**
 * Memory usage warning component
 */
export function MemoryUsageWarning({
  state,
  maxMemoryMB = 100,
  className = ""
}: ProgressiveLoadingIndicatorProps & { maxMemoryMB?: number }) {
  const { memoryUsage } = state;
  const usagePercentage = (memoryUsage.estimatedMB / maxMemoryMB) * 100;
  
  if (usagePercentage < 70) {
    return null;
  }

  const warningLevel = usagePercentage > 90 ? "critical" : "warning";
  const bgColor = warningLevel === "critical" ? "bg-red-900/20" : "bg-yellow-900/20";
  const borderColor = warningLevel === "critical" ? "border-red-500/20" : "border-yellow-500/20";
  const textColor = warningLevel === "critical" ? "text-red-400" : "text-yellow-400";

  return (
    <Card className={`${bgColor} ${borderColor} border ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center space-x-2">
          <LuHardDrive className={`h-4 w-4 ${textColor}`} />
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <span className={`text-sm font-medium ${textColor}`}>
                {warningLevel === "critical" ? "Critical Memory Usage" : "High Memory Usage"}
              </span>
              <span className={`text-xs ${textColor}`}>
                {memoryUsage.estimatedMB.toFixed(1)}MB / {maxMemoryMB}MB
              </span>
            </div>
            <Progress 
              value={Math.min(usagePercentage, 100)} 
              className="h-2 mt-1"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {warningLevel === "critical" 
            ? "Memory usage is critical. Some data may be automatically evicted."
            : "Consider clearing some data to improve performance."
          }
        </p>
      </CardContent>
    </Card>
  );
}

export default ProgressiveLoadingIndicator; 
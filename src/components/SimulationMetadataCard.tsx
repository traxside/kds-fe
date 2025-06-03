"use client";

import React from "react";
import { 
  LuTag, 
  LuStar, 
  LuHeart, 
  LuClock, 
  LuCpu, 
  LuMemoryStick, 
  LuMonitor,
  LuTrendingUp,
  LuActivity,
  LuShield,
  LuZap,
  LuInfo,
  LuUser,
  LuGlobe,
  LuBookmark,
  LuCalendar
} from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Simulation, SimulationMetadata } from "@/types/simulation";

interface SimulationMetadataCardProps {
  simulation: Simulation;
  compact?: boolean;
  showTechnicalDetails?: boolean;
  onEditMetadata?: (simulation: Simulation) => void;
  className?: string;
}

export default function SimulationMetadataCard({
  simulation,
  compact = false,
  showTechnicalDetails = false,
  onEditMetadata,
  className = "",
}: SimulationMetadataCardProps) {
  const metadata = simulation.metadata;

  if (!metadata) {
    return (
      <Card className={`${className}`}>
        <CardContent className="pt-6">
          <div className="text-center py-4 text-muted-foreground">
            <LuInfo className="h-8 w-8 mx-auto mb-2" />
            <p>No metadata available</p>
            {onEditMetadata && (
              <button 
                onClick={() => onEditMetadata(simulation)}
                className="mt-2 text-blue-600 hover:text-blue-700"
              >
                Add metadata
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  const getRatingStars = (rating?: number) => {
    if (!rating) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <LuStar
        key={i}
        className={`h-4 w-4 ${
          i < rating ? "text-yellow-500 fill-current" : "text-gray-300"
        }`}
      />
    ));
  };

  const getComplexityColor = (complexity: number) => {
    if (complexity <= 3) return "bg-green-100 text-green-800";
    if (complexity <= 6) return "bg-yellow-100 text-yellow-800";
    if (complexity <= 8) return "bg-orange-100 text-orange-800";
    return "bg-red-100 text-red-800";
  };

  const getComplexityLabel = (complexity: number) => {
    if (complexity <= 3) return "Simple";
    if (complexity <= 6) return "Moderate";
    if (complexity <= 8) return "Complex";
    return "Very Complex";
  };

  if (compact) {
    return (
      <Card className={`${className}`}>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {/* Category and Rating */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="capitalize">
                {metadata.category}
              </Badge>
              <div className="flex items-center space-x-2">
                {metadata.favorite && (
                  <LuHeart className="h-4 w-4 text-red-500 fill-current" />
                )}
                {metadata.rating && (
                  <div className="flex items-center space-x-1">
                    {getRatingStars(metadata.rating)}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {metadata.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {metadata.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    <LuTag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {metadata.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{metadata.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Complexity */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Complexity:</span>
              <Badge className={getComplexityColor(metadata.complexityMetrics.parameterComplexity)}>
                {getComplexityLabel(metadata.complexityMetrics.parameterComplexity)}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Simulation Metadata</CardTitle>
          {onEditMetadata && (
            <button 
              onClick={() => onEditMetadata(simulation)}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Edit
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* User-Editable Information */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center">
            <LuUser className="h-4 w-4 mr-2" />
            General Information
          </h4>
          
          {/* Category and Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Category</label>
              <div className="mt-1">
                <Badge variant="outline" className="capitalize">
                  {metadata.category}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Status</label>
              <div className="mt-1 flex items-center space-x-2">
                {metadata.favorite && (
                  <LuHeart className="h-4 w-4 text-red-500 fill-current" />
                )}
                {metadata.isPublic && (
                  <LuGlobe className="h-4 w-4 text-blue-500" />
                )}
                {!metadata.favorite && !metadata.isPublic && (
                  <span className="text-sm text-muted-foreground">Private</span>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          {metadata.rating && (
            <div>
              <label className="text-sm text-muted-foreground">Rating</label>
              <div className="mt-1 flex items-center space-x-1">
                {getRatingStars(metadata.rating)}
                <span className="ml-2 text-sm text-muted-foreground">
                  ({metadata.rating}/5)
                </span>
              </div>
            </div>
          )}

          {/* Tags */}
          {metadata.tags.length > 0 && (
            <div>
              <label className="text-sm text-muted-foreground">Tags</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {metadata.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    <LuTag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {metadata.notes && (
            <div>
              <label className="text-sm text-muted-foreground">Notes</label>
              <div className="mt-1 p-3 bg-gray-50 rounded-md">
                <p className="text-sm">{metadata.notes}</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Performance Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center">
            <LuActivity className="h-4 w-4 mr-2" />
            Performance Metrics
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-muted-foreground flex items-center">
                <LuClock className="h-3 w-3 mr-1" />
                Execution Time
              </label>
              <p className="font-medium">
                {formatTime(metadata.performanceMetrics.totalExecutionTime)}
              </p>
            </div>
            
            <div>
              <label className="text-sm text-muted-foreground flex items-center">
                <LuTrendingUp className="h-3 w-3 mr-1" />
                Max Population
              </label>
              <p className="font-medium">
                {metadata.performanceMetrics.maxPopulationReached}
              </p>
            </div>

            {metadata.performanceMetrics.averageGenerationTime > 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Avg Generation Time</label>
                <p className="font-medium">
                  {formatTime(metadata.performanceMetrics.averageGenerationTime)}
                </p>
              </div>
            )}

            {metadata.performanceMetrics.extinctionEvents > 0 && (
              <div>
                <label className="text-sm text-muted-foreground">Extinction Events</label>
                <p className="font-medium text-red-600">
                  {metadata.performanceMetrics.extinctionEvents}
                </p>
              </div>
            )}

            {metadata.performanceMetrics.resistanceEmergenceGeneration && (
              <div>
                <label className="text-sm text-muted-foreground flex items-center">
                  <LuShield className="h-3 w-3 mr-1" />
                  Resistance Emerged
                </label>
                <p className="font-medium">
                  Generation {metadata.performanceMetrics.resistanceEmergenceGeneration}
                </p>
              </div>
            )}
          </div>

          {/* Memory and CPU if available */}
          {(metadata.performanceMetrics.memoryUsage || metadata.performanceMetrics.cpuUtilization) && (
            <div className="grid grid-cols-2 gap-4">
              {metadata.performanceMetrics.memoryUsage && (
                <div>
                  <label className="text-sm text-muted-foreground flex items-center">
                    <LuMemoryStick className="h-3 w-3 mr-1" />
                    Memory Usage
                  </label>
                  <p className="font-medium">
                    {metadata.performanceMetrics.memoryUsage.toFixed(1)} MB
                  </p>
                </div>
              )}
              
              {metadata.performanceMetrics.cpuUtilization && (
                <div>
                  <label className="text-sm text-muted-foreground flex items-center">
                    <LuCpu className="h-3 w-3 mr-1" />
                    CPU Usage
                  </label>
                  <p className="font-medium">
                    {metadata.performanceMetrics.cpuUtilization.toFixed(1)}%
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Complexity Metrics */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center">
            <LuZap className="h-4 w-4 mr-2" />
            Complexity Analysis
          </h4>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Parameter Complexity</label>
              <div className="mt-1 flex items-center space-x-2">
                <Badge className={getComplexityColor(metadata.complexityMetrics.parameterComplexity)}>
                  {getComplexityLabel(metadata.complexityMetrics.parameterComplexity)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ({metadata.complexityMetrics.parameterComplexity}/10)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <label className="text-muted-foreground">Population Volatility</label>
                <p className="font-medium">
                  {(metadata.complexityMetrics.populationVolatility * 100).toFixed(1)}%
                </p>
              </div>
              
              <div>
                <label className="text-muted-foreground">Resistance Stability</label>
                <p className="font-medium">
                  {(metadata.complexityMetrics.resistanceStability * 100).toFixed(1)}%
                </p>
              </div>
              
              <div>
                <label className="text-muted-foreground">Evolutionary Pressure</label>
                <p className="font-medium">
                  {(metadata.complexityMetrics.evolutionaryPressure * 100).toFixed(1)}%
                </p>
              </div>
              
              <div>
                <label className="text-muted-foreground">Computational Load</label>
                <p className="font-medium">
                  {metadata.complexityMetrics.computationalComplexity.toFixed(1)}/10
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Export History */}
        {metadata.exportHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <LuBookmark className="h-4 w-4 mr-2" />
                Export History
              </h4>
              
              <div className="space-y-2">
                {metadata.exportHistory.slice(-3).map((exportRecord, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="uppercase">
                        {exportRecord.format}
                      </Badge>
                      <span className="text-muted-foreground">
                        {formatDate(exportRecord.exportedAt)}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {formatBytes(exportRecord.fileSize)}
                    </span>
                  </div>
                ))}
                {metadata.exportHistory.length > 3 && (
                  <p className="text-xs text-muted-foreground">
                    +{metadata.exportHistory.length - 3} more exports
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Technical Details */}
        {showTechnicalDetails && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <LuMonitor className="h-4 w-4 mr-2" />
                Technical Details
              </h4>
              
              <div className="space-y-2 text-sm">
                <div>
                  <label className="text-muted-foreground">Version</label>
                  <p className="font-mono">{metadata.version}</p>
                </div>
                
                {metadata.browserInfo && (
                  <div>
                    <label className="text-muted-foreground">Browser</label>
                    <p className="font-mono text-xs truncate" title={metadata.browserInfo}>
                      {metadata.browserInfo.split(' ')[0]}
                    </p>
                  </div>
                )}
                
                {metadata.deviceInfo && (
                  <div>
                    <label className="text-muted-foreground">Device</label>
                    <p className="font-mono text-xs">{metadata.deviceInfo}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Research Fields */}
        {(metadata.hypothesis || metadata.methodology || metadata.conclusions) && (
          <>
            <Separator />
            <div className="space-y-4">
              <h4 className="font-medium flex items-center">
                <LuInfo className="h-4 w-4 mr-2" />
                Research Information
              </h4>
              
              {metadata.hypothesis && (
                <div>
                  <label className="text-sm text-muted-foreground">Hypothesis</label>
                  <div className="mt-1 p-3 bg-blue-50 rounded-md">
                    <p className="text-sm">{metadata.hypothesis}</p>
                  </div>
                </div>
              )}
              
              {metadata.methodology && (
                <div>
                  <label className="text-sm text-muted-foreground">Methodology</label>
                  <div className="mt-1 p-3 bg-green-50 rounded-md">
                    <p className="text-sm">{metadata.methodology}</p>
                  </div>
                </div>
              )}
              
              {metadata.conclusions && (
                <div>
                  <label className="text-sm text-muted-foreground">Conclusions</label>
                  <div className="mt-1 p-3 bg-purple-50 rounded-md">
                    <p className="text-sm">{metadata.conclusions}</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
} 
import React from "react";
import { Bacterium } from "@/types/simulation";
import { GraphData, CullingStats, PerformanceMetrics, OptimalParameters } from "../types";
import { PerformanceMonitor } from "@/lib/performance";

interface StatisticsOverlayProps {
  bacteria: Bacterium[];
  graphData: GraphData;
  cullingStats: CullingStats | null;
  performanceMetrics: PerformanceMetrics;
  optimalParams: OptimalParameters;
  enableAdaptivePerformance: boolean;
}

export function StatisticsOverlay({
  bacteria,
  graphData,
  cullingStats,
  performanceMetrics,
  optimalParams,
  enableAdaptivePerformance,
}: StatisticsOverlayProps) {
  const performanceMonitor = new PerformanceMonitor();
  const cullingPerformance = performanceMonitor.getStats("node-culling");

  return (
    <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs">
      <div className="font-semibold mb-1">Population: {bacteria.length}</div>
      <div className="text-green-600">
        Sensitive: {bacteria.filter((b) => !b.isResistant).length}
      </div>
      <div className="text-red-600">
        Resistant: {bacteria.filter((b) => b.isResistant).length}
      </div>
      <div className="text-blue-600">
        Connections: {graphData.links.length}
      </div>
      <div className="text-gray-500 text-xs mt-1">
        Drag nodes to interact!
      </div>

      {cullingStats && (
        <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
          <div className="text-yellow-600 font-semibold">
            Showing: {cullingStats.displayCount} / {cullingStats.originalCount}
          </div>
          <div className="text-gray-500">
            Culled: {(cullingStats.cullingRatio * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {enableAdaptivePerformance && (
        <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
          <div className="text-blue-600 font-semibold">Performance</div>
          <div className="text-gray-500">
            FPS: {performanceMetrics.frameRate.toFixed(1)}
          </div>
          <div className="text-gray-500">
            Zoom: {performanceMetrics.zoomLevel.toFixed(1)}x
          </div>
          <div className="text-gray-500">
            Force: {optimalParams.chargeStrength.toFixed(0)}
          </div>
        </div>
      )}

      {process.env.NODE_ENV === "development" && cullingPerformance && (
        <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
          <div className="text-purple-600 font-semibold">Debug</div>
          <div className="text-gray-500">
            Culling: {cullingPerformance.average.toFixed(2)}ms avg
          </div>
          <div className="text-gray-500">
            Alpha: {optimalParams.alphaDecay.toFixed(3)}
          </div>
          <div className="text-gray-500">
            Velocity: {optimalParams.velocityDecay.toFixed(2)}
          </div>
          <div className="text-gray-500">
            Force X: {optimalParams.forceXStrength.toFixed(3)}
          </div>
          <div className="text-gray-500">
            Force Y: {optimalParams.forceYStrength.toFixed(3)}
          </div>
          <div className="text-red-500 font-mono text-xs">
            🎯 Force Config: Charge {optimalParams.chargeStrength} / X {optimalParams.forceXStrength.toFixed(3)} / Y {optimalParams.forceYStrength.toFixed(3)}
          </div>
          {graphData.nodes.length > 0 && (
            <div className="text-blue-500 font-mono text-xs">
              📊 Node spread: {calculateNodeSpread(graphData.nodes).toFixed(1)}px
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function calculateNodeSpread(nodes: any[]): number {
  if (nodes.length === 0) return 0;
  
  const centerX = nodes.reduce((sum, node) => sum + (node.x || 0), 0) / nodes.length;
  const centerY = nodes.reduce((sum, node) => sum + (node.y || 0), 0) / nodes.length;
  
  const maxDistance = nodes.reduce((max, node) => {
    const dx = (node.x || 0) - centerX;
    const dy = (node.y || 0) - centerY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return Math.max(max, distance);
  }, 0);
  
  return maxDistance;
} 
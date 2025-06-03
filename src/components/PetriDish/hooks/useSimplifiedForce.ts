import { useCallback } from "react";
import { GraphNode } from "../types";

export function useSimplifiedForce() {
  // Simple, stable configuration - no dynamic changes!
  const getStableConfiguration = useCallback(() => {
    return {
      // Based on successful React Force Graph examples
      nodeRelSize: 6,
      linkDirectionalArrowLength: 3,
      linkDirectionalArrowRelPos: 1,
      linkWidth: 1,
      linkOpacity: 0.6,
      
      // Let React Force Graph use its tested defaults
      // NO manual d3Force configurations!
      
      // Simple node styling
      nodeColor: (node: GraphNode) => {
        if (node.isResistant) return '#ff4444';
        return '#4444ff';
      },
      
      // Simple link styling
      linkColor: () => '#999999',
    };
  }, []);

  return {
    getStableConfiguration,
  };
} 
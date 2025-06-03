"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { Bacterium } from "@/types/simulation";

// Define proper types for React Force Graph components
interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  isResistant: boolean;
  generation: number;
  bacterium: Bacterium;
}

interface ZoomTransform {
  k: number;
  x: number;
  y: number;
}

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

export interface SimplifiedPetriDishProps {
  bacteria: Bacterium[];
  width?: number;
  height?: number;
  onBacteriumClick?: (bacterium: Bacterium) => void;
}

const PetriDishSimplified = memo<SimplifiedPetriDishProps>(function PetriDishSimplified({
  bacteria,
  width = 600,
  height = 600,
  onBacteriumClick,
}: SimplifiedPetriDishProps) {
  const graphRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simple data transformation - no complex culling or validation
  const graphData = React.useMemo(() => {
    if (!bacteria || !Array.isArray(bacteria)) {
      return { nodes: [], links: [] };
    }

    // Convert bacteria to simple nodes
    const nodes: GraphNode[] = bacteria.map((bacterium) => ({
      id: bacterium.id,
      x: bacterium.x,
      y: bacterium.y,
      isResistant: bacterium.isResistant,
      generation: bacterium.generation,
      // Keep original bacterium data for callbacks
      bacterium,
    }));

    // No links for bacteria - they float independently like in petri dish
    const links: never[] = [];

    return { nodes, links };
  }, [bacteria]);

  const handleNodeClick = useCallback((node: { [key: string]: unknown; id?: string | number; x?: number; y?: number; bacterium?: Bacterium }) => {
    if (onBacteriumClick && node.bacterium) {
      onBacteriumClick(node.bacterium);
    }
  }, [onBacteriumClick]);

  const nodeColorFunction = useCallback((node: { [key: string]: unknown; id?: string | number; x?: number; y?: number; isResistant?: boolean }): string => {
    // We know our nodes have isResistant property from our graphData
    if (node.isResistant) return '#ff4444';
    return '#4444ff';
  }, []);

  const handleZoom = useCallback((transform: ZoomTransform) => {
    // Simple zoom handling without complex state management
    console.log('Zoom level:', transform.k);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center" style={{ width, height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div style={{ width, height }}>
      <ForceGraph2D
        ref={graphRef as unknown as React.MutableRefObject<undefined>}
        graphData={graphData}
        width={width}
        height={height}
        
        // ✅ MINIMAL CONFIGURATION - Trust the defaults!
        nodeRelSize={6}
        nodeId="id"
        
        // Simple node styling
        nodeColor={nodeColorFunction}
        
        // Node click handler
        onNodeClick={handleNodeClick}
        
        // Zoom handler
        onZoom={handleZoom}
        
        // Enable basic interactions
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={true}
        
        // ✅ NO MANUAL d3Force CONFIGURATIONS!
        // Let React Force Graph use its tested defaults
        
        // Simple node rendering
        nodeCanvasObjectMode={() => "after"}
        nodeCanvasObject={(node: { [key: string]: unknown; id?: string | number; x?: number; y?: number }, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const graphNode = node as unknown as GraphNode; // Assert to our specific GraphNode type
          const label = `${graphNode.generation}`;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = graphNode.isResistant ? '#ffffff' : '#000000';
          ctx.fillText(label, graphNode.x!, graphNode.y!);
        }}
      />
    </div>
  );
});

export default PetriDishSimplified; 
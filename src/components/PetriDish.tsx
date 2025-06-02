"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { Bacterium } from "@/types/simulation";
import {
  CachedNodeCuller,
  PerformanceMonitor,
  cullNodesForDisplay,
} from "@/lib/performance";

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

interface PetriDishProps {
  bacteria: Bacterium[];
  width?: number;
  height?: number;
  isSimulationRunning?: boolean;
  onBacteriumClick?: (bacterium: Bacterium) => void;
  maxDisplayNodes?: number; // New prop for performance optimization
  enableSpatialSampling?: boolean; // New prop for spatial distribution
}

interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  color: string;
  size: number;
  isResistant: boolean;
  fitness: number;
  age: number;
  generation: number;
  parentId?: string;
}

// Singleton instances for performance optimization
const nodeCuller = new CachedNodeCuller();
const performanceMonitor = new PerformanceMonitor();

const PetriDish = memo<PetriDishProps>(function PetriDish({
  bacteria,
  width = 600,
  height = 600,
  isSimulationRunning = false,
  onBacteriumClick,
  maxDisplayNodes = 1000,
  enableSpatialSampling = true,
}: PetriDishProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [cullingStats, setCullingStats] = useState<{
    originalCount: number;
    displayCount: number;
    cullingRatio: number;
  } | null>(null);

  // Memoize the resize handler
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: rect.width || width,
        height: rect.height || height,
      });
    }
  }, [width, height]);

  // Update container size when it changes
  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  // Use container size for calculations
  const actualWidth = containerSize.width;
  const actualHeight = containerSize.height;

  // Convert bacteria to graph nodes with performance optimization
  const graphData = React.useMemo(() => {
    const endCullingTimer = performanceMonitor.startTiming("node-culling");

    // Apply node culling for large populations
    let displayBacteria: Bacterium[];

    if (bacteria.length > maxDisplayNodes) {
      displayBacteria = nodeCuller.getCulledNodes(
        bacteria,
        maxDisplayNodes,
        enableSpatialSampling
      );

      // Update culling statistics
      setCullingStats({
        originalCount: bacteria.length,
        displayCount: displayBacteria.length,
        cullingRatio:
          (bacteria.length - displayBacteria.length) / bacteria.length,
      });
    } else {
      displayBacteria = bacteria;
      setCullingStats(null);
    }

    const nodes: GraphNode[] = displayBacteria.map((bacterium) => ({
      id: bacterium.id,
      x: bacterium.x,
      y: bacterium.y,
      color: bacterium.color,
      size: bacterium.size,
      isResistant: bacterium.isResistant,
      fitness: bacterium.fitness,
      age: bacterium.age,
      generation: bacterium.generation,
      parentId: bacterium.parentId,
    }));

    endCullingTimer();

    return {
      nodes,
      links: [], // No connections between bacteria
    };
  }, [bacteria, maxDisplayNodes, enableSpatialSampling]);

  // Apply circular boundary constraint
  const applyCircularBoundary = useCallback(
    (node: GraphNode) => {
      const centerX = actualWidth / 2;
      const centerY = actualHeight / 2;
      const radius = Math.min(actualWidth, actualHeight) / 2 - 20; // 20px padding

      const dx = (node.x || 0) - centerX;
      const dy = (node.y || 0) - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > radius) {
        const angle = Math.atan2(dy, dx);
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);

        // Reduce velocity to prevent bouncing
        if (node.vx) node.vx *= 0.1;
        if (node.vy) node.vy *= 0.1;
      }
    },
    [actualWidth, actualHeight]
  );

  // Memoize the force configuration function
  const configureForces = useCallback(() => {
    if (graphRef.current) {
      const fg = graphRef.current;

      // Adjust forces based on population size
      const nodeCount = graphData.nodes.length;
      const chargeStrength = nodeCount > 500 ? -10 : -30; // Reduce repulsion for large populations
      const centerStrength = nodeCount > 500 ? 0.05 : 0.1; // Weaker centering for large populations

      // Set up forces
      fg.d3Force("charge").strength(chargeStrength);
      fg.d3Force("center").strength(centerStrength);

      // Add custom force for circular boundary
      fg.d3Force("boundary", () => {
        graphData.nodes.forEach(applyCircularBoundary);
      });

      // Configure simulation parameters based on performance needs
      const cooldownTicks = isSimulationRunning
        ? 0
        : Math.min(100, nodeCount / 5);
      const cooldownTime = isSimulationRunning
        ? 0
        : Math.min(2000, nodeCount * 2);

      fg.cooldownTicks(cooldownTicks);
      fg.cooldownTime(cooldownTime);
    }
  }, [graphData, isSimulationRunning, applyCircularBoundary]);

  // Configure force simulation with performance optimizations
  useEffect(() => {
    configureForces();
  }, [configureForces]);

  // Handle node rendering with performance optimizations
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      const graphNode = node as GraphNode;
      const radius = graphNode.size;

      // Skip very small nodes at high zoom levels for performance
      if (radius < 1) return;

      // Draw bacteria cell
      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
      ctx.fillStyle = graphNode.color;
      ctx.fill();

      // Add border for resistant bacteria
      if (graphNode.isResistant) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }

      // Draw fitness indicator (optional - only for hovered node)
      if (hoveredNode && hoveredNode.id === graphNode.id) {
        ctx.beginPath();
        ctx.arc(
          node.x!,
          node.y!,
          radius + 2,
          0,
          2 * Math.PI * graphNode.fitness
        );
        ctx.strokeStyle = "#ffff00";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    [hoveredNode]
  );

  // Handle node click
  const handleNodeClick = useCallback(
    (node: any) => {
      const graphNode = node as GraphNode;
      const bacterium: Bacterium = {
        id: graphNode.id,
        x: graphNode.x || 0,
        y: graphNode.y || 0,
        isResistant: graphNode.isResistant,
        fitness: graphNode.fitness,
        age: graphNode.age,
        generation: graphNode.generation,
        parentId: graphNode.parentId,
        color: graphNode.color,
        size: graphNode.size,
      };

      onBacteriumClick?.(bacterium);
    },
    [onBacteriumClick]
  );

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node as GraphNode | null);
  }, []);

  // Handle link hover
  const handleLinkHover = useCallback((link: any) => {
    // Optional: could add link hover state if needed
    console.log("Link hovered:", link);
  }, []);

  // Handle link click
  const handleLinkClick = useCallback((link: any) => {
    console.log(
      "Link clicked - Parent:",
      link.source.id,
      "-> Child:",
      link.target.id
    );
  }, []);

  // Create custom tooltip
  const nodeLabel = useCallback((node: any) => {
    const graphNode = node as GraphNode;
    return `
      <div style="background: rgba(0,0,0,0.8); color: white; padding: 8px; border-radius: 4px; font-size: 12px;">
        <div><strong>ID:</strong> ${graphNode.id}</div>
        <div><strong>Type:</strong> ${
          graphNode.isResistant ? "Resistant" : "Sensitive"
        }</div>
        <div><strong>Fitness:</strong> ${graphNode.fitness.toFixed(2)}</div>
        <div><strong>Age:</strong> ${graphNode.age}</div>
        <div><strong>Generation:</strong> ${graphNode.generation}</div>
        ${
          graphNode.parentId
            ? `<div><strong>Parent:</strong> ${graphNode.parentId}</div>`
            : ""
        }
      </div>
    `;
  }, []);

  // Performance stats for debugging
  const cullingPerformance = performanceMonitor.getStats("node-culling");

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden"
    >
      {/* Petri dish background circle */}
      <div
        className="absolute border-4 border-gray-300 dark:border-gray-600 rounded-full opacity-20"
        style={{
          width: Math.min(actualWidth, actualHeight) - 40,
          height: Math.min(actualWidth, actualHeight) - 40,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Force Graph Container - Centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={actualWidth}
          height={actualHeight}
          nodeLabel={nodeLabel}
          nodeCanvasObject={nodeCanvasObject}
          onNodeHover={handleNodeHover}
          onNodeClick={handleNodeClick}
          onLinkHover={handleLinkHover}
          onLinkClick={handleLinkClick}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          enableNodeDrag={false}
          cooldownTicks={isSimulationRunning ? 0 : 100}
          cooldownTime={isSimulationRunning ? 0 : 2000}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
        />
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="font-semibold mb-2">Legend</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Sensitive</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-red-600"></div>
            <span>Resistant</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-500"></div>
            <span>Parent → Child</span>
          </div>
          <div className="text-gray-500 mt-2">
            Size = Population size
            <br />
            Dots = Age
            <br />
            Inner glow = Fitness
            <br />
            Lines = Inheritance
          </div>
        </div>
      </div>

      {/* Statistics overlay */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs">
        <div className="font-semibold mb-1">Population: {bacteria.length}</div>
        <div className="text-green-600">
          Sensitive: {bacteria.filter((b) => !b.isResistant).length}
        </div>
        <div className="text-red-600">
          Resistant: {bacteria.filter((b) => b.isResistant).length}
        </div>
        <div className="text-gray-600">
          Relationships: {graphData.links.length}
        </div>

        {cullingStats && (
          <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
            <div className="text-yellow-600 font-semibold">
              Showing: {cullingStats.displayCount} /{" "}
              {cullingStats.originalCount}
            </div>
            <div className="text-gray-500">
              Culled: {(cullingStats.cullingRatio * 100).toFixed(1)}%
            </div>
          </div>
        )}

        {process.env.NODE_ENV === "development" && cullingPerformance && (
          <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
            <div className="text-blue-600 font-semibold">Performance</div>
            <div className="text-gray-500">
              Culling: {cullingPerformance.average.toFixed(2)}ms avg
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default PetriDish;

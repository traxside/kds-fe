"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { Bacterium } from "@/types/simulation";

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

export default function PetriDish({
  bacteria,
  width = 600,
  height = 600,
  isSimulationRunning = false,
  onBacteriumClick,
}: PetriDishProps) {
  const graphRef = useRef<any>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // Convert bacteria to graph nodes
  const graphData = React.useMemo(() => {
    const nodes: GraphNode[] = bacteria.map((bacterium) => ({
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

    return {
      nodes,
      links: [], // No connections between bacteria
    };
  }, [bacteria]);

  // Apply circular boundary constraint
  const applyCircularBoundary = useCallback(
    (node: GraphNode) => {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) / 2 - 20; // 20px padding

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
    [width, height]
  );

  // Configure force simulation
  useEffect(() => {
    if (graphRef.current) {
      const fg = graphRef.current;

      // Set up forces
      fg.d3Force("charge").strength(-30); // Repulsion between nodes
      fg.d3Force("center").strength(0.1); // Weak centering force

      // Add custom force for circular boundary
      fg.d3Force("boundary", () => {
        graphData.nodes.forEach(applyCircularBoundary);
      });

      // Configure simulation parameters
      fg.cooldownTicks(isSimulationRunning ? 0 : 100);
      fg.cooldownTime(isSimulationRunning ? 0 : 2000);
    }
  }, [graphData, isSimulationRunning, applyCircularBoundary]);

  // Handle node rendering
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      const graphNode = node as GraphNode;
      const radius = graphNode.size;

      // Draw bacterium circle
      ctx.beginPath();
      ctx.arc(graphNode.x!, graphNode.y!, radius, 0, 2 * Math.PI);
      ctx.fillStyle = graphNode.color;
      ctx.fill();

      // Add border for resistant bacteria
      if (graphNode.isResistant) {
        ctx.strokeStyle = "#dc2626"; // red-600
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Add fitness indicator (smaller inner circle)
      const fitnessRadius = radius * graphNode.fitness;
      if (fitnessRadius > 1) {
        ctx.beginPath();
        ctx.arc(graphNode.x!, graphNode.y!, fitnessRadius, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fill();
      }

      // Draw age indicator (small dots around the bacterium)
      const ageIndicators = Math.min(graphNode.age, 8);
      for (let i = 0; i < ageIndicators; i++) {
        const angle = (i / ageIndicators) * 2 * Math.PI;
        const dotX = graphNode.x! + (radius + 3) * Math.cos(angle);
        const dotY = graphNode.y! + (radius + 3) * Math.sin(angle);

        ctx.beginPath();
        ctx.arc(dotX, dotY, 1, 0, 2 * Math.PI);
        ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
        ctx.fill();
      }
    },
    []
  );

  // Handle node hover
  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node as GraphNode | null);
  }, []);

  // Handle node click
  const handleNodeClick = useCallback(
    (node: any) => {
      if (onBacteriumClick) {
        const graphNode = node as GraphNode;
        const bacterium: Bacterium = {
          id: graphNode.id,
          x: graphNode.x || 0,
          y: graphNode.y || 0,
          color: graphNode.color,
          size: graphNode.size,
          isResistant: graphNode.isResistant,
          fitness: graphNode.fitness,
          age: graphNode.age,
          generation: graphNode.generation,
          parentId: graphNode.parentId,
        };
        onBacteriumClick(bacterium);
      }
    },
    [onBacteriumClick]
  );

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

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden">
      {/* Petri dish background circle */}
      <div
        className="absolute border-4 border-gray-300 dark:border-gray-600 rounded-full opacity-20"
        style={{
          width: Math.min(width, height) - 40,
          height: Math.min(width, height) - 40,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      {/* Force Graph */}
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        width={width}
        height={height}
        nodeLabel={nodeLabel}
        nodeCanvasObject={nodeCanvasObject}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        enableNodeDrag={false}
        cooldownTicks={isSimulationRunning ? 0 : 100}
        cooldownTime={isSimulationRunning ? 0 : 2000}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />

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
          <div className="text-gray-500 mt-2">
            Size = Population size
            <br />
            Dots = Age
            <br />
            Inner glow = Fitness
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
      </div>
    </div>
  );
}

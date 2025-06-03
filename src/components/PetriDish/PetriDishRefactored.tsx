"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { Bacterium } from "@/types/simulation";
import { PetriDishProps, GraphNode } from "./types";
import { applyCircularBoundary } from "./utils";
import { usePerformanceMetrics } from "./hooks/usePerformanceMetrics";
import { useGraphData } from "./hooks/useGraphData";
import { useForceConfiguration } from "./hooks/useForceConfiguration";
import { useContainerSize } from "./hooks/useContainerSize";
import { Legend } from "./components/Legend";
import { StatisticsOverlay } from "./components/StatisticsOverlay";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const PetriDish = memo<PetriDishProps>(function PetriDish({
  bacteria,
  width = 600,
  height = 600,
  isSimulationRunning = false,
  onBacteriumClick,
  maxDisplayNodes = 1000,
  enableSpatialSampling = true,
  enableAdaptivePerformance = true,
}: PetriDishProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [mounted, setMounted] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const containerSize = useContainerSize(containerRef, width, height);
  const actualWidth = containerSize.width;
  const actualHeight = containerSize.height;

  const {
    performanceMetrics,
    updatePerformanceMetrics,
    handleZoom,
    getOptimalParameters,
  } = usePerformanceMetrics(bacteria.length, isSimulationRunning, enableAdaptivePerformance);

  const { graphData, cullingStats } = useGraphData(
    bacteria,
    maxDisplayNodes,
    enableSpatialSampling
  );

  const applyBoundary = useCallback(
    (node: GraphNode) => applyCircularBoundary(node, actualWidth, actualHeight),
    [actualWidth, actualHeight]
  );

  useForceConfiguration(
    graphRef,
    graphData,
    performanceMetrics,
    getOptimalParameters,
    applyBoundary
  );

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D) => {
      updatePerformanceMetrics();
      
      const graphNode = node as GraphNode;
      const radius = graphNode.size;
      const { zoomLevel, frameRate } = performanceMetrics;

      if (radius < 1) return;

      const shouldRenderDetails = zoomLevel > 1.5 && frameRate > 30;
      const shouldRenderBorder = graphNode.isResistant && (zoomLevel > 1 || frameRate > 45);

      ctx.beginPath();
      ctx.arc(node.x!, node.y!, radius, 0, 2 * Math.PI);
      ctx.fillStyle = graphNode.color;
      ctx.fill();

      if (shouldRenderBorder) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = zoomLevel > 2 ? 1 : 0.5;
        ctx.stroke();
      }

      if (shouldRenderDetails && hoveredNode && hoveredNode.id === graphNode.id) {
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
    [hoveredNode, performanceMetrics, updatePerformanceMetrics]
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D) => {
      const source = link.source;
      const target = link.target;
      const { zoomLevel, frameRate } = performanceMetrics;

      if (frameRate < 30 && zoomLevel < 0.8) return;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      
      const opacity = frameRate < 45 ? 0.3 : 0.6;
      const lineWidth = zoomLevel > 1.5 ? 1.5 : 1;
      
      ctx.strokeStyle = `rgba(100, 116, 139, ${opacity})`;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      if (zoomLevel > 1.2 && frameRate > 40) {
        const angle = Math.atan2(target.y - source.y, target.x - source.x);
        const arrowLength = 8;
        const arrowAngle = Math.PI / 6;

        const targetRadius = target.size || 5;
        const arrowX = target.x - (targetRadius + 3) * Math.cos(angle);
        const arrowY = target.y - (targetRadius + 3) * Math.sin(angle);

        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle - arrowAngle),
          arrowY - arrowLength * Math.sin(angle - arrowAngle)
        );
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(
          arrowX - arrowLength * Math.cos(angle + arrowAngle),
          arrowY - arrowLength * Math.sin(angle + arrowAngle)
        );
        ctx.strokeStyle = `rgba(100, 116, 139, 0.8)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    },
    [performanceMetrics]
  );

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

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNode(node as GraphNode | null);
  }, []);

  const handleLinkHover = useCallback((link: any) => {
    console.log("Link hovered:", link);
  }, []);

  const handleLinkClick = useCallback((link: any) => {
    console.log(
      "Link clicked - Parent:",
      link.source.id,
      "-> Child:",
      link.target.id
    );
  }, []);

  const nodeLabel = useCallback((node: any) => {
    const graphNode = node as GraphNode;
    const { frameRate } = performanceMetrics;
    
    if (frameRate < 30) {
      return `${graphNode.id} (${graphNode.isResistant ? "Resistant" : "Sensitive"})`;
    }
    
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
  }, [performanceMetrics]);

  const optimalParams = getOptimalParameters(
    graphData.nodes.length,
    performanceMetrics.frameRate,
    performanceMetrics.zoomLevel
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-900 rounded-xl overflow-hidden"
    >
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

      {mounted && graphData.nodes.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <ForceGraph2D
            ref={graphRef}
            graphData={{
              nodes: graphData.nodes,
              links: graphData.links.filter(link => {
                const sourceExists = graphData.nodes.some(node => node.id === link.source);
                const targetExists = graphData.nodes.some(node => node.id === link.target);
                return sourceExists && targetExists;
              })
            }}
            width={actualWidth}
            height={actualHeight}
            nodeLabel={nodeLabel}
            nodeCanvasObject={nodeCanvasObject}
            linkCanvasObject={linkCanvasObject}
            onNodeHover={handleNodeHover}
            onNodeClick={handleNodeClick}
            onLinkHover={handleLinkHover}
            onLinkClick={handleLinkClick}
            onZoom={handleZoom}
            enableZoomInteraction={true}
            enablePanInteraction={true}
            enableNodeDrag={true}
            d3AlphaDecay={optimalParams.alphaDecay}
            d3VelocityDecay={optimalParams.velocityDecay}
          />
        </div>
      )}

      {(!mounted || graphData.nodes.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          Loading simulation data...
        </div>
      )}

      <Legend />

      {mounted && graphData.nodes.length > 0 && (
        <StatisticsOverlay
          bacteria={bacteria}
          graphData={graphData}
          cullingStats={cullingStats}
          performanceMetrics={performanceMetrics}
          optimalParams={optimalParams}
          enableAdaptivePerformance={enableAdaptivePerformance}
        />
      )}
    </div>
  );
});

export default PetriDish; 
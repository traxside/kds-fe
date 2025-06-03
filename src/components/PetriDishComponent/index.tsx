"use client";
// TODO fix
import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { Bacterium } from "@/types/simulation";
import { PetriDishProps } from "./types";
import { CachedNodeCuller, PerformanceMonitor } from "@/lib/performance";

// Import react-graph-vis
import Graph from "react-graph-vis";

const nodeCuller = new CachedNodeCuller();
const performanceMonitor = new PerformanceMonitor();

const PetriDish = memo<PetriDishProps>(function PetriDish({
    bacteria,
    width = 600,
    height = 600,
    onBacteriumClick,
    maxDisplayNodes = 1000,
    enableSpatialSampling = true,
  }: PetriDishProps) {
  const networkRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [cullingStats, setCullingStats] = useState<{
    originalCount: number;
    displayCount: number;
    cullingRatio: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Simplified and debounced resize handler
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      // const rect = containerRef.current.getBoundingClientRect();
      // Use fixed dimensions to prevent stretching
      setContainerSize({
        width: width,
        height: height,
      });
    }
  }, [width, height]);

  useEffect(() => {
    updateSize();
    const debouncedResize = debounce(updateSize, 250);
    window.addEventListener("resize", debouncedResize);
    return () => window.removeEventListener("resize", debouncedResize);
  }, [updateSize]);

  // Stable graph data with memoization
  const graphDataForVis = React.useMemo(() => {
    const endCullingTimer = performanceMonitor.startTiming("node-culling-vis");

    if (!bacteria || !Array.isArray(bacteria)) {
      endCullingTimer();
      return { nodes: [], edges: [] };
    }

    let displayBacteria: Bacterium[];

    if (bacteria.length > maxDisplayNodes) {
      displayBacteria = nodeCuller.getCulledNodes(
          bacteria,
          maxDisplayNodes,
          enableSpatialSampling
      );
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

    // Create nodes with stable IDs
    const nodes = displayBacteria.map((b) => ({
      id: b.id,
      label: b.isResistant ? `R` : `S`,
      title: `ID: ${b.id.substring(0, 8)}<br>Age: ${b.age}<br>Resistant: ${
          b.isResistant
      }<br>Fitness: ${b.fitness?.toFixed(2)}`,
      color: {
        background: b.color,
        border: b.isResistant ? "#ff0000" : "#0000ff",
        highlight: {
          background: b.color,
          border: "#ffffff",
        },
      },
      size: Math.max(8, b.size * 2), // Ensure minimum size
      shape: b.isResistant ? "star" : "dot",
      font: {
        color: b.isResistant ? "#ffffff" : "#000000",
        size: 10,
      },
      originalData: b,
    }));

    // Create edges for parent-child relationships
    const edges: { from: string; to: string; arrows?: string }[] = [];
    const displayedNodeIds = new Set(displayBacteria.map((b) => b.id));

    for (const bacterium of displayBacteria) {
      if (bacterium.parentId && displayedNodeIds.has(bacterium.parentId)) {
        // Ensure both source (parent) and target (child) are in the current node set
        edges.push({
          from: bacterium.parentId,
          to: bacterium.id,
          arrows: "to",
        });
      }
    }
    // The validateLinks function might still be useful, but its signature needs to match vis-network edges.
    // For now, direct creation.

    endCullingTimer();

    return {
      nodes: nodes || [],
      edges: edges || [],
    };
  }, [bacteria, maxDisplayNodes, enableSpatialSampling]);

  // Stable key based on data length rather than content
  const graphKey = React.useMemo(() => {
    return `graph-${graphDataForVis.nodes.length}-${graphDataForVis.edges.length}`;
  }, [graphDataForVis.nodes.length, graphDataForVis.edges.length]);

  // Optimized options
  const options: any = React.useMemo(
      () => ({
        // eslint-disable-line @typescript-eslint/no-explicit-any
        autoResize: false, // Disable auto-resize to prevent stretching
        width: `${containerSize.width}px`,
        height: `${containerSize.height}px`,
        nodes: {
          borderWidth: 1,
          borderWidthSelected: 2,
          font: {
            size: 10,
            face: "Arial",
            color: "#343434",
          },
          shapeProperties: {
            useImageSize: false,
          },
          scaling: {
            min: 8,
            max: 20,
          },
        },
        edges: {
          color: {
            color: "#cccccc",
            highlight: "#848484",
            hover: "#848484",
          },
          width: 1,
          smooth: {
            enabled: true,
            type: "continuous",
            roundness: 0.3,
          },
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.5,
              type: "arrow",
            },
          },
        },
        physics: {
          enabled: true,
          barnesHut: {
            gravitationalConstant: -2000,
            centralGravity: 0.1,
            springLength: 100,
            springConstant: 0.04,
            damping: 0.15,
            avoidOverlap: 0.2,
          },
          solver: "barnesHut",
          stabilization: {
            enabled: true,
            iterations: 150,
            fit: true,
          },
          timestep: 0.5,
        },
        interaction: {
          hover: true,
          tooltipDelay: 200,
          hideEdgesOnDrag: false,
          hideNodesOnDrag: false,
          navigationButtons: false,
          zoomView: true,
          dragView: true,
          dragNodes: false, // Disable node dragging to prevent layout issues
        },
        layout: {
          randomSeed: 42, // Fixed seed for consistent layout
          improvedLayout: true,
        },
      }),
      [containerSize]
  );

  // Stable event handlers
  const events = React.useMemo(
      () => ({
        click: (event: any) => {
          // eslint-disable-line @typescript-eslint/no-explicit-any
          if (event.nodes && event.nodes.length > 0 && onBacteriumClick) {
            const selectedNodeId = event.nodes[0];
            const nodeData = graphDataForVis.nodes.find(
                (n) => n.id === selectedNodeId
            );
            if (nodeData && nodeData.originalData) {
              onBacteriumClick(nodeData.originalData);
            }
          }
        },
      }),
      [graphDataForVis.nodes, onBacteriumClick]
  );

  if (!mounted) {
    return (
        <div
            style={{
              width: containerSize.width,
              height: containerSize.height,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
        >
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  return (
      <div
          ref={containerRef}
          style={{
            width: containerSize.width,
            height: containerSize.height,
            position: "relative",
            overflow: "hidden", // Prevent content from overflowing
          }}
      >
        {/* Circular boundary guide */}
        <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: Math.min(containerSize.width, containerSize.height) * 0.85,
              height: Math.min(containerSize.width, containerSize.height) * 0.85,
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              border: "2px solid rgba(128, 128, 128, 0.3)",
              backgroundColor: "rgba(128, 128, 128, 0.05)",
              pointerEvents: "none",
              zIndex: 1,
            }}
        />

        {/* Culling stats */}
        {cullingStats && (
            <div
                style={{
                  position: "absolute",
                  top: 10,
                  left: 10,
                  background: "rgba(0,0,0,0.7)",
                  color: "white",
                  padding: "4px 8px",
                  fontSize: "12px",
                  borderRadius: "4px",
                  zIndex: 10,
                }}
            >
              <div>Nodes: {cullingStats.originalCount}</div>
              <div>Shown: {cullingStats.displayCount}</div>
            </div>
        )}

        {/* Main graph component */}
        <Graph
            key={graphKey}
            graph={graphDataForVis}
            options={options}
            events={events}
            getNetwork={(networkInstance: any) => {
              // eslint-disable-line @typescript-eslint/no-explicit-any
              networkRef.current = networkInstance;
            }}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
            }}
        />
      </div>
  );
});

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>( // eslint-disable-line @typescript-eslint/no-explicit-any
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

PetriDish.displayName = "PetriDish";
export default PetriDish;

/* KEEP FOR NOW */
// Helper for displaying performance, adapt or remove
// const PerformanceDisplay = ({ metrics, stats }: { metrics: any; stats: any }) => (
//   <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: 5, zIndex: 10 }}>
//     <div>FPS: {metrics.frameRate?.toFixed(2)}</div>
//     <div>Nodes: {metrics.nodeCount} (Displaying: {stats?.displayCount || metrics.nodeCount})</div>
//     <div>Zoom: {metrics.zoomLevel?.toFixed(2)}</div>
//     {stats && <div>Culled: {(stats.cullingRatio * 100).toFixed(1)}%</div>}
//   </div>
// );

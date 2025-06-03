"use client";
// TODO fix
import React, { useEffect, useRef, useState, useCallback, memo } from "react";
// import dynamic from "next/dynamic"; // Keep dynamic for Graph component
import { Bacterium } from "@/types/simulation";
// import { PetriDishProps, GraphNode, GraphLink, GraphLinkResolved } from "./types"; // GraphNode and GraphLink will change
import { PetriDishProps } from "./types"; // Keep PetriDishProps, GraphNode/Link will be adapted for vis-network
// import { createGraphNodes, createValidatedLinks, validateLinks } from "./utils"; // These will need adaptation
import { CachedNodeCuller, PerformanceMonitor } from "@/lib/performance";
// import { forceX, forceY, forceCollide } from "d3-force"; // D3 forces no longer needed

// Import react-graph-vis
import Graph from "react-graph-vis";
// We'll need to define or import types for vis-network if @types/react-graph-vis is unavailable
// For now, we'll use 'any' and refine later if necessary.
// import { Options, Node, Edge, Network, NetworkEvents, Data } from 'vis-network/standalone';

// const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { // Remove react-force-graph-2d
//   ssr: false,
//   loading: () => (
//     <div className="flex items-center justify-center h-full">
//       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>
//     </div>
//   ),
// });

const nodeCuller = new CachedNodeCuller(); // This might need re-evaluation with react-graph-vis
const performanceMonitor = new PerformanceMonitor();

const PetriDish = memo<PetriDishProps>(function PetriDish({
  bacteria,
  width = 600,
  height = 600,
  // isSimulationRunning = false, // This prop might be used to control physics or updates
  onBacteriumClick,
  maxDisplayNodes = 1000,
  enableSpatialSampling = true,
}: PetriDishProps) {
  // const graphRef = useRef(null); // D3 graph ref, vis-network uses a different mechanism if direct access is needed
  // const forceGraphRef = useRef(null); // D3 graph ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkRef = useRef<any>(null); // Ref for vis-network instance
  const containerRef = useRef<HTMLDivElement>(null);
  // const frameTimeRef = useRef<number>(Date.now());
  // const renderCountRef = useRef<number>(0);
  // const lastErrorTimeRef = useRef<number>(0); // Error handling might change
  // const errorCountRef = useRef<number>(0);
  // const isRecoveringRef = useRef<boolean>(false);

  const [mounted, setMounted] = useState(false);
  // const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null); // Adapt hover logic
  const [containerSize, setContainerSize] = useState({ width, height });
  // const [performanceMetrics, setPerformanceMetrics] = useState({ // Performance metrics will be different
  //   frameRate: 60,
  //   lastFrameTime: 0,
  //   avgRenderTime: 16,
  //   zoomLevel: 1,
  //   nodeCount: 0,
  // });
  const [cullingStats, setCullingStats] = useState<{
    originalCount: number;
    displayCount: number;
    cullingRatio: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync the force graph ref for internal operations - no longer needed for D3
  // useEffect(() => {
  //   if (forceGraphRef.current) {
  //     graphRef.current = forceGraphRef.current;
  //   }
  // });

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      // Fill the entire parent container for full canvas area
      const parentElement = containerRef.current.parentElement;
      if (parentElement) {
        const parentRect = parentElement.getBoundingClientRect();
        setContainerSize({
          width: parentRect.width || width,
          height: parentRect.height || height,
        });
      } else {
        setContainerSize({
          width: rect.width || width,
          height: rect.height || height,
        });
      }
    }
  }, [width, height]);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  const actualWidth = containerSize.width;
  const actualHeight = containerSize.height;

  // Adapt graphData for react-graph-vis
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
        cullingRatio: (bacteria.length - displayBacteria.length) / bacteria.length,
      });
    } else {
      displayBacteria = bacteria;
      setCullingStats(null);
    }

    // Adapt createGraphNodes for react-graph-vis
    // Nodes need at least 'id'. 'label' is good for display.
    // 'title' for tooltips. 'color', 'shape', 'size' for appearance.
    const nodes = displayBacteria.map(b => ({
      id: b.id,
      label: b.isResistant ? `R-${b.id.substring(0,3)}` : `S-${b.id.substring(0,3)}`,
      title: `ID: ${b.id}<br>Age: ${b.age}<br>Resistant: ${b.isResistant}<br>Fitness: ${b.fitness?.toFixed(2)}`,
      color: b.color,
      value: b.size, // For size scaling by value
      // x: b.x, // Can be used for initial positions if physics allows
      // y: b.y,
      shape: b.isResistant ? 'star' : 'dot',
      originalData: b,
    }));

    // Adapt createValidatedLinks for react-graph-vis
    // Edges need 'from' and 'to'.
    const edges: { from: string; to: string; arrows?: string }[] = [];
    const displayedNodeIds = new Set(displayBacteria.map(b => b.id));
    for (const bacterium of displayBacteria) {
      if (bacterium.parentId && displayedNodeIds.has(bacterium.parentId)) {
        // Ensure both source (parent) and target (child) are in the current node set
        if (displayedNodeIds.has(bacterium.id)) {
          edges.push({
            from: bacterium.parentId,
            to: bacterium.id,
            // arrows: 'to', // Example: add arrows
          });
        }
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

  // Remove D3 based updatePerformanceMetrics and handleZoom
  // const updatePerformanceMetrics = useCallback(() => { ... });
  // const handleZoom = useCallback((transform: { k: number; x: number; y: number }) => { ... });

  // Remove D3 based getOptimalParameters and configureForces
  // const getOptimalParameters = useCallback((nodeCount: number, frameRate: number, zoomLevel: number) => { ... });
  // const configureForces = useCallback(() => { ... });
  // useEffect(() => { /* configureForces logic */ }, [configureForces]);

  // Define options for react-graph-vis
  const options: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
    autoResize: true,
    nodes: {
      borderWidth: 1,
      borderWidthSelected: 2,
      font: {
        size: 10,
        face: "Tahoma",
        color: "#343434",
      },
      shapeProperties: {
        useImageSize: false,
      },
    },
    edges: {
      color: "#cccccc",
      width: 0.5,
      smooth: {
        enabled: true,
        type: "continuous",
        roundness: 0.5,
      },
      arrows: {
        to: { enabled: true, scaleFactor: 0.4, type: 'arrow' }
      }
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -1500,
        centralGravity: 0.05,
        springLength: 80,
        springConstant: 0.02,
        damping: 0.09,
        avoidOverlap: 0.2
      },
      solver: 'barnesHut',
      stabilization: {
        enabled: true,
        iterations: 200, // Lower for faster initial display
        fit: true,
      },
      timestep: 0.5,
    },
    interaction: {
      hover: true,
      tooltipDelay: 150,
      navigationButtons: false, // Set to true to show navigation buttons
      zoomView: true,
      dragView: true,
      dragNodes: true,
    },
    // layout: {
    //   randomSeed: undefined, // Let vis.js handle random seed
    //   improvedLayout:true,
    // },
  };

  // Define events for react-graph-vis
  const events: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
    click: (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (event.nodes && event.nodes.length > 0 && onBacteriumClick) {
        const selectedNodeId = event.nodes[0];
        const nodeData = graphDataForVis.nodes.find(n => n.id === selectedNodeId);
        if (nodeData && nodeData.originalData) {
          onBacteriumClick(nodeData.originalData);
        }
      }
    },
    hoverNode: (/* { node }: { node: string } */) => {
      // console.log('Hovered node ID:', node); // Example usage
    },
    blurNode: () => {
      // setHoveredNode(null);
    },
    // zoom: (params: any) => {
    //   // Handle zoom for performance metrics if needed
    // }
  };

  // The useForceConfiguration hook is no longer needed with react-graph-vis
  // const forceConfigHook = useForceConfiguration(
  //    forceGraphRef,
  //    graphData, // This was for react-force-graph
  //    performanceMetrics,
  //    getOptimalParameters,
  //    (node) => applyCircularBoundary(node, actualWidth, actualHeight)
  //  );

  // Error handling: vis-network might have its own error events or ways to catch issues
  // React Error Boundary might be useful here.

  if (!mounted) {
    return (
      <div style={{ width: actualWidth, height: actualHeight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%', // Fill entire parent container
        height: '100%', // Fill entire parent container
        position: 'relative'
      }}
    >
      {/* Circular border overlay - visual guide only */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: Math.min(actualWidth, actualHeight) * 0.9 + 'px', // Make it larger (90% of container)
          height: Math.min(actualWidth, actualHeight) * 0.9 + 'px', // Make it larger (90% of container)
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '3px solid rgba(128, 128, 128, 0.4)', // Semi-transparent grey border
          backgroundColor: 'rgba(128, 128, 128, 0.05)', // Very light grey background
          pointerEvents: 'none', // Don't interfere with interactions
          zIndex: 10
        }}
      />

      {cullingStats && (
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', fontSize: '12px', borderRadius: '4px', zIndex: 10 }}>
          <div>Original Nodes: {cullingStats.originalCount}</div>
          <div>Displaying: {cullingStats.displayCount} ({(cullingStats.cullingRatio * 100).toFixed(1)}% culled)</div>
        </div>
      )}
      <Graph
        key={graphDataForVis.nodes.map(n=>n.id).join('-') + graphDataForVis.edges.map(e=>e.from+e.to).join('-')} // More robust key
        graph={graphDataForVis}
        options={options as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        events={events}
        getNetwork={(networkInstance: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          networkRef.current = networkInstance;
        }}
        style={{
          width: '100%',
          height: '100%'
        }}
      />
      {/* Tooltip example (if needed beyond default titles) */}
      {/* {hoveredNode && (
        <div
          style={{
            position: "absolute",
            left: hoveredNode.x ? hoveredNode.x + 10 : undefined, // Adjust positioning
            top: hoveredNode.y ? hoveredNode.y + 10 : undefined,
            background: "white",
            border: "1px solid black",
            padding: "5px",
            zIndex: 100,
          }}
        >
          ID: {hoveredNode.id} <br />
          Age: {(hoveredNode as any).originalData?.age}
        </div>
      )} */}
    </div>
  );
});

PetriDish.displayName = 'PetriDish';
export default PetriDish;

// Helper for displaying performance, adapt or remove
// const PerformanceDisplay = ({ metrics, stats }: { metrics: any; stats: any }) => (
//   <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.5)', color: 'white', padding: 5, zIndex: 10 }}>
//     <div>FPS: {metrics.frameRate?.toFixed(2)}</div>
//     <div>Nodes: {metrics.nodeCount} (Displaying: {stats?.displayCount || metrics.nodeCount})</div>
//     <div>Zoom: {metrics.zoomLevel?.toFixed(2)}</div>
//     {stats && <div>Culled: {(stats.cullingRatio * 100).toFixed(1)}%</div>}
//   </div>
// );

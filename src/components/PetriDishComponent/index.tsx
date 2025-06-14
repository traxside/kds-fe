"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import ReactDOM from "react-dom"; // Import createPortal
import { Bacterium } from "@/types/simulation";
import { PetriDishProps } from "./types";
import { CachedNodeCuller, PerformanceMonitor } from "@/lib/performance";

// Import react-graph-vis
import Graph from "react-graph-vis";

const nodeCuller = new CachedNodeCuller();
const performanceMonitor = new PerformanceMonitor();

// Separate Tooltip Component
interface TooltipProps {
  bacterium: Bacterium;
  x: number;
  y: number;
  containerWidth: number;
  containerHeight: number;
}

const BacteriumTooltip: React.FC<TooltipProps> = ({ bacterium, x, y }) => {
  // Calculate offset in pixels (approximately 1cm = 37.8px at 96 DPI)
  const offsetX = 38; // ~1cm to the right
  const offsetY = -38; // ~1cm above
  
  // Calculate final position - purely relative to cursor
  const finalX = x + offsetX;
  const finalY = y + offsetY;
  
  // Check boundaries and adjust if needed
  const tooltipWidth = 180;

  
  let adjustedX = finalX;
  let adjustedY = finalY;
  
  // Prevent tooltip from going off-screen
  if (finalX + tooltipWidth > window.innerWidth) {
    adjustedX = x - offsetX - tooltipWidth; // Show to the left instead
  }
  
  if (finalY < 0) {
    adjustedY = y + offsetX; // Show below instead
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${adjustedX}px`,
        top: `${adjustedY}px`,
        background: 'rgba(0, 0, 0, 0.95)',
        color: 'white',
        padding: '8px 10px',
        borderRadius: '6px',
        fontSize: '11px',
        zIndex: 9999,
        pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
        border: `2px solid ${bacterium.isResistant ? '#ff4444' : '#44ff44'}`,
        width: '180px',
        backdropFilter: 'blur(8px)',
        fontFamily: 'monospace'
      }}
    >
      <div style={{ 
        fontWeight: 'bold', 
        marginBottom: '4px', 
        color: bacterium.isResistant ? '#ff6666' : '#66ff66',
        fontSize: '12px'
      }}>
        🦠 {bacterium.isResistant ? 'Resistant' : 'Sensitive'}
      </div>
      <div style={{ lineHeight: '1.3', fontSize: '10px' }}>
        <div><strong>ID:</strong> {bacterium.id}</div>
        <div><strong>Age:</strong> {bacterium.age} gen</div>
        <div><strong>Gen:</strong> {bacterium.generation}</div>
        <div><strong>Resistant:</strong> {bacterium.isResistant ? '🔴 YES' : '🟢 NO'}</div>
        <div><strong>Fitness:</strong> {bacterium.fitness?.toFixed(3) || 'N/A'}</div>
        <div><strong>Size:</strong> {bacterium.size}px</div>
        {bacterium.parentId ? (
          <div><strong>Parent:</strong> {bacterium.parentId.substring(0, 8)}...</div>
        ) : (
          <div><strong>Origin:</strong> Initial</div>
        )}
      </div>
    </div>
  );
};

const PetriDish = memo<PetriDishProps>(function PetriDish({
  bacteria,
  width,
  height,
  onBacteriumClick,
  maxDisplayNodes = 1000,
  enableSpatialSampling = true,
}: PetriDishProps) {
  // const graphRef = useRef(null); // D3 graph ref, vis-network uses a different mechanism if direct access is needed
  // const forceGraphRef = useRef(null); // D3 graph ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const networkRef = useRef<any>(null); // Ref for vis-network instance
  const containerRef = useRef<HTMLDivElement>(null);

  const [mounted, setMounted] = useState(false);
  // const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null); // Adapt hover logic
  const [containerSize, setContainerSize] = useState({ 
    width: width || 600, 
    height: height || 600 
  });
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

  // Enhanced tooltip state
  const [hoveredBacterium, setHoveredBacterium] = useState<Bacterium | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
    
    // Global mouse tracking for more accurate positioning
    const handleGlobalMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      });
    };

    // Add global mouse listener
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  // Simplified and debounced resize handler
  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newWidth = width || rect.width || 600;
      const newHeight = height || rect.height || 600;
      
      setContainerSize(prev => {
        if (Math.abs(prev.width - newWidth) > 10 || Math.abs(prev.height - newHeight) > 10) {
          return { width: newWidth, height: newHeight };
        }
        return prev;
      });
    }
  }, [width, height]);

  useEffect(() => {
    updateSize();
  }, [updateSize]);

  const actualWidth = containerSize.width;
  const actualHeight = containerSize.height;

  const handleMouseLeave = useCallback(() => {
    setHoveredBacterium(null);
  }, []);

  // Adapt graphData for react-graph-vis
  const graphDataForVis = React.useMemo(() => {
    const endCullingTimer = performanceMonitor.startTiming("node-culling-vis");

    if (!bacteria || !Array.isArray(bacteria) || bacteria.length === 0) {
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
      setCullingStats(prev => {
        const newStats = {
          originalCount: bacteria.length,
          displayCount: displayBacteria.length,
          cullingRatio: (bacteria.length - displayBacteria.length) / bacteria.length,
        };
        // Only update if actually different to prevent unnecessary re-renders
        if (!prev || 
            prev.originalCount !== newStats.originalCount || 
            prev.displayCount !== newStats.displayCount) {
          return newStats;
        }
        return prev;
      });
    } else {
      displayBacteria = bacteria;
      setCullingStats(null);
    }

    // Create nodes with stable IDs
    const nodes = displayBacteria.map(b => ({
      id: b.id,
      label: b.isResistant ? `R-${b.id.substring(0,3)}` : `S-${b.id.substring(0,3)}`, 
      color: {
        background: b.color,
        border: b.isResistant ? '#8B0000' : '#2E8B57',
        highlight: {
          background: b.isResistant ? '#FF6B6B' : '#98FB98',
          border: b.isResistant ? '#FF0000' : '#00FF00'
        }
      },
      value: Math.max(b.size * 2, 8), // Ensure minimum visible size
      shape: b.isResistant ? 'star' : 'dot',
      originalData: b, 
      font: {
        size: 8,
        color: b.isResistant ? '#FFFFFF' : '#000000'
      }
    }));

    // Validate for duplicate IDs and log error if found
    const nodeIds = nodes.map(n => n.id);
    const uniqueNodeIds = new Set(nodeIds);
    if (nodeIds.length !== uniqueNodeIds.size) {
      const duplicates = nodeIds.filter((id, index) => nodeIds.indexOf(id) !== index);
      console.error('Duplicate node IDs detected:', duplicates);
      console.error('Full node ID list:', nodeIds);
      console.error('Original bacteria IDs:', displayBacteria.map(b => b.id));
      
      // Create completely new unique IDs for all nodes to prevent vis-network error
      // But maintain a mapping of original ID -> new ID for edges
      const originalToNewIdMap = new Map<string, string>();
      
      const fixedNodes = nodes.map((node, index) => {
        const newId = `fixed-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
        originalToNewIdMap.set(node.originalData.id, newId);
        
        return {
          ...node,
          id: newId,
          originalData: {
            ...node.originalData,
            // Keep original ID in originalData for reference, but use new ID for vis-network
          }
        };
      });
      
      // Now create edges using the new IDs
      const fixedEdges: { from: string; to: string; arrows?: string }[] = [];
      
      for (const bacterium of displayBacteria) {
        if (bacterium.parentId) {
          const newChildId = originalToNewIdMap.get(bacterium.id);
          const newParentId = originalToNewIdMap.get(bacterium.parentId);
          
          if (newChildId && newParentId) {
            fixedEdges.push({
              from: newParentId,
              to: newChildId,
              arrows: 'to',
            });
          }
        }
      }
      
      console.log('Fixed nodes with new IDs, count:', fixedNodes.length);
      console.log('Fixed edges with new IDs, count:', fixedEdges.length);
      
      return {
        nodes: fixedNodes,
        edges: fixedEdges, // Use fixed edges instead of empty array
      };
    }

    // Create edges for parent-child relationships
    const edges: { from: string; to: string; arrows?: string }[] = [];
    const displayedNodeIds = new Set(displayBacteria.map(b => b.id));

    // Debug: Log parent-child relationships
    const bacteriaWithParents = displayBacteria.filter(b => b.parentId);
    console.log('[Evolution Debug] Bacteria with parents:', bacteriaWithParents.length);
    console.log('[Evolution Debug] Sample bacteria with parentId:', bacteriaWithParents.slice(0, 3));
    
    for (const bacterium of displayBacteria) {
      if (bacterium.parentId && displayedNodeIds.has(bacterium.parentId)) {
        // Ensure both source (parent) and target (child) are in the current node set
        edges.push({
          from: bacterium.parentId,
          to: bacterium.id,
          arrows: 'to',
        });
      }
    }
    
    console.log('[Evolution Debug] Edges created:', edges.length);
    console.log('[Evolution Debug] Sample edges:', edges.slice(0, 3));

    endCullingTimer();

    return {
      nodes: nodes || [],
      edges: edges || [],
    };
  }, [bacteria, maxDisplayNodes, enableSpatialSampling, performanceMonitor, nodeCuller]);

  // Remove D3 based updatePerformanceMetrics and handleZoom
  // const updatePerformanceMetrics = useCallback(() => { ... });
  // const handleZoom = useCallback((transform: { k: number; x: number; y: number }) => { ... });

  // Remove D3 based getOptimalParameters and configureForces
  // const getOptimalParameters = useCallback((nodeCount: number, frameRate: number, zoomLevel: number) => { ... });
  // const configureForces = useCallback(() => { ... });
  // useEffect(() => { /* configureForces logic */ }, [configureForces]);

  // Define a key that changes when bacteria data changes to force Graph remount
  const graphKey = React.useMemo(() => {
    const bacteriaCount = bacteria?.length || 0;
    const bacteriaHash = bacteria?.slice(0, 5).map(b => b.id).join('-') || 'empty';
    return `graph-${bacteriaCount}-${bacteriaHash}-${Date.now()}`;
  }, [bacteria]);

  // Debug effect for graph data
  useEffect(() => {
    console.log('[PetriDish] Rendering Graph with data:', {
      nodes: graphDataForVis.nodes.length,
      edges: graphDataForVis.edges.length,
      mounted,
      actualWidth,
      actualHeight,
      graphKey,
      sampleNodes: graphDataForVis.nodes.slice(0, 2)
    });
  }, [graphDataForVis, mounted, actualWidth, actualHeight, graphKey]);

  // Define options for react-graph-vis
  const options = React.useMemo(() => ({
    autoResize: false, // Disable autoResize completely
    width: '100%',
    height: '100%',
    nodes: {
      borderWidth: 2,
      borderWidthSelected: 3,
      font: {
        size: 10,
        face: "Tahoma",
        color: "#343434",
      },
      shapeProperties: {
        useImageSize: false,
      },
      scaling: {
        min: 8,
        max: 30,
      },
      shadow: {
        enabled: true,
        color: 'rgba(0,0,0,0.3)',
        size: 5,
        x: 2,
        y: 2
      }
    },
    edges: {
      color: "#ff6b6b",
      width: 3,
      smooth: {
        enabled: true,
        type: "continuous",
        roundness: 0.5,
      },
      arrows: {
        to: { enabled: true, scaleFactor: 1.0, type: 'arrow' }
      },
      shadow: {
        enabled: true,
        color: 'rgba(255,107,107,0.4)',
        size: 4,
        x: 2,
        y: 2
      }
    },
    physics: {
      enabled: true,
      barnesHut: {
        gravitationalConstant: -2000,
        centralGravity: 0.1,
        springLength: 100,
        springConstant: 0.04,
        damping: 0.09,
        avoidOverlap: 0.3
      },
      solver: 'barnesHut',
      stabilization: {
        enabled: true,
        iterations: 100, // Reduce iterations to prevent excessive layout
        fit: false, // Disable auto-fitting which can cause size changes
      },
      timestep: 0.5,
    },
    interaction: {
      hover: true,
      hideEdgesOnDrag: false,
      hideNodesOnDrag: false,
      navigationButtons: false,
      zoomView: true,
      dragView: true,
      dragNodes: true,
      multiselect: false,
      selectConnectedEdges: false,
      hoverConnectedEdges: true,
    },
    layout: {
      improvedLayout: true,
      randomSeed: Math.floor(Math.random() * 1000), // Different seed each time
    }
  }), []);

  // Define events for react-graph-vis
  const events = React.useMemo(() => ({
    click: (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (event.nodes && event.nodes.length > 0 && onBacteriumClick) {
        const selectedNodeId = event.nodes[0];
        const nodeData = graphDataForVis.nodes.find(n => n.id === selectedNodeId);
        if (nodeData && nodeData.originalData) {
          onBacteriumClick(nodeData.originalData);
        }
      }
    },
    hoverNode: (event: { node: string }) => {
      const nodeData = graphDataForVis.nodes.find(n => n.id === event.node);
      if (nodeData && nodeData.originalData) {
        setHoveredBacterium(nodeData.originalData);
      }
    },
    blurNode: () => {
      setHoveredBacterium(null);
    },
    oncontext: (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Prevent context menu to avoid interference with tooltips
      event.event.preventDefault();
    }
  }), [graphDataForVis.nodes, onBacteriumClick]); // Stable dependencies
  
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
        <div
            style={{
              width: containerSize.width,
              height: containerSize.height,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
        }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden', // Force overflow hidden on container
        maxWidth: '100%',
        maxHeight: '100%'
      }}
      onMouseLeave={handleMouseLeave}
    >
      {/* Circular border overlay - fixed position to prevent movement */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '90%',
          height: '90%',
          aspectRatio: '1',
          maxWidth: `${Math.min(actualWidth, actualHeight) * 0.9}px`,
          maxHeight: `${Math.min(actualWidth, actualHeight) * 0.9}px`,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          border: '3px solid rgba(128, 128, 128, 0.4)',
          backgroundColor: 'rgba(128, 128, 128, 0.05)',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />
      
      {cullingStats && (
        <div style={{ 
          position: 'absolute', 
          top: 10, 
          left: 10, 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '6px 10px', 
          fontSize: '11px', 
          borderRadius: '6px', 
          zIndex: 15, 
          pointerEvents: 'none',
          backdropFilter: 'blur(4px)'
        }}>
          <div><strong>Nodes:</strong> {cullingStats.displayCount} / {cullingStats.originalCount}</div>
          <div><strong>Culled:</strong> {(cullingStats.cullingRatio * 100).toFixed(1)}%</div>
        </div>
      )}
      
      {/* Hover instruction overlay */}
      <div style={{ 
        position: 'absolute', 
        bottom: 10, 
        right: 10, 
        background: 'rgba(0,0,0,0.7)', 
        color: 'white', 
        padding: '6px 10px', 
        fontSize: '11px', 
        borderRadius: '6px', 
        zIndex: 15, 
        pointerEvents: 'none',
        backdropFilter: 'blur(4px)'
      }}>
        <div><strong>💡 Hover over bacteria for details</strong></div>
        <div>🖱️ Click to select • 🔍 Scroll to zoom</div>
      </div>
      
      {/* Custom Tooltip Component */}
      {hoveredBacterium && mounted && (
        ReactDOM.createPortal(
          <BacteriumTooltip
            bacterium={hoveredBacterium}
            x={mousePosition.x}
            y={mousePosition.y}
            containerWidth={actualWidth}
            containerHeight={actualHeight}
          />,
          document.body
        )
      )}
      
      {/* Graph component wrapper - simplified */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute', // Keep it positioned within the main container
          top: 0,
          left: 0,
          // overflow: 'hidden' // Removed, rely on parent's overflow
        }}
      >
        <Graph
          key={graphKey}
          graph={graphDataForVis}
          options={options as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          events={events}
          getNetwork={(networkInstance: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            console.log('[PetriDish] vis-network instance received:', !!networkInstance);
            networkRef.current = networkInstance;
          }}
          style={{ 
            width: '100%', 
            height: '100%',
            border: '2px solid red', // Temporary: Visual debug border
            backgroundColor: 'rgba(0,255,0,0.1)', // Temporary: Visual debug background
            // overflow: 'hidden', // Removed
            // position: 'absolute' // Removed, Graph should fill its direct parent
          }}
        />
      </div>
    </div>
  );
});


PetriDish.displayName = 'PetriDish';
export default PetriDish;
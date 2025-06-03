"use client";

import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import dynamic from "next/dynamic";
import { Bacterium } from "@/types/simulation";
import { PetriDishProps, GraphNode } from "./types";
import { applyCircularBoundary, createGraphNodes, createValidatedLinks, validateLinks } from "./utils";
import { CachedNodeCuller, PerformanceMonitor } from "@/lib/performance";

const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

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
  enableAdaptivePerformance = true,
}: PetriDishProps) {
  const graphRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const frameTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  const lastErrorTimeRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const isRecoveringRef = useRef<boolean>(false);
  
  const [mounted, setMounted] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [containerSize, setContainerSize] = useState({ width, height });
  const [performanceMetrics, setPerformanceMetrics] = useState({
    frameRate: 60,
    lastFrameTime: 0,
    avgRenderTime: 16,
    zoomLevel: 1,
    nodeCount: 0,
  });
  const [cullingStats, setCullingStats] = useState<{
    originalCount: number;
    displayCount: number;
    cullingRatio: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateSize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setContainerSize({
        width: rect.width || width,
        height: rect.height || height,
      });
    }
  }, [width, height]);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  const actualWidth = containerSize.width;
  const actualHeight = containerSize.height;

  const graphData = React.useMemo(() => {
    const endCullingTimer = performanceMonitor.startTiming("node-culling");

    // Safety check for bacteria array
    if (!bacteria || !Array.isArray(bacteria)) {
      endCullingTimer();
      return {
        nodes: [],
        links: [],
      };
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

    const nodes = createGraphNodes(displayBacteria);
    const links = createValidatedLinks(displayBacteria);
    const validatedLinks = validateLinks(links, nodes);

    endCullingTimer();

    return {
      nodes: nodes || [],
      links: validatedLinks || [],
    };
  }, [bacteria, maxDisplayNodes, enableSpatialSampling]);

  const updatePerformanceMetrics = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFrame = now - frameTimeRef.current;
    const currentFrameRate = timeSinceLastFrame > 0 ? 1000 / timeSinceLastFrame : 60;
    
    renderCountRef.current++;
    frameTimeRef.current = now;

    if (renderCountRef.current % 10 === 0 && enableAdaptivePerformance) {
      setPerformanceMetrics(prev => ({
        ...prev,
        frameRate: currentFrameRate,
        lastFrameTime: now,
        avgRenderTime: timeSinceLastFrame,
        nodeCount: bacteria.length,
      }));
    }
  }, [bacteria.length, enableAdaptivePerformance]);

  const handleZoom = useCallback((transform: any) => {
    if (enableAdaptivePerformance) {
      // Use requestAnimationFrame to defer state update outside render cycle
      requestAnimationFrame(() => {
        setPerformanceMetrics(prev => ({
          ...prev,
          zoomLevel: transform.k || 1,
        }));
      });
    }
  }, [enableAdaptivePerformance]);

  const getOptimalParameters = useCallback((nodeCount: number, frameRate: number, zoomLevel: number) => {
    // D3.js standard values for stable simulations
    // Base configuration following D3 disjoint force-directed graph example
    let chargeStrength = -30;
    let alphaDecay = 0.0228; // D3's default - proper simulation settling
    let velocityDecay = 0.4; // D3's default - good damping
    let cooldownTicks = 300; // Allow proper simulation settling
    let cooldownTime = 15000; // 15 seconds to settle

    // Adaptive scaling based on node count
    if (nodeCount > 2000) {
      chargeStrength = -15;
      alphaDecay = 0.05; // Faster settling for large datasets
      velocityDecay = 0.6; // More damping
      cooldownTicks = 100;
      cooldownTime = 5000;
    } else if (nodeCount > 1000) {
      chargeStrength = -20;
      alphaDecay = 0.035;
      velocityDecay = 0.5;
      cooldownTicks = 200;
      cooldownTime = 10000;
    } else if (nodeCount > 500) {
      chargeStrength = -25;
      alphaDecay = 0.03;
      velocityDecay = 0.45;
      cooldownTicks = 250;
      cooldownTime = 12000;
    }

    // Performance-based adjustments
    if (frameRate < 30) {
      chargeStrength *= 0.7; // Reduce computational load
      alphaDecay *= 1.5; // Settle faster
      velocityDecay *= 1.3; // More damping
      cooldownTicks = Math.max(50, cooldownTicks * 0.5);
      cooldownTime = Math.max(2000, cooldownTime * 0.5);
    } else if (frameRate < 45) {
      chargeStrength *= 0.85;
      alphaDecay *= 1.2;
      velocityDecay *= 1.1;
      cooldownTicks = Math.max(100, cooldownTicks * 0.75);
      cooldownTime = Math.max(5000, cooldownTime * 0.75);
    }

    // Zoom-based adjustments
    if (zoomLevel > 2) {
      chargeStrength *= 1.1; // Stronger forces when zoomed in
      alphaDecay *= 0.9; // Slower settling for better interaction
      velocityDecay *= 0.95;
    } else if (zoomLevel < 0.5) {
      chargeStrength *= 0.9; // Weaker forces when zoomed out
      alphaDecay *= 1.1; // Faster settling
      velocityDecay *= 1.05;
    }

    // IMPORTANT: Always allow simulation to settle properly
    // Don't disable cooldown when simulation is running
    if (isSimulationRunning) {
      // Reduce cooldown but don't eliminate it completely
      cooldownTicks = Math.max(50, cooldownTicks * 0.3);
      cooldownTime = Math.max(2000, cooldownTime * 0.3);
    }

    return {
      chargeStrength,
      alphaDecay,
      velocityDecay,
      cooldownTicks,
      cooldownTime,
      centerStrength: 0.1, // Keep nodes loosely centered
      linkStrength: nodeCount > 500 ? 0.1 : 0.3, // Weaker links for better stability
    };
  }, [isSimulationRunning]);

  const applyBoundary = useCallback(
    (node: GraphNode) => applyCircularBoundary(node, actualWidth, actualHeight),
    [actualWidth, actualHeight]
  );

  const configureForces = useCallback(() => {
    if (!graphRef.current) return;
    
    // More comprehensive validation with early returns
    if (!graphData || typeof graphData !== 'object') {
      console.warn('Graph data is not available, skipping force configuration');
      return;
    }
    
    if (!graphData.nodes || !Array.isArray(graphData.nodes)) {
      console.warn('Graph data nodes is not available or not an array, skipping force configuration');
      return;
    }
    
    if (!graphData.links || !Array.isArray(graphData.links)) {
      console.warn('Graph data links is not available or not an array, skipping force configuration');
      return;
    }
    
    const now = Date.now();
    
    // Debounce errors to prevent infinite loops
    if (isRecoveringRef.current && now - lastErrorTimeRef.current < 1000) {
      return;
    }
    
    try {
      const fg = graphRef.current;
      
      // Double-check graphRef is still valid
      if (!fg) {
        console.warn('Graph ref became null during configuration');
        return;
      }
      
      // Store safe references to prevent mid-execution changes
      const safeNodes = graphData.nodes || [];
      const safeLinks = graphData.links || [];
      const nodeCount = safeNodes.length;
      
      const params = getOptimalParameters(
        nodeCount,
        performanceMetrics.frameRate,
        performanceMetrics.zoomLevel
      );

      // Always clear existing forces first to prevent stale references
      fg.d3Force("link", null);
      fg.d3Force("x", null);
      fg.d3Force("y", null);

      // Core forces following D3.js disjoint force-directed graph pattern
      fg.d3Force("charge").strength(params.chargeStrength);
      fg.d3Force("center").strength(params.centerStrength);
      
      // Add positioning forces to prevent continuous drifting
      // These forces gently pull nodes toward the center, providing stability
      fg.d3Force("x", fg.d3.forceX(actualWidth / 2).strength(0.1));
      fg.d3Force("y", fg.d3.forceY(actualHeight / 2).strength(0.1));
      
      // Collision detection to prevent node overlap
      fg.d3Force("collide", fg.d3.forceCollide()
        .radius(d => (d.size || 5) + 1) // Node radius + small gap
        .strength(0.7) // Strong collision resolution
        .iterations(1) // Single iteration for performance
      );

      // Safe access to links with additional validation
      if (safeLinks.length > 0 && safeNodes.length > 0) {
        const currentNodeIds = new Set(safeNodes.map(node => node.id));
        
        // Enhanced validation that handles both string IDs and object references
        const validLinks = safeLinks.filter(link => {
          if (!link) return false; // Safety check for null/undefined links
          
          // Handle both string IDs and object references from d3-force-3d
          const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
          const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
          
          const sourceExists = sourceId && currentNodeIds.has(sourceId);
          const targetExists = targetId && currentNodeIds.has(targetId);
          
          if (!sourceExists || !targetExists) {
            if (process.env.NODE_ENV === 'development' && now - lastErrorTimeRef.current > 5000) {
              console.warn(
                `Filtering invalid link: source=${sourceId} exists=${sourceExists}, target=${targetId} exists=${targetExists}`
              );
            }
            return false;
          }
          
          return true;
        });
        
        if (validLinks.length > 0) {
          // Create fresh link objects with string IDs to ensure d3-force-3d gets clean data
          const cleanLinks = validLinks.map(link => ({
            source: typeof link.source === 'string' ? link.source : (link.source as any)?.id,
            target: typeof link.target === 'string' ? link.target : (link.target as any)?.id,
            generation: link.generation
          }));
          
          fg.d3Force("link")
            .links(cleanLinks)
            .distance(30)
            .strength(params.linkStrength);
        }
      }

      // Safe boundary force with additional validation
      if (safeNodes.length > 0) {
        // Use a stable boundary force that works with D3's physics
        fg.d3Force("boundary", () => {
          const centerX = actualWidth / 2;
          const centerY = actualHeight / 2;
          const radius = Math.min(actualWidth, actualHeight) / 2 - 30;
          
          safeNodes.forEach(node => {
            if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') return;
            
            const dx = node.x - centerX;
            const dy = node.y - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > radius) {
              // Smoothly push nodes back inside the boundary
              const strength = 0.1;
              const factor = (distance - radius) / distance * strength;
              
              node.vx = (node.vx || 0) - dx * factor;
              node.vy = (node.vy || 0) - dy * factor;
            }
          });
        });
      }

      fg.cooldownTicks(params.cooldownTicks);
      fg.cooldownTime(params.cooldownTime);
      fg.d3AlphaDecay(params.alphaDecay);
      fg.d3VelocityDecay(params.velocityDecay);
      
      // Reset error tracking on success
      errorCountRef.current = 0;
      isRecoveringRef.current = false;
      
    } catch (error) {
      const now = Date.now();
      errorCountRef.current++;
      lastErrorTimeRef.current = now;
      isRecoveringRef.current = true;
      
      // Only log errors occasionally to prevent spam
      if (errorCountRef.current <= 3 || now - lastErrorTimeRef.current > 10000) {
        console.error('Error configuring forces:', error);
      }
      
      // Enhanced error recovery
      if (graphRef.current) {
        try {
          // Clear all forces and restart with D3.js stable configuration
          graphRef.current.d3Force("link", null);
          graphRef.current.d3Force("x", null);
          graphRef.current.d3Force("y", null);
          graphRef.current.d3Force("collide", null);
          graphRef.current.d3Force("boundary", null);
          
          // Apply minimal stable forces
          graphRef.current.d3Force("charge").strength(-30); // D3 default
          graphRef.current.d3Force("center").strength(0.1); // Weak centering
          graphRef.current.d3AlphaDecay(0.0228); // D3 default
          graphRef.current.d3VelocityDecay(0.4); // D3 default
        } catch (fallbackError) {
          if (errorCountRef.current <= 2) {
            console.error('Error in fallback force configuration:', fallbackError);
          }
        }
      }
      
      // Auto-recovery after a delay
      setTimeout(() => {
        isRecoveringRef.current = false;
      }, 2000);
    }
  }, [graphData, getOptimalParameters, performanceMetrics, applyBoundary]);

  useEffect(() => {
    // Only configure forces if we have valid graph data
    if (!graphData || !graphData.nodes || !Array.isArray(graphData.nodes)) {
      return;
    }
    
    // Throttle configureForces calls to prevent excessive updates
    const timeoutId = setTimeout(() => {
      if (!isRecoveringRef.current) {
        configureForces();
      }
    }, 50); // 50ms throttle
    
    return () => clearTimeout(timeoutId);
  }, [configureForces, graphData]);

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

  const cullingPerformance = performanceMonitor.getStats("node-culling");
  const optimalParams = getOptimalParameters(
    graphData?.nodes?.length || 0,
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
              links: (graphData.links || []).filter(link => {
                // Enhanced filtering that handles both string IDs and object references
                const sourceId = typeof link.source === 'string' ? link.source : (link.source as any)?.id;
                const targetId = typeof link.target === 'string' ? link.target : (link.target as any)?.id;
                
                const sourceExists = sourceId && graphData.nodes.some(node => node.id === sourceId);
                const targetExists = targetId && graphData.nodes.some(node => node.id === targetId);
                
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
            cooldownTicks={optimalParams.cooldownTicks}
            cooldownTime={optimalParams.cooldownTime}
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
            <strong>Interactions:</strong>
            <br />
            • Drag nodes to move
            <br />
            • Zoom to see details
            <br />
            • Connected nodes pull together
            <br />
            Lines = Inheritance
          </div>
        </div>
      </div>

      {/* Statistics overlay */}
      {mounted && graphData.nodes.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-3 text-xs">
          <div className="font-semibold mb-1">Population: {bacteria.length}</div>
          <div className="text-green-600">
            Sensitive: {bacteria.filter((b) => !b.isResistant).length}
          </div>
          <div className="text-red-600">
            Resistant: {bacteria.filter((b) => b.isResistant).length}
          </div>
          <div className="text-blue-600">
            Connections: {graphData.links?.length || 0}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default PetriDish; 
import { useCallback, useEffect } from "react";
import { GraphData, PerformanceMetrics, OptimalParameters, GraphNode } from "../types";

export function useForceConfiguration(
  graphRef: React.RefObject<any>,
  graphData: GraphData,
  performanceMetrics: PerformanceMetrics,
  getOptimalParameters: (nodeCount: number, frameRate: number, zoomLevel: number) => OptimalParameters,
  applyCircularBoundary: (node: GraphNode) => void
) {
  const configureForces = useCallback(() => {
    if (graphRef.current) {
      try {
        const fg = graphRef.current;
        const nodeCount = graphData.nodes.length;
        
        const params = getOptimalParameters(
          nodeCount,
          performanceMetrics.frameRate,
          performanceMetrics.zoomLevel
        );

        // Simple force configuration based on D3 disjoint force-directed graph pattern
        
        // 1. Charge force (repulsion between nodes)
        fg.d3Force("charge").strength(params.chargeStrength);
        
        // 2. Positioning forces (X and Y) instead of center force
        // These prevent detached subgraphs from escaping the viewport
        fg.d3Force("x", fg.d3.forceX().strength(params.forceXStrength));
        fg.d3Force("y", fg.d3.forceY().strength(params.forceYStrength));
        
        // 3. Link force configuration
        let validLinksCount = 0;
        if (graphData.links.length > 0) {
          const currentNodeIds = new Set(graphData.nodes.map(node => node.id));
          
          const validLinks = graphData.links.filter(link => 
            currentNodeIds.has(link.source as string) && 
            currentNodeIds.has(link.target as string)
          );
          validLinksCount = validLinks.length;
          
          if (validLinks.length > 0) {
            fg.d3Force("link")
              .links(validLinks)
              .distance(35)
              .strength(params.linkStrength)
              .iterations(2);
          } else {
            fg.d3Force("link", null);
          }
        } else {
          fg.d3Force("link", null);
        }

        // 4. Boundary force to keep nodes within circular boundary
        fg.d3Force("boundary", () => {
          graphData.nodes.forEach(applyCircularBoundary);
        });

        // 5. Simulation parameters
        fg.d3AlphaDecay(params.alphaDecay);
        fg.d3VelocityDecay(params.velocityDecay);

        // 6. Debugging (Development only)
        if (process.env.NODE_ENV === 'development') {
          console.log('Force Configuration Applied:', {
            nodeCount,
            chargeStrength: params.chargeStrength,
            forceXStrength: params.forceXStrength,
            forceYStrength: params.forceYStrength,
            linkCount: validLinksCount,
            alphaDecay: params.alphaDecay,
            velocityDecay: params.velocityDecay,
            currentAlpha: fg.d3Alpha()
          });
        }
        
      } catch (error) {
        console.error('Error configuring forces:', error);
        
        // Fallback configuration
        if (graphRef.current) {
          try {
            const fg = graphRef.current;
            
            // Apply minimal safe setup
            fg.d3Force("charge").strength(-30);
            fg.d3Force("x", fg.d3.forceX().strength(0.1));
            fg.d3Force("y", fg.d3.forceY().strength(0.1));
            fg.d3Force("link", null);
            fg.d3Force("boundary", null);
            
            console.warn('Applied fallback force configuration');
          } catch (fallbackError) {
            console.error('Critical error in fallback configuration:', fallbackError);
          }
        }
      }
    }
  }, [graphData, getOptimalParameters, performanceMetrics, applyCircularBoundary, graphRef]);

  useEffect(() => {
    configureForces();
  }, [configureForces]);

  return configureForces;
} 
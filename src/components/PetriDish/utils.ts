import { Bacterium } from "@/types/simulation";
import { GraphNode, GraphLink } from "./types";

export function validateLinks(
  links: GraphLink[],
  nodes: GraphNode[]
): GraphLink[] {
  const nodeIdSet = new Set(nodes.map(n => n.id));
  
  return links.filter(link => {
    const sourceExists = nodeIdSet.has(link.source);
    const targetExists = nodeIdSet.has(link.target);
    
    if (!sourceExists || !targetExists) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Removing invalid link: source=${link.source} exists=${sourceExists}, target=${link.target} exists=${targetExists}`
        );
      }
      return false;
    }
    return true;
  });
}

export function createGraphNodes(bacteria: Bacterium[]): GraphNode[] {
  return bacteria.map((bacterium) => ({
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
}

export function createValidatedLinks(bacteria: Bacterium[]): GraphLink[] {
  const links: GraphLink[] = [];
  const displayedNodeIds = new Set(bacteria.map(b => b.id));

  bacteria.forEach((bacterium) => {
    if (bacterium.parentId && displayedNodeIds.has(bacterium.parentId)) {
      const parentExists = bacteria.some(b => b.id === bacterium.parentId);
      const childExists = bacteria.some(b => b.id === bacterium.id);
      
      if (parentExists && childExists) {
        links.push({
          source: bacterium.parentId,
          target: bacterium.id,
          generation: bacterium.generation,
        });
      } else if (process.env.NODE_ENV === 'development') {
        console.warn(
          `Link validation failed: parent=${bacterium.parentId} exists=${parentExists}, child=${bacterium.id} exists=${childExists}`
        );
      }
    }
  });

  return links;
}

export function applyCircularBoundary(
  node: GraphNode,
  width: number,
  height: number
): void {
  const centerX = width / 2;
  const centerY = height / 2;
  const maxRadius = Math.min(width, height) / 2 - 30; // Slightly smaller boundary
  
  const dx = (node.x || 0) - centerX;
  const dy = (node.y || 0) - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > maxRadius) {
    // 🎯 ENHANCED BOUNDARY IMPLEMENTATION
    
    // Calculate boundary position with small buffer
    const angle = Math.atan2(dy, dx);
    const boundaryX = centerX + maxRadius * Math.cos(angle);
    const boundaryY = centerY + maxRadius * Math.sin(angle);
    
    // STRONG position correction - move node inside boundary
    node.x = boundaryX;
    node.y = boundaryY;
    
    // 🚀 VELOCITY DAMPENING - prevent "escape velocity"
    // This is the key fix that was missing!
    if (node.vx || node.vy) {
      // Calculate velocity component towards center
      const vx = node.vx || 0;
      const vy = node.vy || 0;
      
      // Project velocity onto boundary normal (outward direction)
      const normalX = dx / distance;
      const normalY = dy / distance;
      const velocityProjection = vx * normalX + vy * normalY;
      
      // If velocity is pointing outward, reverse and dampen it
      if (velocityProjection > 0) {
        // Remove outward velocity component and add inward "bounce"
        node.vx = vx - velocityProjection * normalX * 1.5; // Bounce back
        node.vy = vy - velocityProjection * normalY * 1.5;
        
        // Apply strong dampening to prevent oscillation
        node.vx *= 0.3;
        node.vy *= 0.3;
      } else {
        // If already moving inward, just apply mild dampening
        if (node.vx !== undefined) node.vx *= 0.7;
        if (node.vy !== undefined) node.vy *= 0.7;
      }
    }
  } else if (distance > maxRadius * 0.9) {
    // 🎯 SOFT BOUNDARY - gentle nudge when approaching edge
    const angle = Math.atan2(dy, dx);
    const pushStrength = (distance - maxRadius * 0.9) / (maxRadius * 0.1);
    
    // Apply gentle inward force
    const pushX = -Math.cos(angle) * pushStrength * 0.5;
    const pushY = -Math.sin(angle) * pushStrength * 0.5;
    
    if (node.vx !== undefined) node.vx += pushX;
    if (node.vy !== undefined) node.vy += pushY;
  }
} 
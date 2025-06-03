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
  const radius = Math.min(width, height) / 2 - 20;

  const dx = (node.x || 0) - centerX;
  const dy = (node.y || 0) - centerY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance > radius) {
    const angle = Math.atan2(dy, dx);
    node.x = centerX + radius * Math.cos(angle);
    node.y = centerY + radius * Math.sin(angle);

    if (node.vx) node.vx *= 0.1;
    if (node.vy) node.vy *= 0.1;
  }
} 
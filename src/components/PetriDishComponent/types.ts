import { Bacterium } from "@/types/simulation";

export interface PetriDishProps {
  bacteria: Bacterium[];
  width?: number;
  height?: number;
  isSimulationRunning?: boolean;
  onBacteriumClick?: (bacterium: Bacterium) => void;
  maxDisplayNodes?: number;
  enableSpatialSampling?: boolean;
  enableAdaptivePerformance?: boolean;
}

export interface GraphNode {
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

export interface GraphLink {
  source: string;
  target: string;
  generation: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface PerformanceMetrics {
  frameRate: number;
  lastFrameTime: number;
  avgRenderTime: number;
  zoomLevel: number;
  nodeCount: number;
}

export interface CullingStats {
  originalCount: number;
  displayCount: number;
  cullingRatio: number;
}

export interface OptimalParameters {
  chargeStrength: number;
  alphaDecay: number;
  velocityDecay: number;
  forceXStrength: number;
  forceYStrength: number;
  linkStrength: number;
} 
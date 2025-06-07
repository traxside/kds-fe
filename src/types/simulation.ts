import { z } from "zod";

export interface Bacterium {
  id: string;
  x: number;
  y: number;
  isResistant: boolean;
  fitness: number;
  age: number;
  generation: number;
  parentId?: string;
  color: string;
  size: number;
}

// Zod validation schema for simulation parameters
export const simulationParametersSchema = z.object({
  initialPopulation: z
    .number()
    .int()
    .min(1, "Population must be at least 1")
    .max(1000, "Population cannot exceed 1000"),
  growthRate: z
    .number()
    .min(0.001, "Growth rate must be positive")
    .max(1, "Growth rate cannot exceed 100%"),
  antibioticConcentration: z
    .number()
    .min(0, "Concentration cannot be negative")
    .max(1, "Concentration cannot exceed 100%"),
  mutationRate: z
    .number()
    .min(0, "Mutation rate cannot be negative")
    .max(0.1, "Mutation rate cannot exceed 10%"),
  duration: z
    .number()
    .int()
    .min(1, "Duration must be at least 1 generation")
    .max(1000, "Duration cannot exceed 1000 generations"),
  petriDishSize: z
    .number()
    .int()
    .min(100, "Petri dish size must be at least 100px")
    .max(800, "Petri dish size cannot exceed 800px"),
});

export type SimulationParametersInput = z.infer<
  typeof simulationParametersSchema
>;

export type SimulationParameters = SimulationParametersInput;

export interface SimulationState {
  generation: number;
  timeElapsed: number;
  bacteria: Bacterium[];
  isRunning: boolean;
  isPaused: boolean;
  stepCount: number;
  simulationSpeed: number;
}

export interface SimulationStatistics {
  totalPopulation: number[];
  resistantCount: number[];
  sensitiveCount: number[];
  averageFitness: number[];
  mutationEvents: number[];
  generations: number[];
  antibioticDeaths: number[];
  naturalDeaths: number[];
  reproductions: number[];
}

// Extended metadata interfaces for comprehensive simulation tracking
export interface SimulationPerformanceMetrics {
  averageGenerationTime: number; // milliseconds per generation
  totalExecutionTime: number; // total runtime in milliseconds
  memoryUsage?: number; // peak memory usage in MB
  cpuUtilization?: number; // average CPU usage percentage
  renderFrameRate?: number; // average FPS during visualization
  maxPopulationReached: number;
  extinctionEvents: number;
  resistanceEmergenceGeneration?: number; // first generation with resistance
}

export interface SimulationComplexityMetrics {
  parameterComplexity: number; // 1-10 scale based on parameter combinations
  populationVolatility: number; // measure of population fluctuation
  resistanceStability: number; // measure of resistance ratio stability
  evolutionaryPressure: number; // combined effect of selection pressures
  computationalComplexity: number; // estimated computational requirements
}

export interface SimulationMetadata {
  // User-editable fields
  tags: string[]; // User-defined tags for categorization
  category: string; // Primary category (e.g., "research", "education")
  notes: string; // User notes and observations
  rating?: number; // User rating 1-5 stars
  favorite: boolean; // User favorited status

  // Automatically generated fields
  version: string; // Simulation engine version used
  performanceMetrics: SimulationPerformanceMetrics;
  complexityMetrics: SimulationComplexityMetrics;

  // Research and analysis fields
  hypothesis?: string; // Research hypothesis being tested
  methodology?: string; // Experimental methodology
  conclusions?: string; // Research conclusions

  // Collaboration fields
  sharedWith?: string[]; // User IDs simulation is shared with
  isPublic: boolean; // Whether simulation is publicly viewable

  // Technical metadata
  browserInfo?: string; // Browser and version used
  deviceInfo?: string; // Device type and capabilities
  exportHistory: ExportRecord[]; // History of exports
}

export interface ExportRecord {
  exportedAt: string;
  format: "json" | "csv";
  options: string; // JSON stringified export options
  fileSize: number; // Size in bytes
}

// Comprehensive simulation interface with metadata
export interface Simulation {
  id: string;
  name: string;
  description?: string;
  parameters: SimulationParameters;
  currentState: SimulationState;
  statistics: SimulationStatistics;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  userId?: string;

  // Extended metadata
  metadata?: SimulationMetadata;
}

// Search and filter interfaces
export interface SimulationSearchFilters {
  // Text search
  searchQuery?: string;

  // Status filters
  status?: "all" | "running" | "paused" | "completed";

  // Date range filters
  createdAfter?: string;
  createdBefore?: string;

  // Parameter range filters
  populationRange?: { min: number; max: number };
  growthRateRange?: { min: number; max: number };
  antibioticConcentrationRange?: { min: number; max: number };
  mutationRateRange?: { min: number; max: number };

  // Metadata filters
  tags?: string[];
  category?: string;
  rating?: number;
  favoritesOnly?: boolean;
  isPublic?: boolean;

  // Complexity filters
  complexityRange?: { min: number; max: number };

  // Sorting options
  sortBy?: "date" | "name" | "rating" | "complexity" | "performance";
  sortOrder?: "asc" | "desc";

  // Pagination
  page?: number;
  limit?: number;
}

export interface SimulationSearchResult {
  simulations: Simulation[];
  totalCount: number;
  filters: SimulationSearchFilters;
  facets?: {
    categories: { [category: string]: number };
    tags: { [tag: string]: number };
    complexityDistribution: { [range: string]: number };
  };
}

// Preset configurations for common scenarios
export const simulationPresets = {
  default: {
    initialPopulation: 50,
    growthRate: 0.1,
    antibioticConcentration: 0.0,
    mutationRate: 0.02,
    duration: 100,
    petriDishSize: 600,
  },
  highPressure: {
    initialPopulation: 100,
    growthRate: 0.15,
    antibioticConcentration: 0.8,
    mutationRate: 0.05,
    duration: 200,
    petriDishSize: 600,
  },
  slowEvolution: {
    initialPopulation: 30,
    growthRate: 0.05,
    antibioticConcentration: 0.3,
    mutationRate: 0.001,
    duration: 500,
    petriDishSize: 600,
  },
  rapidMutation: {
    initialPopulation: 75,
    growthRate: 0.2,
    antibioticConcentration: 0.5,
    mutationRate: 0.08,
    duration: 150,
    petriDishSize: 600,
  },
} as const;

// Utility functions for metadata management
export const createDefaultMetadata = (): SimulationMetadata => ({
  tags: [],
  category: "general",
  notes: "",
  favorite: false,
  version: "1.0.0",
  performanceMetrics: {
    averageGenerationTime: 0,
    totalExecutionTime: 0,
    maxPopulationReached: 0,
    extinctionEvents: 0,
  },
  complexityMetrics: {
    parameterComplexity: 1,
    populationVolatility: 0,
    resistanceStability: 0,
    evolutionaryPressure: 0,
    computationalComplexity: 1,
  },
  isPublic: false,
  exportHistory: [],
});

// Common simulation categories
export const simulationCategories = [
  "general",
  "research",
  "education",
  "experiment",
  "optimization",
  "validation",
] as const;

export type SimulationCategory = typeof simulationCategories[number];

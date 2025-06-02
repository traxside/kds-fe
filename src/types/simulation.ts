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

export interface SimulationParameters extends SimulationParametersInput {
  // Additional computed or derived properties can go here
}

export interface SimulationState {
  generation: number;
  timeElapsed: number;
  bacteria: Bacterium[];
  isRunning: boolean;
}

export interface SimulationStatistics {
  totalPopulation: number[];
  resistantCount: number[];
  sensitiveCount: number[];
  averageFitness: number[];
  mutationEvents: number[];
  generations: number[];
}

export interface Simulation {
  id: string;
  name: string;
  parameters: SimulationParameters;
  currentState: SimulationState;
  statistics: SimulationStatistics;
  createdAt: string;
  updatedAt: string;
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

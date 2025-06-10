import { Bacterium, SimulationParametersInput } from "@/types/simulation";

// Interfaces for simulation calculations
export interface SimulationStepResult {
  bacteria: Bacterium[];
  statistics: {
    totalPopulation: number;
    resistantCount: number;
    sensitiveCount: number;
    averageFitness: number;
    mutationEvents: number;
    antibioticDeaths: number;
    naturalDeaths: number;
    reproductions: number;
  };
}

export interface Position {
  x: number;
  y: number;
}

/**
 * Frontend simulation engine for WebWorker calculations
 * Ported and optimized from backend SimulationEngine
 */
export class SimulationEngine {
  private static readonly DEFAULT_COLORS = [
    "#22c55e", // Green for sensitive
    "#ef4444", // Red for resistant
    "#3b82f6", // Blue variant
    "#eab308", // Yellow variant
    "#a855f7", // Purple variant
    "#06b6d4", // Cyan variant
  ];

  /**
   * Initialize bacteria population with random placement in petri dish
   */
  static initializeBacteria(params: SimulationParametersInput): Bacterium[] {
    const bacteria: Bacterium[] = [];
    const radius = params.petriDishSize / 2;
    const center = { x: radius, y: radius };

    for (let i = 0; i < params.initialPopulation; i++) {
      const position = this.generateRandomPositionInCircle(center, radius);
      const isResistant = Math.random() < 0.1; // 10% initial resistance

      bacteria.push({
        id: `bacteria_${i}_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`,
        x: position.x,
        y: position.y,
        isResistant,
        fitness: this.generateInitialFitness(isResistant),
        age: 0,
        generation: 0,
        parentId: undefined,
        color: isResistant ? this.DEFAULT_COLORS[1] : this.DEFAULT_COLORS[0],
        size: Math.random() * 3 + 2, // Size between 2-5
      });
    }

    return bacteria;
  }

  /**
   * Calculate next generation based on current bacteria and parameters
   */
  static calculateNextGeneration(
    bacteria: Bacterium[],
    params: SimulationParametersInput
  ): SimulationStepResult {
    let mutationEvents = 0;
    let antibioticDeaths = 0;
    let naturalDeaths = 0;
    let reproductions = 0;

    // Step 1: Age all bacteria
    const agedBacteria = bacteria.map((bacterium) => ({
      ...bacterium,
      age: (bacterium.age || 0) + 1,
    }));

    // Step 2: Apply antibiotic effects
    const survivors = agedBacteria.filter((bacterium) => {
      const survived = this.applyAntibioticEffect(
        bacterium,
        params.antibioticConcentration
      );
      if (!survived) antibioticDeaths++;
      return survived;
    });

    // Step 3: Apply natural death (age-related)
    const livingBacteria = survivors.filter((bacterium) => {
      const survived = this.applyNaturalDeath(bacterium);
      if (!survived) naturalDeaths++;
      return survived;
    });

    // Step 4: Calculate carrying capacity and determine reproduction
    const carryingCapacity = this.calculateCarryingCapacity(params);
    const currentPopulation = livingBacteria.length;

    // Only reproduce if under carrying capacity
    const offspring: Bacterium[] = [];
    if (currentPopulation < carryingCapacity) {
      for (const bacterium of livingBacteria) {
        if (
          this.shouldReproduce(
            bacterium,
            params,
            currentPopulation,
            carryingCapacity
          )
        ) {
          const child = this.reproduceBacterium(bacterium, params);
          if (child) {
            offspring.push(child);
            reproductions++;
          }
        }
      }
    }

    // Step 5: Apply mutations to all bacteria (parents and offspring)
    const allBacteria = [...livingBacteria, ...offspring];
    const mutatedBacteria = allBacteria.map((bacterium) => {
      const mutated = this.processMutations(bacterium, params.mutationRate);
      if (mutated.hasMutated) mutationEvents++;
      return mutated.bacterium;
    });

    // Step 6: Calculate statistics
    const statistics = this.calculateStatistics(mutatedBacteria);
    statistics.mutationEvents = mutationEvents;
    statistics.antibioticDeaths = antibioticDeaths;
    statistics.naturalDeaths = naturalDeaths;
    statistics.reproductions = reproductions;

    return {
      bacteria: mutatedBacteria,
      statistics,
    };
  }

  /**
   * Apply antibiotic effect using exponential survival model
   * Survival probability S = e^(-k×C×(1-resistance_factor))
   */
  static applyAntibioticEffect(
    bacterium: Bacterium,
    concentration: number
  ): boolean {
    if (concentration === 0) return true;

    // Resistance factor: resistant bacteria have higher survival
    const resistanceFactor = bacterium.isResistant ? 0.9 : 0.1;

    // Kill constant (affects how deadly the antibiotic is) - reduced to be less lethal
    const killConstant = 1.5;

    // Survival probability calculation
    const effectiveConcentration = concentration * (1 - resistanceFactor);
    const survivalProbability = Math.exp(
      -killConstant * effectiveConcentration
    );

    return Math.random() < survivalProbability;
  }

  /**
   * Apply natural death based on age and fitness
   */
  static applyNaturalDeath(bacterium: Bacterium): boolean {
    // Base survival rate decreases with age
    const baseSurvivalRate = 0.98; // 98% survival per generation
    const ageFactor = Math.pow(0.99, bacterium.age || 0); // Exponential age-related decline
    const fitnessFactor = bacterium.fitness || 1.0; // Higher fitness = better survival

    const survivalProbability = baseSurvivalRate * ageFactor * fitnessFactor;

    return Math.random() < survivalProbability;
  }

  /**
   * Determine if a bacterium should reproduce
   */
  static shouldReproduce(
    bacterium: Bacterium,
    params: SimulationParametersInput,
    currentPopulation: number,
    carryingCapacity: number
  ): boolean {
    // Age-based reproduction (bacteria reproduce when young)
    const age = bacterium.age || 0;
    if (age < 1 || age > 10) return false; // Only reproduce between age 1-10

    // Fitness affects reproduction rate
    const fitness = bacterium.fitness || 1.0;
    const baseReproductionRate = params.growthRate * fitness;

    // Population pressure reduces reproduction
    const populationPressure = 1 - currentPopulation / carryingCapacity;
    const reproductionRate = baseReproductionRate * populationPressure;

    return Math.random() < reproductionRate;
  }

  /**
   * Create offspring from parent bacterium
   */
  static reproduceBacterium(
    parent: Bacterium,
    params: SimulationParametersInput
  ): Bacterium | null {
    const position = this.findOffspringPosition(parent, params);
    if (!position) return null;

    // Child inherits most traits from parent with slight variations
    const child: Bacterium = {
      id: `bacteria_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: position.x,
      y: position.y,
      isResistant: parent.isResistant, // Resistance is inherited
      fitness: this.inheritFitness(parent.fitness || 1.0),
      age: 0,
      generation: (parent.generation || 0) + 1,
      parentId: parent.id,
      color: parent.color, // Same color as parent
      size: Math.max(2, Math.min(8, parent.size + (Math.random() - 0.5) * 0.5)),
    };

    return child;
  }

  /**
   * Process mutations for a bacterium
   */
  static processMutations(
    bacterium: Bacterium,
    mutationRate: number
  ): { bacterium: Bacterium; hasMutated: boolean } {
    let hasMutated = false;
    const mutatedBacterium = { ...bacterium };

    // Resistance mutation (rare but significant)
    if (!bacterium.isResistant && Math.random() < mutationRate * 0.1) {
      mutatedBacterium.isResistant = true;
      mutatedBacterium.color = this.DEFAULT_COLORS[1]; // Red for resistant
      mutatedBacterium.fitness *= 0.8; // Resistance comes with fitness cost
      hasMutated = true;
    }

    // Fitness mutations (more common)
    if (Math.random() < mutationRate) {
      const fitnessChange = (Math.random() - 0.5) * 0.1; // ±5% fitness change
      mutatedBacterium.fitness = Math.max(
        0.1,
        Math.min(2.0, (bacterium.fitness || 1.0) + fitnessChange)
      );
      hasMutated = true;
    }

    // Size mutations (cosmetic)
    if (Math.random() < mutationRate * 0.5) {
      const sizeChange = (Math.random() - 0.5) * 0.3;
      mutatedBacterium.size = Math.max(
        2,
        Math.min(8, bacterium.size + sizeChange)
      );
      hasMutated = true;
    }

    return { bacterium: mutatedBacterium, hasMutated };
  }

  /**
   * Calculate population statistics
   */
  static calculateStatistics(bacteria: Bacterium[]): {
    totalPopulation: number;
    resistantCount: number;
    sensitiveCount: number;
    averageFitness: number;
    mutationEvents: number;
    antibioticDeaths: number;
    naturalDeaths: number;
    reproductions: number;
  } {
    const totalPopulation = bacteria.length;
    const resistantCount = bacteria.filter((b) => b.isResistant).length;
    const sensitiveCount = totalPopulation - resistantCount;

    const averageFitness =
      totalPopulation > 0
        ? bacteria.reduce((sum, b) => sum + (b.fitness || 1.0), 0) /
          totalPopulation
        : 0;

    return {
      totalPopulation,
      resistantCount,
      sensitiveCount,
      averageFitness,
      mutationEvents: 0, // Will be set by caller
      antibioticDeaths: 0, // Will be set by caller
      naturalDeaths: 0, // Will be set by caller
      reproductions: 0, // Will be set by caller
    };
  }

  // Private helper methods

  private static generateRandomPositionInCircle(
    center: Position,
    radius: number
  ): Position {
    // Generate random position within circle using rejection sampling
    let x, y;
    do {
      x = center.x + (Math.random() - 0.5) * 2 * radius;
      y = center.y + (Math.random() - 0.5) * 2 * radius;
    } while (
      (x - center.x) ** 2 + (y - center.y) ** 2 > radius ** 2
    );

    return { x, y };
  }

  private static generateInitialFitness(isResistant: boolean): number {
    // Resistant bacteria start with slightly lower fitness (cost of resistance)
    const baseFitness = isResistant ? 0.8 : 1.0;
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    return Math.max(0.1, Math.min(2.0, baseFitness + variation));
  }

  private static calculateCarryingCapacity(
    params: SimulationParametersInput
  ): number {
    // Carrying capacity based on petri dish size and resources
    const area = Math.PI * (params.petriDishSize / 2) ** 2;
    const bacteriaPerUnit = 0.003; // Increased density factor for more bacteria growth
    return Math.floor(area * bacteriaPerUnit);
  }

  private static findOffspringPosition(
    parent: Bacterium,
    params: SimulationParametersInput
  ): Position | null {
    const maxAttempts = 10;
    const radius = params.petriDishSize / 2;
    const center = { x: radius, y: radius };
    const maxDistance = 20; // Maximum distance from parent

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * maxDistance;
      
      const x = parent.x + Math.cos(angle) * distance;
      const y = parent.y + Math.sin(angle) * distance;

      // Check if position is within petri dish
      if ((x - center.x) ** 2 + (y - center.y) ** 2 <= radius ** 2) {
        return { x, y };
      }
    }

    return null; // Could not find valid position
  }

  private static inheritFitness(parentFitness: number): number {
    // Small random variation from parent fitness
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    return Math.max(0.1, Math.min(2.0, parentFitness + variation));
  }
} 
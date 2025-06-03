"use client";

import { 
  Simulation, 
  SimulationMetadata, 
  SimulationPerformanceMetrics, 
  SimulationComplexityMetrics,
  SimulationParameters,
  SimulationStatistics,
  createDefaultMetadata,
  ExportRecord
} from "@/types/simulation";

/**
 * Utility class for managing simulation metadata
 */
export class MetadataManager {
  /**
   * Generate performance metrics from simulation data
   */
  static calculatePerformanceMetrics(
    simulation: Simulation,
    executionTimeMs?: number,
    memoryUsageMB?: number,
    cpuUtilization?: number,
    renderFrameRate?: number
  ): SimulationPerformanceMetrics {
    const { currentState, statistics } = simulation;
    
    // Calculate average generation time
    const averageGenerationTime = executionTimeMs 
      ? executionTimeMs / Math.max(currentState.generation, 1)
      : 0;
    
    // Find maximum population reached
    const maxPopulationReached = statistics.totalPopulation.length > 0
      ? Math.max(...statistics.totalPopulation)
      : currentState.bacteria.length;
    
    // Count extinction events (population drops to 0)
    const extinctionEvents = statistics.totalPopulation.filter(pop => pop === 0).length;
    
    // Find when resistance first emerged
    let resistanceEmergenceGeneration: number | undefined;
    for (let i = 0; i < statistics.resistantCount.length; i++) {
      if (statistics.resistantCount[i] > 0) {
        resistanceEmergenceGeneration = i;
        break;
      }
    }
    
    return {
      averageGenerationTime,
      totalExecutionTime: executionTimeMs || 0,
      memoryUsage: memoryUsageMB,
      cpuUtilization,
      renderFrameRate,
      maxPopulationReached,
      extinctionEvents,
      resistanceEmergenceGeneration,
    };
  }
  
  /**
   * Calculate complexity metrics based on parameters and simulation behavior
   */
  static calculateComplexityMetrics(
    parameters: SimulationParameters,
    statistics: SimulationStatistics
  ): SimulationComplexityMetrics {
    // Parameter complexity (1-10 scale)
    const parameterComplexity = this.calculateParameterComplexity(parameters);
    
    // Population volatility (standard deviation of population changes)
    const populationVolatility = this.calculateVolatility(statistics.totalPopulation);
    
    // Resistance stability (how stable the resistance ratio is)
    const resistanceStability = this.calculateResistanceStability(
      statistics.resistantCount,
      statistics.totalPopulation
    );
    
    // Evolutionary pressure (combination of selection pressures)
    const evolutionaryPressure = this.calculateEvolutionaryPressure(parameters);
    
    // Computational complexity estimate
    const computationalComplexity = this.calculateComputationalComplexity(parameters);
    
    return {
      parameterComplexity,
      populationVolatility,
      resistanceStability,
      evolutionaryPressure,
      computationalComplexity,
    };
  }
  
  /**
   * Calculate parameter complexity score (1-10)
   */
  private static calculateParameterComplexity(parameters: SimulationParameters): number {
    let complexity = 1;
    
    // High population increases complexity
    if (parameters.initialPopulation > 500) complexity += 2;
    else if (parameters.initialPopulation > 200) complexity += 1;
    
    // High growth rate increases complexity
    if (parameters.growthRate > 0.3) complexity += 2;
    else if (parameters.growthRate > 0.15) complexity += 1;
    
    // High antibiotic concentration increases complexity
    if (parameters.antibioticConcentration > 0.7) complexity += 2;
    else if (parameters.antibioticConcentration > 0.4) complexity += 1;
    
    // High mutation rate increases complexity
    if (parameters.mutationRate > 0.05) complexity += 2;
    else if (parameters.mutationRate > 0.02) complexity += 1;
    
    // Long duration increases complexity
    if (parameters.duration > 500) complexity += 1;
    
    return Math.min(complexity, 10);
  }
  
  /**
   * Calculate population volatility
   */
  private static calculateVolatility(populations: number[]): number {
    if (populations.length < 2) return 0;
    
    const changes = [];
    for (let i = 1; i < populations.length; i++) {
      const change = Math.abs(populations[i] - populations[i - 1]) / Math.max(populations[i - 1], 1);
      changes.push(change);
    }
    
    const mean = changes.reduce((sum, change) => sum + change, 0) / changes.length;
    const variance = changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
    
    return Math.sqrt(variance);
  }
  
  /**
   * Calculate resistance stability
   */
  private static calculateResistanceStability(
    resistantCounts: number[],
    totalPopulations: number[]
  ): number {
    if (resistantCounts.length !== totalPopulations.length || resistantCounts.length < 2) {
      return 1; // Default to stable
    }
    
    const resistanceRatios = resistantCounts.map((resistant, i) => 
      totalPopulations[i] > 0 ? resistant / totalPopulations[i] : 0
    );
    
    return 1 - this.calculateVolatility(resistanceRatios);
  }
  
  /**
   * Calculate evolutionary pressure
   */
  private static calculateEvolutionaryPressure(parameters: SimulationParameters): number {
    // Combination of factors that create evolutionary pressure
    const antibioticPressure = parameters.antibioticConcentration;
    const mutationPressure = parameters.mutationRate * 10; // Scale to 0-1
    const competitionPressure = Math.min(parameters.initialPopulation / 1000, 1);
    
    return (antibioticPressure + mutationPressure + competitionPressure) / 3;
  }
  
  /**
   * Calculate computational complexity estimate
   */
  private static calculateComputationalComplexity(parameters: SimulationParameters): number {
    // Base complexity
    let complexity = 1;
    
    // Population size impact (quadratic for interactions)
    const populationFactor = Math.pow(parameters.initialPopulation / 100, 1.5);
    complexity *= populationFactor;
    
    // Duration impact (linear)
    const durationFactor = parameters.duration / 100;
    complexity *= durationFactor;
    
    // Visualization impact
    const visualizationFactor = Math.pow(parameters.petriDishSize / 600, 2);
    complexity *= visualizationFactor;
    
    return Math.min(complexity, 10);
  }
  
  /**
   * Update metadata with new information
   */
  static updateMetadata(
    existingMetadata: SimulationMetadata | undefined,
    updates: Partial<SimulationMetadata>
  ): SimulationMetadata {
    const metadata = existingMetadata || createDefaultMetadata();
    
    return {
      ...metadata,
      ...updates,
      // Merge arrays properly
      tags: updates.tags || metadata.tags,
      exportHistory: updates.exportHistory || metadata.exportHistory,
      sharedWith: updates.sharedWith || metadata.sharedWith,
    };
  }
  
  /**
   * Add export record to metadata
   */
  static addExportRecord(
    metadata: SimulationMetadata,
    exportRecord: Omit<ExportRecord, "exportedAt">
  ): SimulationMetadata {
    const fullRecord: ExportRecord = {
      ...exportRecord,
      exportedAt: new Date().toISOString(),
    };
    
    return {
      ...metadata,
      exportHistory: [...metadata.exportHistory, fullRecord],
    };
  }
  
  /**
   * Generate comprehensive metadata for a simulation
   */
  static generateComprehensiveMetadata(
    simulation: Simulation,
    performanceData?: {
      executionTimeMs?: number;
      memoryUsageMB?: number;
      cpuUtilization?: number;
      renderFrameRate?: number;
    },
    userEdits?: Partial<SimulationMetadata>
  ): SimulationMetadata {
    const performanceMetrics = this.calculatePerformanceMetrics(
      simulation,
      performanceData?.executionTimeMs,
      performanceData?.memoryUsageMB,
      performanceData?.cpuUtilization,
      performanceData?.renderFrameRate
    );
    
    const complexityMetrics = this.calculateComplexityMetrics(
      simulation.parameters,
      simulation.statistics
    );
    
    // Get browser and device info
    const browserInfo = typeof navigator !== 'undefined' 
      ? `${navigator.userAgent}`
      : undefined;
    
    const deviceInfo = typeof navigator !== 'undefined'
      ? `${navigator.platform} - ${navigator.hardwareConcurrency || 'unknown'} cores`
      : undefined;
    
    const baseMetadata: SimulationMetadata = {
      ...createDefaultMetadata(),
      performanceMetrics,
      complexityMetrics,
      browserInfo,
      deviceInfo,
    };
    
    return this.updateMetadata(baseMetadata, userEdits || {});
  }
  
  /**
   * Search simulations by metadata
   */
  static filterSimulationsByMetadata(
    simulations: Simulation[],
    filters: {
      tags?: string[];
      category?: string;
      rating?: number;
      favoritesOnly?: boolean;
      complexityRange?: { min: number; max: number };
    }
  ): Simulation[] {
    return simulations.filter(simulation => {
      const metadata = simulation.metadata;
      if (!metadata) return false;
      
      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some(tag => 
          metadata.tags.includes(tag)
        );
        if (!hasMatchingTag) return false;
      }
      
      // Filter by category
      if (filters.category && metadata.category !== filters.category) {
        return false;
      }
      
      // Filter by rating
      if (filters.rating && metadata.rating !== filters.rating) {
        return false;
      }
      
      // Filter by favorites
      if (filters.favoritesOnly && !metadata.favorite) {
        return false;
      }
      
      // Filter by complexity range
      if (filters.complexityRange) {
        const complexity = metadata.complexityMetrics.parameterComplexity;
        if (complexity < filters.complexityRange.min || complexity > filters.complexityRange.max) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Get metadata summary statistics
   */
  static getMetadataSummary(simulations: Simulation[]) {
    const simulationsWithMetadata = simulations.filter(s => s.metadata);
    
    // Collect all tags
    const allTags = new Set<string>();
    const categories = new Map<string, number>();
    const complexityDistribution = new Map<string, number>();
    
    let totalRated = 0;
    let ratingSum = 0;
    let favoritesCount = 0;
    
    simulationsWithMetadata.forEach(simulation => {
      const metadata = simulation.metadata!;
      
      // Tags
      metadata.tags.forEach(tag => allTags.add(tag));
      
      // Categories
      categories.set(metadata.category, (categories.get(metadata.category) || 0) + 1);
      
      // Complexity distribution
      const complexity = metadata.complexityMetrics.parameterComplexity;
      const complexityRange = `${Math.floor(complexity)}-${Math.floor(complexity) + 1}`;
      complexityDistribution.set(complexityRange, (complexityDistribution.get(complexityRange) || 0) + 1);
      
      // Ratings
      if (metadata.rating) {
        totalRated++;
        ratingSum += metadata.rating;
      }
      
      // Favorites
      if (metadata.favorite) {
        favoritesCount++;
      }
    });
    
    return {
      totalSimulations: simulations.length,
      simulationsWithMetadata: simulationsWithMetadata.length,
      tags: Array.from(allTags).sort(),
      categories: Object.fromEntries(categories),
      complexityDistribution: Object.fromEntries(complexityDistribution),
      averageRating: totalRated > 0 ? ratingSum / totalRated : null,
      favoritesCount,
    };
  }
} 
import { Bacterium } from "@/types/simulation";

/**
 * Performance optimization utilities for handling large bacterial populations
 */

/**
 * Sample array using reservoir sampling algorithm
 * Ensures fair random sampling from large arrays
 * @param array - Array to sample from
 * @param sampleSize - Number of items to sample
 * @returns Randomly sampled array
 */
export function sampleArray<T>(array: T[], sampleSize: number): T[] {
  if (array.length <= sampleSize) return array;
  
  const result = array.slice(0, sampleSize);
  
  for (let i = sampleSize; i < array.length; i++) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    if (randomIndex < sampleSize) {
      result[randomIndex] = array[i];
    }
  }
  
  return result;
}

/**
 * Cull nodes for display when population is too large
 * Maintains representative distribution of bacteria types while limiting render count
 * @param bacteria - Full bacteria population
 * @param maxNodes - Maximum nodes to display (default: 1000)
 * @returns Culled bacteria array for visualization
 */
export function cullNodesForDisplay(
  bacteria: Bacterium[], 
  maxNodes: number = 1000
): Bacterium[] {
  if (bacteria.length <= maxNodes) return bacteria;
  
  // Separate resistant and sensitive bacteria
  const resistantBacteria = bacteria.filter(b => b.isResistant);
  const sensitiveBacteria = bacteria.filter(b => !b.isResistant);
  
  // Calculate proportional distribution
  const resistantRatio = resistantBacteria.length / bacteria.length;
  const resistantToKeep = Math.min(
    resistantBacteria.length, 
    Math.floor(maxNodes * resistantRatio)
  );
  const sensitiveToKeep = maxNodes - resistantToKeep;
  
  // Sample from each group maintaining distribution
  const sampledResistant = sampleArray(resistantBacteria, resistantToKeep);
  const sampledSensitive = sampleArray(sensitiveBacteria, sensitiveToKeep);
  
  return [...sampledResistant, ...sampledSensitive];
}

/**
 * Enhanced culling with spatial distribution awareness
 * Ensures visual representation remains accurate across the petri dish
 * @param bacteria - Full bacteria population
 * @param maxNodes - Maximum nodes to display
 * @param spatialSampling - Enable spatial distribution preservation
 * @returns Spatially-aware culled bacteria array
 */
export function cullNodesWithSpatialDistribution(
  bacteria: Bacterium[],
  maxNodes: number = 1000,
  spatialSampling: boolean = true
): Bacterium[] {
  if (bacteria.length <= maxNodes) return bacteria;
  
  if (!spatialSampling) {
    return cullNodesForDisplay(bacteria, maxNodes);
  }
  
  // Create spatial grid for distribution
  const gridSize = 10; // 10x10 grid
  const spatialGrid: Bacterium[][] = Array(gridSize).fill(null).map(() => []);
  
  // Sort bacteria into spatial buckets
  bacteria.forEach(bacterium => {
    const gridX = Math.min(Math.floor((bacterium.x / 600) * gridSize), gridSize - 1);
    const gridY = Math.min(Math.floor((bacterium.y / 600) * gridSize), gridSize - 1);
    const gridIndex = gridY * gridSize + gridX;
    
    if (gridIndex >= 0 && gridIndex < spatialGrid.length) {
      spatialGrid[gridIndex].push(bacterium);
    }
  });
  
  // Calculate nodes per grid cell
  const nodesPerCell = Math.floor(maxNodes / (gridSize * gridSize));
  const result: Bacterium[] = [];
  
  // Sample from each non-empty grid cell
  spatialGrid.forEach(cellBacteria => {
    if (cellBacteria.length > 0) {
      const cellSample = cullNodesForDisplay(cellBacteria, nodesPerCell + 1);
      result.push(...cellSample);
    }
  });
  
  // If we have fewer nodes than maxNodes, fill with remaining bacteria
  if (result.length < maxNodes) {
    const remaining = bacteria.filter(b => !result.includes(b));
    const additionalNodes = sampleArray(remaining, maxNodes - result.length);
    result.push(...additionalNodes);
  }
  
  return result.slice(0, maxNodes);
}

/**
 * Cached culling to avoid recalculating when population hasn't changed significantly
 */
export class CachedNodeCuller {
  private cache: Map<string, Bacterium[]> = new Map();
  private lastPopulationSize = 0;
  private lastResistantRatio = 0;
  private readonly cacheThreshold = 0.05; // 5% change threshold
  
  /**
   * Get culled nodes with caching
   * @param bacteria - Current bacteria population
   * @param maxNodes - Maximum nodes to display
   * @param spatialSampling - Enable spatial distribution
   * @returns Cached or freshly culled bacteria array
   */
  getCulledNodes(
    bacteria: Bacterium[],
    maxNodes: number = 1000,
    spatialSampling: boolean = true
  ): Bacterium[] {
    const currentSize = bacteria.length;
    const resistantCount = bacteria.filter(b => b.isResistant).length;
    const currentResistantRatio = currentSize > 0 ? resistantCount / currentSize : 0;
    
    // Check if we need to recalculate
    const sizeChange = Math.abs(currentSize - this.lastPopulationSize) / Math.max(this.lastPopulationSize, 1);
    const ratioChange = Math.abs(currentResistantRatio - this.lastResistantRatio);
    
    const cacheKey = `${currentSize}_${resistantCount}_${maxNodes}_${spatialSampling}`;
    
    if (
      sizeChange > this.cacheThreshold ||
      ratioChange > this.cacheThreshold ||
      !this.cache.has(cacheKey)
    ) {
      // Recalculate and cache
      const culledNodes = spatialSampling
        ? cullNodesWithSpatialDistribution(bacteria, maxNodes, true)
        : cullNodesForDisplay(bacteria, maxNodes);
        
      this.cache.clear(); // Clear old cache entries
      this.cache.set(cacheKey, culledNodes);
      this.lastPopulationSize = currentSize;
      this.lastResistantRatio = currentResistantRatio;
      
      return culledNodes;
    }
    
    return this.cache.get(cacheKey) || bacteria;
  }
  
  /**
   * Clear the cache manually
   */
  clearCache(): void {
    this.cache.clear();
    this.lastPopulationSize = 0;
    this.lastResistantRatio = 0;
  }
}

/**
 * Density-based sampling for clustered populations
 * Prioritizes representative sampling in high-density areas
 * @param bacteria - Full bacteria population
 * @param maxNodes - Maximum nodes to display
 * @param densityRadius - Radius for density calculation (default: 30)
 * @returns Density-aware culled bacteria array
 */
export function cullNodesWithDensityAwareness(
  bacteria: Bacterium[],
  maxNodes: number = 1000,
  densityRadius: number = 30
): Bacterium[] {
  if (bacteria.length <= maxNodes) return bacteria;
  
  // Calculate density for each bacterium
  const bacteriaWithDensity = bacteria.map(bacterium => {
    const neighbors = bacteria.filter(other => {
      if (other.id === bacterium.id) return false;
      const dx = bacterium.x - other.x;
      const dy = bacterium.y - other.y;
      return Math.sqrt(dx * dx + dy * dy) <= densityRadius;
    });
    
    return {
      ...bacterium,
      density: neighbors.length
    };
  });
  
  // Sort by density (higher density first) and resistance status
  bacteriaWithDensity.sort((a, b) => {
    // Prioritize resistant bacteria
    if (a.isResistant !== b.isResistant) {
      return a.isResistant ? -1 : 1;
    }
    // Then by density
    return b.density - a.density;
  });
  
  // Use stratified sampling to maintain representation across density levels
  const highDensity = bacteriaWithDensity.filter(b => b.density > 5);
  const mediumDensity = bacteriaWithDensity.filter(b => b.density > 2 && b.density <= 5);
  const lowDensity = bacteriaWithDensity.filter(b => b.density <= 2);
  
  const highSample = Math.floor(maxNodes * 0.4); // 40% from high density
  const mediumSample = Math.floor(maxNodes * 0.35); // 35% from medium density
  const lowSample = maxNodes - highSample - mediumSample; // Remaining from low density
  
  const result = [
    ...sampleArray(highDensity, Math.min(highSample, highDensity.length)),
    ...sampleArray(mediumDensity, Math.min(mediumSample, mediumDensity.length)),
    ...sampleArray(lowDensity, Math.min(lowSample, lowDensity.length))
  ];
  
  // Remove density property and return original bacteria objects
  return result.map(({ density, ...bacterium }) => bacterium as Bacterium);
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  /**
   * Start timing an operation
   * @param operationName - Name of the operation to time
   * @returns Function to end timing
   */
  startTiming(operationName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(operationName)) {
        this.metrics.set(operationName, []);
      }
      
      this.metrics.get(operationName)!.push(duration);
    };
  }
  
  /**
   * Get performance statistics for an operation
   * @param operationName - Name of the operation
   * @returns Performance statistics or null if no data
   */
  getStats(operationName: string): {
    average: number;
    min: number;
    max: number;
    count: number;
  } | null {
    const times = this.metrics.get(operationName);
    if (!times || times.length === 0) return null;
    
    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return { average, min, max, count: times.length };
  }
  
  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }
} 
import { Bacterium } from "@/types/simulation";

/**
 * Testing utilities for performance optimization validation
 */

/**
 * Generate a large bacterial population for performance testing
 * @param count - Number of bacteria to generate
 * @param resistanceRatio - Ratio of resistant bacteria (0-1)
 * @param clustered - Whether to create clustered populations
 * @returns Array of test bacteria
 */
export function generateTestBacteria(
  count: number,
  resistanceRatio: number = 0.3,
  clustered: boolean = false
): Bacterium[] {
  const bacteria: Bacterium[] = [];
  const petriSize = 600;
  const center = { x: petriSize / 2, y: petriSize / 2 };
  const maxRadius = petriSize / 2 - 30;

  for (let i = 0; i < count; i++) {
    let x: number, y: number;

    if (clustered) {
      // Create 3-5 clusters
      const clusterCount = 3 + Math.floor(Math.random() * 3);
      const clusterIndex = Math.floor(Math.random() * clusterCount);

      // Cluster centers distributed around the petri dish
      const clusterAngle = (clusterIndex / clusterCount) * 2 * Math.PI;
      const clusterDistance = maxRadius * 0.5;
      const clusterCenterX =
        center.x + clusterDistance * Math.cos(clusterAngle);
      const clusterCenterY =
        center.y + clusterDistance * Math.sin(clusterAngle);

      // Add some randomness around cluster center
      const clusterRadius = 80;
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * clusterRadius;

      x = clusterCenterX + distance * Math.cos(angle);
      y = clusterCenterY + distance * Math.sin(angle);

      // Ensure within petri dish bounds
      const distFromCenter = Math.sqrt(
        (x - center.x) ** 2 + (y - center.y) ** 2
      );
      if (distFromCenter > maxRadius) {
        const normalizeAngle = Math.atan2(y - center.y, x - center.x);
        x = center.x + maxRadius * Math.cos(normalizeAngle);
        y = center.y + maxRadius * Math.sin(normalizeAngle);
      }
    } else {
      // Random distribution within petri dish
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.sqrt(Math.random()) * maxRadius;
      x = center.x + distance * Math.cos(angle);
      y = center.y + distance * Math.sin(angle);
    }

    const isResistant = Math.random() < resistanceRatio;

    const bacterium: Bacterium = {
      id: `test-bacteria-${i}`,
      x,
      y,
      isResistant,
      fitness: 0.3 + Math.random() * 0.7,
      age: Math.floor(Math.random() * 20),
      generation: Math.floor(Math.random() * 10),
      parentId:
        i > 100
          ? `test-bacteria-${Math.floor(Math.random() * 100)}`
          : undefined,
      color: isResistant ? "#ef4444" : "#22c55e",
      size: 2 + Math.random() * 4,
    };

    bacteria.push(bacterium);
  }

  return bacteria;
}

/**
 * Performance testing scenarios
 */
export const TEST_SCENARIOS = {
  small: { count: 100, name: "Small Population (100)" },
  medium: { count: 1000, name: "Medium Population (1,000)" },
  large: { count: 5000, name: "Large Population (5,000)" },
  veryLarge: { count: 10000, name: "Very Large Population (10,000)" },
  extreme: { count: 50000, name: "Extreme Population (50,000)" },
} as const;

/**
 * Performance test runner
 */
export class PerformanceTestRunner {
  private results: Map<string, any[]> = new Map();

  /**
   * Run a performance test
   * @param testName - Name of the test
   * @param testFunction - Function to test
   * @param iterations - Number of iterations to run
   * @returns Test results
   */
  async runTest<T>(
    testName: string,
    testFunction: () => T | Promise<T>,
    iterations: number = 5
  ): Promise<{
    average: number;
    min: number;
    max: number;
    results: number[];
    iterations: number;
  }> {
    const times: number[] = [];

    console.log(
      `🧪 Running performance test: ${testName} (${iterations} iterations)`
    );

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      times.push(duration);

      console.log(`  Iteration ${i + 1}: ${duration.toFixed(2)}ms`);
    }

    const average = times.reduce((sum, time) => sum + time, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);

    const result = { average, min, max, results: times, iterations };
    this.results.set(testName, times);

    console.log(`📊 ${testName} Results:`);
    console.log(`   Average: ${average.toFixed(2)}ms`);
    console.log(`   Min: ${min.toFixed(2)}ms`);
    console.log(`   Max: ${max.toFixed(2)}ms`);
    console.log("");

    return result;
  }

  /**
   * Get all test results
   */
  getAllResults(): Map<string, any[]> {
    return this.results;
  }

  /**
   * Clear test results
   */
  clearResults(): void {
    this.results.clear();
  }
}

/**
 * Validate that culling maintains representative distribution
 */
export function validateCullingAccuracy(
  original: Bacterium[],
  culled: Bacterium[],
  tolerance: number = 0.05 // 5% tolerance
): {
  isValid: boolean;
  originalRatio: number;
  culledRatio: number;
  difference: number;
  withinTolerance: boolean;
} {
  const originalResistant = original.filter((b) => b.isResistant).length;
  const originalRatio =
    original.length > 0 ? originalResistant / original.length : 0;

  const culledResistant = culled.filter((b) => b.isResistant).length;
  const culledRatio = culled.length > 0 ? culledResistant / culled.length : 0;

  const difference = Math.abs(originalRatio - culledRatio);
  const withinTolerance = difference <= tolerance;

  return {
    isValid: withinTolerance,
    originalRatio,
    culledRatio,
    difference,
    withinTolerance,
  };
}

/**
 * Validate spatial distribution after culling
 */
export function validateSpatialDistribution(
  original: Bacterium[],
  culled: Bacterium[],
  gridSize: number = 10
): {
  isValid: boolean;
  originalDistribution: number[];
  culledDistribution: number[];
  coverage: number; // Percentage of grid cells covered
} {
  const petriSize = 600;

  const getGridDistribution = (bacteria: Bacterium[]) => {
    const grid = new Array(gridSize * gridSize).fill(0);

    bacteria.forEach((bacterium) => {
      const gridX = Math.min(
        Math.floor((bacterium.x / petriSize) * gridSize),
        gridSize - 1
      );
      const gridY = Math.min(
        Math.floor((bacterium.y / petriSize) * gridSize),
        gridSize - 1
      );
      const gridIndex = gridY * gridSize + gridX;

      if (gridIndex >= 0 && gridIndex < grid.length) {
        grid[gridIndex]++;
      }
    });

    return grid;
  };

  const originalDistribution = getGridDistribution(original);
  const culledDistribution = getGridDistribution(culled);

  // Calculate coverage (how many grid cells have bacteria)
  const coveredCells = culledDistribution.filter((count) => count > 0).length;
  const coverage = (coveredCells / (gridSize * gridSize)) * 100;

  // Simple validation: culled should maintain some presence in most populated areas
  const isValid = coverage > 50; // At least 50% of the grid should have some representation

  return {
    isValid,
    originalDistribution,
    culledDistribution,
    coverage,
  };
}

/**
 * Memory usage estimation
 */
export function estimateMemoryUsage(bacteriaCount: number): {
  estimatedMB: number;
  breakdown: {
    bacteriaObjects: number;
    graphNodes: number;
    reactDom: number;
    total: number;
  };
} {
  // Rough estimates based on object sizes
  const bacteriumSize = 200; // bytes per bacterium object
  const graphNodeSize = 150; // bytes per graph node
  const domNodeSize = 500; // bytes per DOM element (when virtualized)

  const bacteriaObjects = (bacteriaCount * bacteriumSize) / (1024 * 1024);
  const graphNodes = (bacteriaCount * graphNodeSize) / (1024 * 1024);
  const reactDom =
    (Math.min(bacteriaCount, 1000) * domNodeSize) / (1024 * 1024); // Culled to max 1000

  const total = bacteriaObjects + graphNodes + reactDom;

  return {
    estimatedMB: total,
    breakdown: {
      bacteriaObjects,
      graphNodes,
      reactDom,
      total,
    },
  };
}

// Simulation Engine for WebWorker
class SimulationEngine {
  static DEFAULT_COLORS = [
    "#22c55e", // Green for sensitive
    "#ef4444", // Red for resistant
    "#3b82f6", // Blue variant
    "#eab308", // Yellow variant
    "#a855f7", // Purple variant
    "#06b6d4", // Cyan variant
  ];

  static initializeBacteria(params) {
    const bacteria = [];
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

  static calculateNextGeneration(bacteria, params) {
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
    const offspring = [];
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

  static applyAntibioticEffect(bacterium, concentration) {
    if (concentration === 0) return true;

    const resistanceFactor = bacterium.isResistant ? 0.9 : 0.1;
    const killConstant = 1.5; // Reduced to be less lethal
    const effectiveConcentration = concentration * (1 - resistanceFactor);
    const survivalProbability = Math.exp(-killConstant * effectiveConcentration);

    return Math.random() < survivalProbability;
  }

  static applyNaturalDeath(bacterium) {
    const baseSurvivalRate = 0.98;
    const ageFactor = Math.pow(0.99, bacterium.age || 0);
    const fitnessFactor = bacterium.fitness || 1.0;
    const survivalProbability = baseSurvivalRate * ageFactor * fitnessFactor;

    return Math.random() < survivalProbability;
  }

  static shouldReproduce(bacterium, params, currentPopulation, carryingCapacity) {
    const age = bacterium.age || 0;
    if (age < 1 || age > 10) return false;

    const fitness = bacterium.fitness || 1.0;
    const baseReproductionRate = params.growthRate * fitness;
    const populationPressure = 1 - currentPopulation / carryingCapacity;
    const reproductionRate = baseReproductionRate * populationPressure;

    return Math.random() < reproductionRate;
  }

  static reproduceBacterium(parent, params) {
    const position = this.findOffspringPosition(parent, params);
    if (!position) return null;

    const child = {
      id: `bacteria_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: position.x,
      y: position.y,
      isResistant: parent.isResistant,
      fitness: this.inheritFitness(parent.fitness || 1.0),
      age: 0,
      generation: (parent.generation || 0) + 1,
      parentId: parent.id,
      color: parent.color,
      size: Math.max(2, Math.min(8, parent.size + (Math.random() - 0.5) * 0.5)),
    };

    return child;
  }

  static processMutations(bacterium, mutationRate) {
    let hasMutated = false;
    const mutatedBacterium = { ...bacterium };

    // Resistance mutation
    if (!bacterium.isResistant && Math.random() < mutationRate * 0.1) {
      mutatedBacterium.isResistant = true;
      mutatedBacterium.color = this.DEFAULT_COLORS[1];
      mutatedBacterium.fitness *= 0.8;
      hasMutated = true;
    }

    // Fitness mutations
    if (Math.random() < mutationRate) {
      const fitnessChange = (Math.random() - 0.5) * 0.1;
      mutatedBacterium.fitness = Math.max(
        0.1,
        Math.min(2.0, (bacterium.fitness || 1.0) + fitnessChange)
      );
      hasMutated = true;
    }

    // Size mutations
    if (Math.random() < mutationRate * 0.5) {
      const sizeChange = (Math.random() - 0.5) * 0.3;
      mutatedBacterium.size = Math.max(2, Math.min(8, bacterium.size + sizeChange));
      hasMutated = true;
    }

    return { bacterium: mutatedBacterium, hasMutated };
  }

  static calculateStatistics(bacteria) {
    const totalPopulation = bacteria.length;
    const resistantCount = bacteria.filter((b) => b.isResistant).length;
    const sensitiveCount = totalPopulation - resistantCount;

    const averageFitness =
      totalPopulation > 0
        ? bacteria.reduce((sum, b) => sum + (b.fitness || 1.0), 0) / totalPopulation
        : 0;

    return {
      totalPopulation,
      resistantCount,
      sensitiveCount,
      averageFitness,
      mutationEvents: 0,
      antibioticDeaths: 0,
      naturalDeaths: 0,
      reproductions: 0,
    };
  }

  // Helper methods
  static generateRandomPositionInCircle(center, radius) {
    let x, y;
    do {
      x = center.x + (Math.random() - 0.5) * 2 * radius;
      y = center.y + (Math.random() - 0.5) * 2 * radius;
    } while ((x - center.x) ** 2 + (y - center.y) ** 2 > radius ** 2);

    return { x, y };
  }

  static generateInitialFitness(isResistant) {
    const baseFitness = isResistant ? 0.8 : 1.0;
    const variation = (Math.random() - 0.5) * 0.2;
    return Math.max(0.1, Math.min(2.0, baseFitness + variation));
  }

  static calculateCarryingCapacity(params) {
    const area = Math.PI * (params.petriDishSize / 2) ** 2;
    const bacteriaPerUnit = 0.003; // Increased density factor for more bacteria growth
    return Math.floor(area * bacteriaPerUnit);
  }

  static findOffspringPosition(parent, params) {
    const maxAttempts = 10;
    const radius = params.petriDishSize / 2;
    const center = { x: radius, y: radius };
    const maxDistance = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = Math.random() * maxDistance;
      
      const x = parent.x + Math.cos(angle) * distance;
      const y = parent.y + Math.sin(angle) * distance;

      if ((x - center.x) ** 2 + (y - center.y) ** 2 <= radius ** 2) {
        return { x, y };
      }
    }

    return null;
  }

  static inheritFitness(parentFitness) {
    const variation = (Math.random() - 0.5) * 0.1;
    return Math.max(0.1, Math.min(2.0, parentFitness + variation));
  }
}

// Worker implementation
class SimulationWorker {
  constructor() {
    this.isRunning = false;
    this.performanceHistory = [];
    
    self.addEventListener('message', this.handleMessage.bind(this));
    
    // Send ready signal
    this.postMessage({
      id: 'init',
      type: 'WORKER_READY',
      payload: { timestamp: Date.now() },
    });
  }

  handleMessage(event) {
    const { id, type, payload } = event.data;

    try {
      switch (type) {
        case 'INITIALIZE':
          this.handleInitialize(id, payload);
          break;
        case 'STEP':
          this.handleStep(id, payload);
          break;
        case 'BATCH_STEP':
          this.handleBatchStep(id, payload);
          break;
        case 'TERMINATE':
          this.handleTerminate(id);
          break;
        default:
          this.postError(id, `Unknown message type: ${type}`);
      }
    } catch (error) {
      this.postError(id, `Error handling ${type}: ${error.message}`);
    }
  }

  handleInitialize(id, payload) {
    const startTime = performance.now();
    
    const bacteria = SimulationEngine.initializeBacteria(payload.parameters);
    const statistics = SimulationEngine.calculateStatistics(bacteria);

    const endTime = performance.now();
    this.recordPerformance(endTime - startTime, bacteria.length);

    this.postMessage({
      id,
      type: 'INITIALIZE_COMPLETE',
      payload: { bacteria, statistics },
    });
  }

  handleStep(id, payload) {
    const startTime = performance.now();
    
    const result = SimulationEngine.calculateNextGeneration(
      payload.bacteria,
      payload.parameters
    );

    const endTime = performance.now();
    this.recordPerformance(endTime - startTime, result.bacteria.length);

    this.postMessage({
      id,
      type: 'STEP_COMPLETE',
      payload: result,
    });
  }

  async handleBatchStep(id, payload) {
    this.isRunning = true;
    
    let currentBacteria = payload.bacteria;
    let currentStep = 0;
    const totalSteps = payload.steps;
    const reportProgress = payload.reportProgress ?? true;

    try {
      for (let step = 0; step < totalSteps && this.isRunning; step++) {
        const startTime = performance.now();
        
        const result = SimulationEngine.calculateNextGeneration(
          currentBacteria,
          payload.parameters
        );

        currentBacteria = result.bacteria;
        currentStep = step + 1;

        const endTime = performance.now();
        this.recordPerformance(endTime - startTime, result.bacteria.length);

        // Report progress periodically
        if (reportProgress && (currentStep % 5 === 0 || currentStep === totalSteps)) {
          this.postMessage({
            id,
            type: 'BATCH_STEP_PROGRESS',
            payload: {
              currentStep,
              totalSteps,
              progress: currentStep / totalSteps,
              bacteria: currentBacteria,
              statistics: result.statistics,
            },
          });
        }

        // Yield control to prevent blocking
        if (step % 10 === 0) {
          await this.yield();
        }
      }

      // Send final result
      const finalResult = {
        bacteria: currentBacteria,
        statistics: SimulationEngine.calculateStatistics(currentBacteria),
      };

      this.postMessage({
        id,
        type: 'BATCH_STEP_COMPLETE',
        payload: finalResult,
      });

    } catch (error) {
      this.postError(id, `Batch step error: ${error.message}`);
    } finally {
      this.isRunning = false;
    }
  }

  handleTerminate(id) {
    this.isRunning = false;
    
    this.postMessage({
      id,
      type: 'TERMINATE_COMPLETE',
      payload: { performanceHistory: this.performanceHistory },
    });

    self.close();
  }

  postMessage(message) {
    self.postMessage(message);
  }

  postError(id, error) {
    this.postMessage({
      id,
      type: 'ERROR',
      payload: { error },
    });
  }

  recordPerformance(stepTime, bacteriaCount) {
    this.performanceHistory.push({
      stepTime,
      bacteriaCount,
      timestamp: Date.now(),
    });

    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  yield() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}

// Initialize the worker
new SimulationWorker(); 
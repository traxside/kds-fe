import { SimulationEngine, SimulationStepResult } from "@/lib/simulation-engine";
import { Bacterium, SimulationParametersInput } from "@/types/simulation";

// Message types for worker communication
export interface WorkerMessage {
  id: string;
  type: string;
  payload: any;
}

export interface InitializeMessage extends WorkerMessage {
  type: 'INITIALIZE';
  payload: {
    parameters: SimulationParametersInput;
  };
}

export interface StepMessage extends WorkerMessage {
  type: 'STEP';
  payload: {
    bacteria: Bacterium[];
    parameters: SimulationParametersInput;
  };
}

export interface BatchStepMessage extends WorkerMessage {
  type: 'BATCH_STEP';
  payload: {
    bacteria: Bacterium[];
    parameters: SimulationParametersInput;
    steps: number;
    reportProgress?: boolean;
  };
}

export interface TerminateMessage extends WorkerMessage {
  type: 'TERMINATE';
  payload: {};
}

// Response message types
export interface InitializeResponse extends WorkerMessage {
  type: 'INITIALIZE_COMPLETE';
  payload: {
    bacteria: Bacterium[];
    statistics: SimulationStepResult['statistics'];
  };
}

export interface StepResponse extends WorkerMessage {
  type: 'STEP_COMPLETE';
  payload: SimulationStepResult;
}

export interface BatchStepProgress extends WorkerMessage {
  type: 'BATCH_STEP_PROGRESS';
  payload: {
    currentStep: number;
    totalSteps: number;
    progress: number; // 0-1
    bacteria: Bacterium[];
    statistics: SimulationStepResult['statistics'];
  };
}

export interface BatchStepComplete extends WorkerMessage {
  type: 'BATCH_STEP_COMPLETE';
  payload: SimulationStepResult;
}

export interface ErrorResponse extends WorkerMessage {
  type: 'ERROR';
  payload: {
    error: string;
    stack?: string;
  };
}

// Performance monitoring
interface PerformanceMetrics {
  stepTime: number;
  bacteriaCount: number;
  timestamp: number;
}

class SimulationWorker {
  private isRunning = false;
  private performanceHistory: PerformanceMetrics[] = [];

  constructor() {
    // Listen for messages from the main thread
    self.addEventListener('message', this.handleMessage.bind(this));
    
    // Send ready signal
    this.postMessage({
      id: 'init',
      type: 'WORKER_READY',
      payload: {
        timestamp: Date.now(),
      },
    });
  }

  private handleMessage(event: MessageEvent<WorkerMessage>) {
    const { id, type, payload } = event.data;

    try {
      switch (type) {
        case 'INITIALIZE':
          this.handleInitialize(id, payload as InitializeMessage['payload']);
          break;
        
        case 'STEP':
          this.handleStep(id, payload as StepMessage['payload']);
          break;
        
        case 'BATCH_STEP':
          this.handleBatchStep(id, payload as BatchStepMessage['payload']);
          break;
        
        case 'TERMINATE':
          this.handleTerminate(id);
          break;
        
        default:
          this.postError(id, `Unknown message type: ${type}`);
      }
    } catch (error) {
      this.postError(id, `Error handling ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
    }
  }

  private handleInitialize(id: string, payload: InitializeMessage['payload']) {
    const startTime = performance.now();
    
    const bacteria = SimulationEngine.initializeBacteria(payload.parameters);
    const statistics = SimulationEngine.calculateStatistics(bacteria);

    const endTime = performance.now();
    this.recordPerformance(endTime - startTime, bacteria.length);

    this.postMessage({
      id,
      type: 'INITIALIZE_COMPLETE',
      payload: {
        bacteria,
        statistics,
      },
    } as InitializeResponse);
  }

  private handleStep(id: string, payload: StepMessage['payload']) {
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
    } as StepResponse);
  }

  private async handleBatchStep(id: string, payload: BatchStepMessage['payload']) {
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
          } as BatchStepProgress);
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
      } as BatchStepComplete);

    } catch (error) {
      this.postError(id, `Batch step error: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
    } finally {
      this.isRunning = false;
    }
  }

  private handleTerminate(id: string) {
    this.isRunning = false;
    
    this.postMessage({
      id,
      type: 'TERMINATE_COMPLETE',
      payload: {
        performanceHistory: this.performanceHistory,
      },
    });

    // Terminate the worker
    self.close();
  }

  private postMessage(message: WorkerMessage) {
    self.postMessage(message);
  }

  private postError(id: string, error: string, stack?: string) {
    this.postMessage({
      id,
      type: 'ERROR',
      payload: {
        error,
        stack,
      },
    } as ErrorResponse);
  }

  private recordPerformance(stepTime: number, bacteriaCount: number) {
    this.performanceHistory.push({
      stepTime,
      bacteriaCount,
      timestamp: Date.now(),
    });

    // Keep only the last 100 entries to prevent memory issues
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  private yield(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
}

// Initialize the worker
new SimulationWorker(); 
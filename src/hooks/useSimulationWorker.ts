import { useCallback, useEffect, useRef, useState } from "react";
import { Bacterium, SimulationParametersInput } from "@/types/simulation";
import { SimulationStepResult } from "@/lib/simulation-engine";

// Worker message types
interface WorkerMessage {
  id: string;
  type: string;
  payload: unknown;
}

interface InitializeMessage extends WorkerMessage {
  type: 'INITIALIZE';
  payload: {
    parameters: SimulationParametersInput;
  };
}

interface StepMessage extends WorkerMessage {
  type: 'STEP';
  payload: {
    bacteria: Bacterium[];
    parameters: SimulationParametersInput;
  };
}

interface BatchStepMessage extends WorkerMessage {
  type: 'BATCH_STEP';
  payload: {
    bacteria: Bacterium[];
    parameters: SimulationParametersInput;
    steps: number;
    reportProgress?: boolean;
  };
}

interface UseSimulationWorkerOptions {
  enableWorker?: boolean;
  fallbackToMainThread?: boolean;
  batchSize?: number;
}

interface WorkerState {
  isReady: boolean;
  isWorking: boolean;
  error: string | null;
  progress: {
    current: number;
    total: number;
    percentage: number;
  } | null;
}

interface UseSimulationWorkerReturn {
  // State
  workerState: WorkerState;
  isWorkerSupported: boolean;
  
  // Actions
  initializeBacteria: (parameters: SimulationParametersInput) => Promise<{
    bacteria: Bacterium[];
    statistics: SimulationStepResult['statistics'];
  }>;
  
  calculateStep: (bacteria: Bacterium[], parameters: SimulationParametersInput) => Promise<SimulationStepResult>;
  
  calculateBatchSteps: (
    bacteria: Bacterium[], 
    parameters: SimulationParametersInput, 
    steps: number,
    onProgress?: (progress: { current: number; total: number; bacteria: Bacterium[]; statistics: SimulationStepResult['statistics'] }) => void
  ) => Promise<SimulationStepResult>;
  
  terminateWorker: () => Promise<void>;
  
  // Performance metrics
  getPerformanceMetrics: () => Promise<unknown>;
}

export function useSimulationWorker(
  options: UseSimulationWorkerOptions = {}
): UseSimulationWorkerReturn {
  const {
    enableWorker = true,
    fallbackToMainThread = true,
  } = options;

  // State
  const [workerState, setWorkerState] = useState<WorkerState>({
    isReady: false,
    isWorking: false,
    error: null,
    progress: null,
  });

  // Refs
  const workerRef = useRef<Worker | null>(null);
  const messageIdRef = useRef(0);
  const pendingPromisesRef = useRef<Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    onProgress?: (progress: unknown) => void;
  }>>(new Map());

  // Check if workers are supported
  const isWorkerSupported = typeof Worker !== "undefined";

  // Generate unique message ID
  const generateMessageId = useCallback(() => {
    return `msg_${++messageIdRef.current}_${Date.now()}`;
  }, []);

  // Send message to worker
  const sendMessage = useCallback((message: WorkerMessage): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !workerState.isReady) {
        reject(new Error("Worker not ready"));
        return;
      }

      const messageId = message.id;
      pendingPromisesRef.current.set(messageId, { resolve, reject });

      workerRef.current.postMessage(message);

      // Timeout after 30 seconds
      setTimeout(() => {
        const pending = pendingPromisesRef.current.get(messageId);
        if (pending) {
          pendingPromisesRef.current.delete(messageId);
          pending.reject(new Error("Worker operation timeout"));
        }
      }, 30000);
    });
  }, [workerState.isReady]);

  // Send message with progress callback
  const sendMessageWithProgress = useCallback((
    message: WorkerMessage,
    onProgress?: (progress: unknown) => void
  ): Promise<unknown> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !workerState.isReady) {
        reject(new Error("Worker not ready"));
        return;
      }

      const messageId = message.id;
      pendingPromisesRef.current.set(messageId, { resolve, reject, onProgress });

      workerRef.current.postMessage(message);

      // Timeout after 2 minutes for batch operations
      setTimeout(() => {
        const pending = pendingPromisesRef.current.get(messageId);
        if (pending) {
          pendingPromisesRef.current.delete(messageId);
          pending.reject(new Error("Worker operation timeout"));
        }
      }, 120000);
    });
  }, [workerState.isReady]);

  // Handle worker messages
  const handleWorkerMessage = useCallback((event: MessageEvent<WorkerMessage>) => {
    const { id, type, payload } = event.data;

    switch (type) {
      case 'WORKER_READY':
        setWorkerState(prev => ({ ...prev, isReady: true, error: null }));
        break;

      case 'INITIALIZE_COMPLETE':
      case 'STEP_COMPLETE':
      case 'BATCH_STEP_COMPLETE':
      case 'TERMINATE_COMPLETE': {
        const pending = pendingPromisesRef.current.get(id);
        if (pending) {
          pendingPromisesRef.current.delete(id);
          pending.resolve(payload);
          setWorkerState(prev => ({ 
            ...prev, 
            isWorking: false, 
            progress: null 
          }));
        }
        break;
      }

      case 'BATCH_STEP_PROGRESS': {
        const pending = pendingPromisesRef.current.get(id);
        if (pending?.onProgress) {
          pending.onProgress(payload);
        }
        setWorkerState(prev => ({
          ...prev,
          progress: {
            current: (payload as { currentStep: number }).currentStep,
            total: (payload as { totalSteps: number }).totalSteps,
            percentage: (payload as { progress: number }).progress * 100,
          },
        }));
        break;
      }

      case 'ERROR': {
        const pending = pendingPromisesRef.current.get(id);
        if (pending) {
          pendingPromisesRef.current.delete(id);
          pending.reject(new Error((payload as { error: string }).error));
        }
        setWorkerState(prev => ({ 
          ...prev, 
          error: (payload as { error: string }).error, 
          isWorking: false,
          progress: null,
        }));
        break;
      }
    }
  }, []);

  // Handle worker errors
  const handleWorkerError = useCallback((event: ErrorEvent) => {
    console.error("Worker error:", event);
    setWorkerState(prev => ({ 
      ...prev, 
      error: event.message, 
      isWorking: false,
      progress: null,
    }));
    
    // Reject all pending promises
    pendingPromisesRef.current.forEach(({ reject }) => {
      reject(new Error("Worker error: " + event.message));
    });
    pendingPromisesRef.current.clear();
  }, []);

  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (!isWorkerSupported || !enableWorker) return;

    try {
      // Create worker from public directory
      workerRef.current = new Worker('/simulation.worker.js');
      
      workerRef.current.addEventListener('message', handleWorkerMessage);
      workerRef.current.addEventListener('error', handleWorkerError);
      
      setWorkerState(prev => ({ ...prev, error: null }));
    } catch (err) {
      console.error("Failed to create worker:", err);
      setWorkerState(prev => ({ 
        ...prev, 
        error: err instanceof Error ? err.message : "Failed to create worker" 
      }));
    }
  }, [isWorkerSupported, enableWorker, handleWorkerMessage, handleWorkerError]);

  // Initialize bacteria
  const initializeBacteria = useCallback(async (parameters: SimulationParametersInput) => {
    if (!enableWorker || !workerState.isReady) {
      // Fallback to main thread
      if (fallbackToMainThread) {
        const { SimulationEngine } = await import("@/lib/simulation-engine");
        const bacteria = SimulationEngine.initializeBacteria(parameters);
        const statistics = SimulationEngine.calculateStatistics(bacteria);
        return { bacteria, statistics };
      }
      throw new Error("Worker not available and main thread fallback disabled");
    }

    setWorkerState(prev => ({ ...prev, isWorking: true, error: null }));

    const message: InitializeMessage = {
      id: generateMessageId(),
      type: 'INITIALIZE',
      payload: { parameters },
    };

    return sendMessage(message) as Promise<{
      bacteria: Bacterium[];
      statistics: SimulationStepResult['statistics'];
    }>;
  }, [enableWorker, workerState.isReady, fallbackToMainThread, generateMessageId, sendMessage]);

  // Calculate single step
  const calculateStep = useCallback(async (
    bacteria: Bacterium[], 
    parameters: SimulationParametersInput
  ): Promise<SimulationStepResult> => {
    if (!enableWorker || !workerState.isReady) {
      // Fallback to main thread
      if (fallbackToMainThread) {
        const { SimulationEngine } = await import("@/lib/simulation-engine");
        return SimulationEngine.calculateNextGeneration(bacteria, parameters);
      }
      throw new Error("Worker not available and main thread fallback disabled");
    }

    setWorkerState(prev => ({ ...prev, isWorking: true, error: null }));

    const message: StepMessage = {
      id: generateMessageId(),
      type: 'STEP',
      payload: { bacteria, parameters },
    };

    return sendMessage(message) as Promise<SimulationStepResult>;
  }, [enableWorker, workerState.isReady, fallbackToMainThread, generateMessageId, sendMessage]);

  // Calculate batch steps
  const calculateBatchSteps = useCallback(async (
    bacteria: Bacterium[], 
    parameters: SimulationParametersInput, 
    steps: number,
    onProgress?: (progress: { current: number; total: number; bacteria: Bacterium[]; statistics: SimulationStepResult['statistics'] }) => void
  ): Promise<SimulationStepResult> => {
    if (!enableWorker || !workerState.isReady) {
      // Fallback to main thread
      if (fallbackToMainThread) {
        const { SimulationEngine } = await import("@/lib/simulation-engine");
        let currentBacteria = bacteria;
        
        for (let i = 0; i < steps; i++) {
          const result = SimulationEngine.calculateNextGeneration(currentBacteria, parameters);
          currentBacteria = result.bacteria;
          
          if (onProgress && (i % 5 === 0 || i === steps - 1)) {
            onProgress({
              current: i + 1,
              total: steps,
              bacteria: currentBacteria,
              statistics: result.statistics,
            });
          }
        }
        
        return {
          bacteria: currentBacteria,
          statistics: SimulationEngine.calculateStatistics(currentBacteria),
        };
      }
      throw new Error("Worker not available and main thread fallback disabled");
    }

    setWorkerState(prev => ({ ...prev, isWorking: true, error: null }));

    const message: BatchStepMessage = {
      id: generateMessageId(),
      type: 'BATCH_STEP',
      payload: { 
        bacteria, 
        parameters, 
        steps,
        reportProgress: !!onProgress,
      },
    };

    // Create a type-safe wrapper for the progress callback
    const progressWrapper = onProgress ? (progress: unknown) => {
      // Type-safe casting based on expected worker progress payload structure
      if (progress && typeof progress === 'object' && 
          'currentStep' in progress && 'totalSteps' in progress &&
          'bacteria' in progress && 'statistics' in progress) {
        const typedProgress = progress as { 
          currentStep: number; 
          totalSteps: number; 
          bacteria: Bacterium[]; 
          statistics: SimulationStepResult['statistics'] 
        };
        onProgress({
          current: typedProgress.currentStep,
          total: typedProgress.totalSteps,
          bacteria: typedProgress.bacteria,
          statistics: typedProgress.statistics,
        });
      }
    } : undefined;

    return sendMessageWithProgress(message, progressWrapper) as Promise<SimulationStepResult>;
  }, [enableWorker, workerState.isReady, fallbackToMainThread, generateMessageId, sendMessageWithProgress]);

  // Terminate worker
  const terminateWorker = useCallback(async (): Promise<void> => {
    if (!workerRef.current) return;

    const message: WorkerMessage = {
      id: generateMessageId(),
      type: 'TERMINATE',
      payload: {},
    };

    try {
      await sendMessage(message);
    } catch {
      // Ignore termination errors
    }

    workerRef.current.terminate();
    workerRef.current = null;
    setWorkerState({
      isReady: false,
      isWorking: false,
      error: null,
      progress: null,
    });
  }, [generateMessageId, sendMessage]);

  // Get performance metrics
  const getPerformanceMetrics = useCallback(async () => {
    // This would be implemented as needed
    return null;
  }, []);

  // Initialize worker on mount
  useEffect(() => {
    initializeWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [initializeWorker]);

  return {
    workerState,
    isWorkerSupported,
    initializeBacteria,
    calculateStep,
    calculateBatchSteps,
    terminateWorker,
    getPerformanceMetrics,
  };
} 
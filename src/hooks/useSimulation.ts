import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Simulation,
  SimulationParametersInput,
  SimulationState,
  Bacterium,
} from "@/types/simulation";
import simulationApiSimple, {
  getErrorMessage,
  isNetworkError,
} from "@/lib/api";
import { 
  debounce, 
  throttle, 
  adaptiveDebounce,
  globalUpdateScheduler,
  UpdatePriority 
} from "@/lib/debounce";
import { 
  useSmartRefresh, 
  useDebouncedParameters,
  type DebouncedSimulationOptions 
} from "@/hooks/useDebouncedSimulation";

interface UseSimulationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  enableDebouncing?: boolean;
  enableAdaptiveRefresh?: boolean;
  enableBatching?: boolean;
  prioritizeCriticalUpdates?: boolean;
}

interface UseSimulationReturn {
  // State
  simulation: Simulation | null;
  bacteria: Bacterium[];
  isLoading: boolean;
  isSimulationRunning: boolean;
  error: string | null;
  isConnected: boolean;

  // Actions
  createSimulation: (
    name: string,
    parameters: SimulationParametersInput
  ) => Promise<void>;
  startSimulation: () => Promise<void>;
  stopSimulation: () => Promise<void>;
  resetSimulation: () => Promise<void>;
  stepSimulation: () => Promise<void>;
  updateParameters: (
    parameters: Partial<SimulationParametersInput>
  ) => void;
  loadSimulation: (id: string) => Promise<void>;
  clearError: () => void;
  checkConnection: () => Promise<void>;

  // Performance metrics (when debouncing is enabled)
  refreshCount?: number;
  currentRefreshInterval?: number;
  averageRefreshTime?: number;
  lastFetchTime?: number;
  totalFetches?: number;
}

export function useSimulation(
  options: UseSimulationOptions = {}
): UseSimulationReturn {
  const { 
    autoRefresh = false, 
    refreshInterval = 1000,
    enableDebouncing = true,
    enableAdaptiveRefresh = true,
    enableBatching = true,
    prioritizeCriticalUpdates = true,
  } = options;

  // State
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [bacteria, setBacteria] = useState<Bacterium[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Refs for cleanup and performance tracking
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchCountRef = useRef<number>(0);

  // Derived state
  const isSimulationRunning = simulation?.currentState?.isRunning ?? false;

  // Error handling helper
  const handleError = useCallback((err: unknown) => {
    const message = getErrorMessage(err);
    
    if (enableBatching) {
      globalUpdateScheduler.schedule({
        id: 'simulation-error',
        priority: UpdatePriority.HIGH,
        callback: () => {
          setError(message);
          if (isNetworkError(err)) {
            setIsConnected(false);
          }
        },
        timestamp: Date.now(),
      });
    } else {
      setError(message);
      if (isNetworkError(err)) {
        setIsConnected(false);
      }
    }

    console.error("Simulation error:", err);
  }, [enableBatching]);

  // Clear error
  const clearError = useCallback(() => {
    if (enableBatching) {
      globalUpdateScheduler.schedule({
        id: 'clear-error',
        priority: UpdatePriority.NORMAL,
        callback: () => setError(null),
        timestamp: Date.now(),
      });
    } else {
      setError(null);
    }
  }, [enableBatching]);

  // Optimized API fetch with performance tracking
  const fetchSimulationData = useCallback(async (id: string): Promise<void> => {
    const startTime = performance.now();
    fetchCountRef.current++;
    
    try {
      const updatedSimulation = await simulationApiSimple.getSimulation(id);
      const fetchTime = performance.now() - startTime;
      lastFetchTimeRef.current = fetchTime;
      
      if (enableBatching) {
        // Check for critical updates (resistance emergence, errors)
        // Use a callback to get current bacteria state to avoid circular dependency
        globalUpdateScheduler.schedule({
          id: `simulation-update-${id}`,
          priority: UpdatePriority.NORMAL,
          callback: () => {
            // Check for resistance emergence at the time of update
            const currentBacteria = bacteria; // This will be captured from closure
            const hasNewResistance = prioritizeCriticalUpdates && 
              updatedSimulation.currentState?.bacteria?.some(b => b.isResistant) &&
              !currentBacteria.some(b => b.isResistant);
            
            setSimulation(updatedSimulation);
            setBacteria(updatedSimulation.currentState?.bacteria || []);
            setIsConnected(true);
            
            if (hasNewResistance) {
              console.log('Resistance emergence detected during fetch');
            }
          },
          timestamp: Date.now(),
        });
      } else {
        setSimulation(updatedSimulation);
        setBacteria(updatedSimulation.currentState?.bacteria || []);
        setIsConnected(true);
      }
      
      // Log performance warnings
      if (fetchTime > 500) {
        console.warn(`Slow API fetch: ${fetchTime.toFixed(2)}ms for simulation ${id}`);
      }
    } catch (err) {
      console.warn("Auto-refresh failed:", err);
      if (isNetworkError(err)) {
        if (enableBatching) {
          globalUpdateScheduler.schedule({
            id: 'connection-lost',
            priority: UpdatePriority.HIGH,
            callback: () => setIsConnected(false),
            timestamp: Date.now(),
          });
        } else {
          setIsConnected(false);
        }
      }
      throw err; // Re-throw for smart refresh error handling
    }
  }, [enableBatching, prioritizeCriticalUpdates]); // Removed bacteria dependency

  // Create debounced/adaptive fetch function
  const optimizedFetch = useMemo(() => {
    if (!enableDebouncing) {
      return fetchSimulationData;
    }
    
    return enableAdaptiveRefresh
      ? adaptiveDebounce(fetchSimulationData, refreshInterval, {
          minWait: refreshInterval / 2,
          maxWait: refreshInterval * 2,
          performanceThreshold: 200, // 200ms threshold for API calls
        })
      : debounce(fetchSimulationData, Math.min(refreshInterval / 2, 250), {
          leading: false,
          trailing: true,
          maxWait: refreshInterval,
        });
  }, [fetchSimulationData, enableDebouncing, enableAdaptiveRefresh, refreshInterval]);

  // Check API connection
  const checkConnection = useCallback(async () => {
    try {
      await simulationApiSimple.healthCheck();
      
      if (enableBatching) {
        globalUpdateScheduler.schedule({
          id: 'connection-restored',
          priority: UpdatePriority.HIGH,
          callback: () => {
            setIsConnected(true);
            if (error && isNetworkError(error)) {
              setError(null);
            }
          },
          timestamp: Date.now(),
        });
      } else {
        setIsConnected(true);
        if (error && isNetworkError(error)) {
          setError(null);
        }
      }
    } catch (err) {
      if (enableBatching) {
        globalUpdateScheduler.schedule({
          id: 'connection-check-failed',
          priority: UpdatePriority.NORMAL,
          callback: () => {
            setIsConnected(false);
            if (!error) {
              handleError(err);
            }
          },
          timestamp: Date.now(),
        });
      } else {
        setIsConnected(false);
        if (!error) {
          handleError(err);
        }
      }
    }
  }, [error, handleError, enableBatching]);

  // Smart refresh for auto-refresh functionality
  const smartRefreshOptions: DebouncedSimulationOptions = {
    autoRefreshDelay: refreshInterval,
    adaptiveMode: enableAdaptiveRefresh,
    enableBatching,
  };

  const smartRefresh = useSmartRefresh(
    () => simulation ? optimizedFetch(simulation.id) : Promise.resolve(),
    autoRefresh && isSimulationRunning && simulation !== null && isConnected,
    smartRefreshOptions
  );

  // Create simulation with optimized error handling
  const createSimulation = useCallback(
    async (name: string, parameters: SimulationParametersInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const newSimulation = await simulationApiSimple.createSimulation(
          name,
          parameters
        );
        
        if (enableBatching) {
          globalUpdateScheduler.schedule({
            id: 'simulation-created',
            priority: UpdatePriority.HIGH,
            callback: () => {
              setSimulation(newSimulation);
              setBacteria(newSimulation.currentState?.bacteria || []);
              setIsConnected(true);
              setIsLoading(false);
            },
            timestamp: Date.now(),
          });
        } else {
          setSimulation(newSimulation);
          setBacteria(newSimulation.currentState?.bacteria || []);
          setIsConnected(true);
          setIsLoading(false);
        }
      } catch (err) {
        handleError(err);
        setIsLoading(false);
      }
    },
    [enableBatching, handleError]
  );

  // Start simulation
  const startSimulation = useCallback(async () => {
    if (!simulation) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await simulationApiSimple.startSimulation(
        simulation.id
      );
      
      if (enableBatching) {
        globalUpdateScheduler.schedule({
          id: 'simulation-started',
          priority: UpdatePriority.HIGH,
          callback: () => {
            setSimulation(updatedSimulation);
            setBacteria(updatedSimulation.currentState?.bacteria || []);
            setIsConnected(true);
            setIsLoading(false);
          },
          timestamp: Date.now(),
        });
      } else {
        setSimulation(updatedSimulation);
        setBacteria(updatedSimulation.currentState?.bacteria || []);
        setIsConnected(true);
        setIsLoading(false);
      }
    } catch (err) {
      handleError(err);
      setIsLoading(false);
    }
  }, [simulation, enableBatching, handleError]);

  // Stop simulation
  const stopSimulation = useCallback(async () => {
    if (!simulation) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await simulationApiSimple.stopSimulation(
        simulation.id
      );
      
      if (enableBatching) {
        globalUpdateScheduler.schedule({
          id: 'simulation-stopped',
          priority: UpdatePriority.HIGH,
          callback: () => {
            setSimulation(updatedSimulation);
            setBacteria(updatedSimulation.currentState?.bacteria || []);
            setIsConnected(true);
            setIsLoading(false);
          },
          timestamp: Date.now(),
        });
      } else {
        setSimulation(updatedSimulation);
        setBacteria(updatedSimulation.currentState?.bacteria || []);
        setIsConnected(true);
        setIsLoading(false);
      }
    } catch (err) {
      handleError(err);
      setIsLoading(false);
    }
  }, [simulation, enableBatching, handleError]);

  // Reset simulation
  const resetSimulation = useCallback(async () => {
    if (!simulation) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await simulationApiSimple.resetSimulation(
        simulation.id
      );
      
      if (enableBatching) {
        globalUpdateScheduler.schedule({
          id: 'simulation-reset',
          priority: UpdatePriority.HIGH,
          callback: () => {
            setSimulation(updatedSimulation);
            setBacteria(updatedSimulation.currentState?.bacteria || []);
            setIsConnected(true);
            setIsLoading(false);
          },
          timestamp: Date.now(),
        });
      } else {
        setSimulation(updatedSimulation);
        setBacteria(updatedSimulation.currentState?.bacteria || []);
        setIsConnected(true);
        setIsLoading(false);
      }
    } catch (err) {
      handleError(err);
      setIsLoading(false);
    }
  }, [simulation, enableBatching, handleError]);

  // Step simulation
  const stepSimulation = useCallback(async () => {
    if (!simulation) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await simulationApiSimple.stepSimulation(
        simulation.id
      );
      
      if (enableBatching) {
        globalUpdateScheduler.schedule({
          id: 'simulation-stepped',
          priority: UpdatePriority.NORMAL,
          callback: () => {
            setSimulation(updatedSimulation);
            setBacteria(updatedSimulation.currentState?.bacteria || []);
            setIsConnected(true);
            setIsLoading(false);
          },
          timestamp: Date.now(),
        });
      } else {
        setSimulation(updatedSimulation);
        setBacteria(updatedSimulation.currentState?.bacteria || []);
        setIsConnected(true);
        setIsLoading(false);
      }
    } catch (err) {
      handleError(err);
      setIsLoading(false);
    }
  }, [simulation, enableBatching, handleError]);

  // Load simulation
  const loadSimulation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedSimulation = await simulationApiSimple.getSimulation(id);
        
        if (enableBatching) {
          globalUpdateScheduler.schedule({
            id: 'simulation-loaded',
            priority: UpdatePriority.HIGH,
            callback: () => {
              setSimulation(loadedSimulation);
              setBacteria(loadedSimulation.currentState?.bacteria || []);
              setIsConnected(true);
              setIsLoading(false);
            },
            timestamp: Date.now(),
          });
        } else {
          setSimulation(loadedSimulation);
          setBacteria(loadedSimulation.currentState?.bacteria || []);
          setIsConnected(true);
          setIsLoading(false);
        }
      } catch (err) {
        handleError(err);
        setIsLoading(false);
      }
    },
    [enableBatching, handleError]
  );

  // Use debounced parameters for updateParameters
  const { updateParameters } = useDebouncedParameters(
    simulation?.parameters || {
      initialPopulation: 100,
      growthRate: 0.1,
      antibioticConcentration: 0.0,
      mutationRate: 0.02,
      duration: 1000,
      petriDishSize: 600,
    },
    async (parameters: Partial<SimulationParametersInput>) => {
      if (!simulation) return;
      await simulationApiSimple.updateSimulation(simulation.id, parameters);
    },
    {
      autoRefreshDelay: 500,
      enableBatching,
    }
  );

  // Legacy auto-refresh effect (kept for backward compatibility when smart refresh is disabled)
  useEffect(() => {
    if (!enableAdaptiveRefresh && autoRefresh && isSimulationRunning && simulation && isConnected) {
      const intervalCallback = async () => {
        try {
          if (simulation?.id) {
            await fetchSimulationData(simulation.id);
          }
        } catch (err) {
          // Handled by fetchSimulationData
        }
      };

      refreshIntervalRef.current = setInterval(intervalCallback, refreshInterval);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [
    autoRefresh,
    isSimulationRunning,
    simulation?.id, // Only depend on the ID, not the entire simulation object
    isConnected,
    refreshInterval,
    fetchSimulationData, // Use the base fetch function instead of optimizedFetch
    enableAdaptiveRefresh,
  ]);

  // Connection check with debouncing
  const debouncedConnectionCheck = useMemo(() => {
    return enableDebouncing 
      ? debounce(checkConnection, 5000, { leading: true, trailing: false })
      : checkConnection;
  }, [checkConnection, enableDebouncing]);

  // Periodic connection check
  useEffect(() => {
    const connectionCheckInterval = setInterval(debouncedConnectionCheck, 30000);

    // Initial connection check
    debouncedConnectionCheck();

    return () => {
      clearInterval(connectionCheckInterval);
      if (enableDebouncing) {
        (debouncedConnectionCheck as any).cancel?.();
      }
    };
  }, [debouncedConnectionCheck, enableDebouncing]);

  return {
    // State
    simulation,
    bacteria,
    isLoading,
    isSimulationRunning,
    error,
    isConnected,

    // Actions
    createSimulation,
    startSimulation,
    stopSimulation,
    resetSimulation,
    stepSimulation,
    updateParameters,
    loadSimulation,
    clearError,
    checkConnection,

    // Performance metrics (when debouncing is enabled)
    ...(enableDebouncing && {
      refreshCount: smartRefresh.refreshCount,
      currentRefreshInterval: smartRefresh.currentInterval,
      averageRefreshTime: smartRefresh.averageRefreshTime,
      lastFetchTime: lastFetchTimeRef.current,
      totalFetches: fetchCountRef.current,
    }),
  };
}

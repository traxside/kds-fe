import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Simulation,
  SimulationParametersInput,
  Bacterium,
  GenerationData,
} from "@/types/simulation";
import simulationApiSimple, {
  getErrorMessage,
  isNetworkError,
} from "@/lib/api_new";
import {
  debounce,
  adaptiveDebounce,
  globalUpdateScheduler,
  UpdatePriority,
  type DebounceFunction
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

  // Navigation state for playback
  allGenerations: GenerationData[];
  currentGenerationIndex: number;
  maxGenerations: number;
  isPlaybackMode: boolean;

  // Actions
  createSimulation: (
    name: string,
    parameters: SimulationParametersInput
  ) => Promise<Simulation>;
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
  runFullSimulation: () => Promise<void>;
  runLiveSimulation: (animationSpeed?: number) => Promise<void>;

  // Navigation actions for playback
  navigateToGeneration: (generationIndex: number) => void;
  goToNextGeneration: () => void;
  goToPreviousGeneration: () => void;
  goToFirstGeneration: () => void;
  goToLastGeneration: () => void;

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

  // Navigation state for playback
  const [allGenerations, setAllGenerations] = useState<GenerationData[]>([]);
  const [currentGenerationIndex, setCurrentGenerationIndex] = useState(0);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);

  // Refs for cleanup and performance tracking
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const fetchCountRef = useRef<number>(0);

  // Derived state
  const isSimulationRunning = simulation?.currentState?.isRunning ?? false;
  const maxGenerations = allGenerations.length - 1;

  // Navigation actions for playback
  const navigateToGeneration = useCallback((generationIndex: number) => {
    if (generationIndex >= 0 && generationIndex < allGenerations.length) {
      setCurrentGenerationIndex(generationIndex);
      const targetGeneration = allGenerations[generationIndex];
      setBacteria(targetGeneration.bacteria);
      setIsPlaybackMode(true);
    }
  }, [allGenerations]);

  const goToNextGeneration = useCallback(() => {
    if (currentGenerationIndex < maxGenerations) {
      navigateToGeneration(currentGenerationIndex + 1);
    }
  }, [currentGenerationIndex, maxGenerations, navigateToGeneration]);

  const goToPreviousGeneration = useCallback(() => {
    if (currentGenerationIndex > 0) {
      navigateToGeneration(currentGenerationIndex - 1);
    }
  }, [currentGenerationIndex, navigateToGeneration]);

  const goToFirstGeneration = useCallback(() => {
    navigateToGeneration(0);
  }, [navigateToGeneration]);

  const goToLastGeneration = useCallback(() => {
    navigateToGeneration(maxGenerations);
  }, [maxGenerations, navigateToGeneration]);

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
      handleError(err);
    }
  }, [enableBatching, prioritizeCriticalUpdates, bacteria, handleError]);

  // Create debounced/adaptive fetch function
  const optimizedFetch = useMemo(() => {
    if (!enableDebouncing) {
      return fetchSimulationData;
    }

    // Create wrapper function with proper typing for debounce functions
    const wrappedFetch = (...args: unknown[]): unknown => {
      const id = args[0] as string;
      return fetchSimulationData(id);
    };

    return enableAdaptiveRefresh
      ? adaptiveDebounce(wrappedFetch, refreshInterval, {
          minWait: refreshInterval / 2,
          maxWait: refreshInterval * 2,
          performanceThreshold: 200, // 200ms threshold for API calls
        }) as typeof fetchSimulationData
      : debounce(wrappedFetch, Math.min(refreshInterval / 2, 250), {
          leading: false,
          trailing: true,
          maxWait: refreshInterval,
        }) as typeof fetchSimulationData;
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
    async () => {
      if (simulation) {
        await optimizedFetch(simulation.id);
      }
    },
    autoRefresh && isSimulationRunning && simulation !== null && isConnected,
    smartRefreshOptions
  );

  // Create simulation with optimized error handling
  const createSimulation = useCallback(
    async (name: string, parameters: SimulationParametersInput): Promise<Simulation> => {
      console.log('[useSimulation] createSimulation called with:', { name, parameters });
      setIsLoading(true);
      setError(null);

      try {
        console.log('[useSimulation] About to call API createSimulation...');
        const newSimulation = await simulationApiSimple.createSimulation(
          name,
          parameters
        );
        console.log('[useSimulation] API createSimulation successful:', newSimulation);

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
        
        // Return the created simulation
        return newSimulation;
      } catch (_err) {
        handleError(_err);
        setIsLoading(false);
        throw _err; // Re-throw to let caller handle the error
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
    } catch (_err) {
      handleError(_err);
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
    } catch (_err) {
      handleError(_err);
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
    } catch (_err) {
      handleError(_err);
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
    } catch (_err) {
      handleError(_err);
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
      } catch (_err) {
        handleError(_err);
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
          handleError(err);
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
    simulation,
    isConnected,
    refreshInterval,
    fetchSimulationData,
    enableAdaptiveRefresh,
    handleError,
  ]);

  // Periodic connection check
  useEffect(() => {
    const currentDebouncedCheck = enableDebouncing
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      ? debounce((..._args: unknown[]) => checkConnection(), 5000, { leading: true, trailing: false }) as typeof checkConnection
      : checkConnection;

    const connectionCheckInterval = setInterval(currentDebouncedCheck, 30000);

    // Initial connection check
    currentDebouncedCheck();

    return () => {
      clearInterval(connectionCheckInterval);
      if (enableDebouncing) {
        // When enableDebouncing is true, currentDebouncedCheck is DebounceFunction
        (currentDebouncedCheck as DebounceFunction<(...args: unknown[]) => unknown>).cancel();
      }
    };
  }, [checkConnection, enableDebouncing]); // Removed debounce from dependencies

  // Function to run live simulation (step by step with animation)
  const runLiveSimulation = useCallback(async (animationSpeed: number = 500) => {
    if (!simulation?.id) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('[useSimulation] Starting live simulation...');
      
      // First get the complete simulation data
      const response = await simulationApiSimple.runFullSimulation(simulation.id);
      
      let generations: GenerationData[] = [];
      
      if (response && typeof response === 'object') {
        if ('simulation' in response && 'allGenerations' in response) {
          generations = response.allGenerations as GenerationData[];
        } else {
          generations = (response as any).allGenerations || [];
        }
      }
      
      if (generations.length === 0) {
        throw new Error('No generations data received');
      }
      
      setAllGenerations(generations);
      setIsPlaybackMode(true);
      setCurrentGenerationIndex(0);
      
      // Start with generation 0
      setBacteria(generations[0].bacteria);
      
      // Animate through generations
      for (let i = 1; i < generations.length; i++) {
        await new Promise(resolve => setTimeout(resolve, animationSpeed));
        
        setCurrentGenerationIndex(i);
        setBacteria(generations[i].bacteria);
        
        console.log(`[useSimulation] Animated to generation ${i}, bacteria count: ${generations[i].bacteria.length}`);
      }
      
      console.log('[useSimulation] Live simulation animation completed');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run live simulation';
      setError(errorMessage);
      console.error('[useSimulation] Run live simulation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [simulation?.id]);

  // Function to run full simulation
  const runFullSimulation = useCallback(async () => {
    if (!simulation?.id) return;
    
    setIsLoading(true);
    try {
      console.log('[useSimulation] Running full simulation...');
      const response = await simulationApiSimple.runFullSimulation(simulation.id);
      
      console.log('[useSimulation] Raw response:', response);
      
      // Handle the response structure from backend
      let updatedSimulation: Simulation;
      let generations: GenerationData[] = [];
      
      if (response && typeof response === 'object') {
        // Check if response has simulation and allGenerations properties (backend format)
        if ('simulation' in response && 'allGenerations' in response) {
          updatedSimulation = response.simulation as Simulation;
          generations = response.allGenerations as GenerationData[];
        } else {
          // Response is the simulation object directly
          updatedSimulation = response as Simulation;
          generations = (response as any).allGenerations || [];
        }
      } else {
        throw new Error('Invalid response format from server');
      }
      
      console.log('[useSimulation] Processed response:', {
        simulationId: updatedSimulation.id,
        totalGenerations: generations.length,
        currentGeneration: updatedSimulation.currentState.generation,
        bacteriaInFinalState: updatedSimulation.currentState.bacteria?.length || 0,
        finalGenerationBacteria: generations.length > 0 ? generations[generations.length - 1].bacteria.length : 0,
        sampleBacteriaFromFinalGen: generations.length > 0 ? generations[generations.length - 1].bacteria.slice(0, 3) : []
      });
      
      // Update simulation state
      setSimulation(updatedSimulation);
      setAllGenerations(generations);
      
      // Set to the final generation for immediate display
      if (generations.length > 0) {
                const finalGeneration = generations[generations.length - 1];
        setBacteria(finalGeneration.bacteria);
        setCurrentGenerationIndex(generations.length - 1);
        setIsPlaybackMode(true);
        
        console.log('[useSimulation] Set to final generation:', {
          generationIndex: generations.length - 1,
          bacteriaCount: finalGeneration.bacteria.length,
          resistantCount: finalGeneration.bacteria.filter(b => b.isResistant).length
        });
        
        // Force a small delay to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('[useSimulation] After setting bacteria state, current bacteria in hook:', bacteria.length);
      } else {
        // Fallback to current state bacteria if no generations data
        setBacteria(updatedSimulation.currentState?.bacteria || []);
        setIsPlaybackMode(false);
        
        console.log('[useSimulation] Fallback to current state bacteria:', {
          bacteriaCount: updatedSimulation.currentState?.bacteria?.length || 0
        });
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to run full simulation';
      setError(errorMessage);
      console.error('[useSimulation] Run full simulation error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [simulation?.id]);

  // Update bacteria when simulation changes (but not in playback mode)
  useEffect(() => {
    if (simulation && !isPlaybackMode) {
      setBacteria(simulation.currentState?.bacteria || []);
      
      // If simulation has allGenerations, set up navigation
      if (simulation.allGenerations && simulation.allGenerations.length > 0) {
        setAllGenerations(simulation.allGenerations);
        setCurrentGenerationIndex(simulation.currentState.generation || 0);
      }
    }
  }, [simulation, isPlaybackMode]);

  return {
    // State
    simulation,
    bacteria,
    isLoading,
    isSimulationRunning,
    error,
    isConnected,

    // Navigation state for playback
    allGenerations,
    currentGenerationIndex,
    maxGenerations,
    isPlaybackMode,

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
    runFullSimulation,
    runLiveSimulation,

    // Navigation actions for playback
    navigateToGeneration,
    goToNextGeneration,
    goToPreviousGeneration,
    goToFirstGeneration,
    goToLastGeneration,

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

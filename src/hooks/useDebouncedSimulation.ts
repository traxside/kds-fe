/**
 * @fileoverview Debounced simulation hooks for optimized real-time updates
 * 
 * Provides React hooks that integrate debouncing and throttling with
 * simulation-specific requirements:
 * - Debounced simulation data fetching
 * - Throttled force graph updates
 * - Batched statistics updates
 * - Priority-based update scheduling
 * 
 * @author Bacteria Simulation Team
 * @since 1.0.0
 */

import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { 
  debounce, 
  throttle, 
  adaptiveDebounce,
  globalUpdateScheduler, 
  UpdatePriority,
  debouncedUtils,
  type DebounceFunction,
  type ThrottleFunction
} from '@/lib/debounce';
import { Simulation, Bacterium, SimulationStatistics } from '@/types/simulation';

/**
 * Options for debounced simulation updates
 */
export interface DebouncedSimulationOptions {
  autoRefreshDelay?: number;
  statisticsUpdateDelay?: number;
  forceGraphUpdateDelay?: number;
  adaptiveMode?: boolean;
  enableBatching?: boolean;
  prioritizeCriticalUpdates?: boolean;
}

/**
 * Debounced simulation data fetching hook
 * Optimizes API calls to prevent excessive requests during rapid simulation changes
 */
export function useDebouncedSimulationData(
  simulationId: string | null,
  fetchFunction: (id: string) => Promise<Simulation>,
  options: DebouncedSimulationOptions = {}
) {
  const {
    autoRefreshDelay = 500,
    adaptiveMode = true,
    enableBatching = true,
  } = options;

  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create debounced fetch function
  const debouncedFetch = useMemo(() => {
    const fetchWrapper = async (id: string) => {
      if (!id) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await fetchFunction(id);
        
        if (enableBatching) {
          // Use batched update for non-critical simulation data
          globalUpdateScheduler.schedule({
            id: `simulation-data-${id}`,
            priority: UpdatePriority.NORMAL,
            callback: () => {
              setSimulation(result);
              setIsLoading(false);
            },
            timestamp: Date.now(),
          });
        } else {
          setSimulation(result);
          setIsLoading(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch simulation';
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    return adaptiveMode 
      ? adaptiveDebounce(fetchWrapper, autoRefreshDelay, {
          minWait: autoRefreshDelay / 2,
          maxWait: autoRefreshDelay * 2,
          performanceThreshold: 100, // Adjust based on API response time
        })
      : debounce(fetchWrapper, autoRefreshDelay, {
          leading: false,
          trailing: true,
        });
  }, [fetchFunction, autoRefreshDelay, adaptiveMode, enableBatching]);

  // Fetch simulation data when ID changes
  useEffect(() => {
    if (simulationId) {
      debouncedFetch(simulationId);
    } else {
      setSimulation(null);
      setError(null);
      setIsLoading(false);
    }

    return () => {
      debouncedFetch.cancel();
    };
  }, [simulationId, debouncedFetch]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (simulationId) {
      debouncedFetch.flush(); // Force immediate execution
      debouncedFetch(simulationId);
    }
  }, [simulationId, debouncedFetch]);

  return {
    simulation,
    isLoading,
    error,
    refresh,
  };
}

/**
 * Throttled force graph updates hook
 * Prevents excessive re-renders of the force graph during rapid bacteria updates
 */
export function useThrottledForceGraph(
  bacteria: Bacterium[],
  options: DebouncedSimulationOptions = {}
) {
  const {
    forceGraphUpdateDelay = 100,
    enableBatching = true,
    prioritizeCriticalUpdates = true,
  } = options;

  const [throttledBacteria, setThrottledBacteria] = useState<Bacterium[]>(bacteria);
  const [isUpdating, setIsUpdating] = useState(false);
  const lastUpdateRef = useRef<number>(0);

  // Create throttled update function
  const throttledUpdate = useMemo(() => {
    const updateBacteria = (newBacteria: Bacterium[]) => {
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateRef.current;
      
      // Check for critical updates (resistant bacteria emergence)
      // Get current bacteria state from the closure to avoid dependency issues
      const getCurrentBacteria = () => throttledBacteria;
      const currentBacteria = getCurrentBacteria();
      
      const hasResistantBacteria = newBacteria.some(b => b.isResistant);
      const previouslyHadResistance = currentBacteria.some(b => b.isResistant);
      const resistanceEmergence = hasResistantBacteria && !previouslyHadResistance;
      
      if (prioritizeCriticalUpdates && resistanceEmergence) {
        // Immediate update for critical changes
        globalUpdateScheduler.schedule({
          id: 'force-graph-critical',
          priority: UpdatePriority.IMMEDIATE,
          callback: () => {
            setThrottledBacteria(newBacteria);
            setIsUpdating(false);
            lastUpdateRef.current = now;
          },
          timestamp: now,
        });
        setIsUpdating(true);
        return;
      }

      if (enableBatching) {
        // Use batched update for normal changes
        globalUpdateScheduler.schedule({
          id: 'force-graph-update',
          priority: UpdatePriority.NORMAL,
          callback: () => {
            setThrottledBacteria(newBacteria);
            setIsUpdating(false);
            lastUpdateRef.current = now;
          },
          timestamp: now,
        });
        setIsUpdating(true);
      } else {
        setThrottledBacteria(newBacteria);
        lastUpdateRef.current = now;
      }
    };

    return throttle(updateBacteria, forceGraphUpdateDelay, {
      leading: true,
      trailing: true,
    });
  }, [
    forceGraphUpdateDelay, 
    enableBatching, 
    prioritizeCriticalUpdates
    // Removed throttledBacteria dependency to prevent circular dependency
  ]);

  // Update when bacteria changes
  useEffect(() => {
    throttledUpdate(bacteria);
    
    return () => {
      throttledUpdate.cancel();
    };
  }, [bacteria, throttledUpdate]);

  return {
    bacteria: throttledBacteria,
    isUpdating,
    forceUpdate: () => {
      throttledUpdate.flush();
      throttledUpdate(bacteria);
    },
  };
}

/**
 * Batched statistics updates hook
 * Groups multiple statistics updates into efficient batches
 */
export function useBatchedStatistics(
  simulation: Simulation | null,
  options: DebouncedSimulationOptions = {}
) {
  const {
    statisticsUpdateDelay = 250,
    enableBatching = true,
  } = options;

  const [statistics, setStatistics] = useState<SimulationStatistics | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const pendingUpdatesRef = useRef<Set<string>>(new Set());

  // Create debounced statistics calculator
  const debouncedCalculateStats = useMemo(() => {
    const calculateStats = (sim: Simulation) => {
      if (!sim) return;

      setIsCalculating(true);
      
      const newStats = sim.statistics;
      
      if (enableBatching) {
        globalUpdateScheduler.schedule({
          id: 'statistics-update',
          priority: UpdatePriority.NORMAL,
          callback: () => {
            setStatistics(newStats);
            setIsCalculating(false);
            pendingUpdatesRef.current.clear();
          },
          timestamp: Date.now(),
          dependencies: Array.from(pendingUpdatesRef.current),
        });
      } else {
        setStatistics(newStats);
        setIsCalculating(false);
      }
    };

    return debounce(calculateStats, statisticsUpdateDelay, {
      leading: false,
      trailing: true,
      maxWait: statisticsUpdateDelay * 2,
    });
  }, [statisticsUpdateDelay, enableBatching]);

  // Calculate statistics when simulation changes
  useEffect(() => {
    if (simulation) {
      const updateId = `stats-${simulation.id}-${Date.now()}`;
      pendingUpdatesRef.current.add(updateId);
      debouncedCalculateStats(simulation);
    } else {
      setStatistics(null);
      setIsCalculating(false);
    }

    return () => {
      debouncedCalculateStats.cancel();
    };
  }, [simulation, debouncedCalculateStats]);

  return {
    statistics,
    isCalculating,
    forceUpdate: () => {
      if (simulation) {
        debouncedCalculateStats.flush();
        debouncedCalculateStats(simulation);
      }
    },
  };
}

/**
 * Debounced parameter updates hook
 * Prevents excessive parameter change requests during rapid user input
 */
export function useDebouncedParameters<T extends Record<string, any>>(
  initialParams: T,
  updateFunction: (params: Partial<T>) => Promise<void>,
  options: DebouncedSimulationOptions = {}
) {
  const {
    autoRefreshDelay = 500,
    enableBatching = true,
  } = options;

  const [localParams, setLocalParams] = useState<T>(initialParams);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingChangesRef = useRef<Partial<T>>({});

  // Create debounced update function
  const debouncedUpdate = useMemo(() => {
    const performUpdate = async (changes: Partial<T>) => {
      if (Object.keys(changes).length === 0) return;

      setIsUpdating(true);
      setError(null);

      try {
        await updateFunction(changes);
        pendingChangesRef.current = {};
        
        if (enableBatching) {
          globalUpdateScheduler.schedule({
            id: 'parameter-update-success',
            priority: UpdatePriority.HIGH,
            callback: () => {
              setIsUpdating(false);
            },
            timestamp: Date.now(),
          });
        } else {
          setIsUpdating(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update parameters';
        setError(errorMessage);
        setIsUpdating(false);
      }
    };

    return debounce(performUpdate, autoRefreshDelay, {
      leading: false,
      trailing: true,
    });
  }, [updateFunction, autoRefreshDelay, enableBatching]);

  // Update local parameters and schedule remote update
  const updateParameters = useCallback((changes: Partial<T>) => {
    setLocalParams(prev => ({ ...prev, ...changes }));
    
    // Accumulate pending changes
    pendingChangesRef.current = { ...pendingChangesRef.current, ...changes };
    
    // Schedule debounced update
    debouncedUpdate(pendingChangesRef.current);
  }, [debouncedUpdate]);

  // Immediate update function (bypass debouncing)
  const updateImmediately = useCallback(async (changes: Partial<T>) => {
    debouncedUpdate.cancel();
    setLocalParams(prev => ({ ...prev, ...changes }));
    
    setIsUpdating(true);
    setError(null);
    
    try {
      await updateFunction(changes);
      pendingChangesRef.current = {};
      setIsUpdating(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update parameters';
      setError(errorMessage);
      setIsUpdating(false);
    }
  }, [updateFunction, debouncedUpdate]);

  // Sync local parameters with prop changes
  useEffect(() => {
    // Prevent update loop if initialParams is an object/array and re-created on each render
    if (JSON.stringify(localParams) !== JSON.stringify(initialParams)) {
      setLocalParams(initialParams);
    }
  }, [initialParams, localParams]);

  return {
    parameters: localParams,
    isUpdating,
    error,
    updateParameters,
    updateImmediately,
    hasPendingChanges: Object.keys(pendingChangesRef.current).length > 0,
  };
}

/**
 * Smart refresh hook with adaptive timing
 * Automatically adjusts refresh intervals based on simulation activity and performance
 */
export function useSmartRefresh(
  refreshFunction: () => Promise<void>,
  isActive: boolean,
  options: DebouncedSimulationOptions = {}
) {
  const {
    autoRefreshDelay = 1000,
    adaptiveMode = true,
  } = options;

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const performanceHistoryRef = useRef<number[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalRef = useRef<number>(autoRefreshDelay);

  // Calculate optimal refresh interval based on performance
  const calculateOptimalInterval = useCallback(() => {
    if (!adaptiveMode || performanceHistoryRef.current.length < 3) {
      return autoRefreshDelay;
    }

    const avgTime = performanceHistoryRef.current.reduce((a, b) => a + b, 0) / 
                   performanceHistoryRef.current.length;

    // Adjust interval based on performance:
    // - If refresh takes >100ms, increase interval
    // - If refresh takes <50ms, decrease interval slightly
    if (avgTime > 100) {
      return Math.min(autoRefreshDelay * 2, currentIntervalRef.current * 1.5);
    } else if (avgTime < 50) {
      return Math.max(autoRefreshDelay / 2, currentIntervalRef.current * 0.8);
    }

    return currentIntervalRef.current;
  }, [autoRefreshDelay, adaptiveMode]);

  // Perform refresh with performance tracking
  const performRefresh = useCallback(async () => {
    if (isRefreshing) return;

    const startTime = performance.now();
    setIsRefreshing(true);

    try {
      await refreshFunction();
      
      const refreshTime = performance.now() - startTime;
      performanceHistoryRef.current.push(refreshTime);
      
      // Keep only last 10 measurements
      if (performanceHistoryRef.current.length > 10) {
        performanceHistoryRef.current.shift();
      }

      setRefreshCount(prev => prev + 1);
      
      // Update interval based on performance
      if (adaptiveMode) {
        const newInterval = calculateOptimalInterval();
        if (Math.abs(newInterval - currentIntervalRef.current) > 100) {
          currentIntervalRef.current = newInterval;
          
          // Restart interval with new timing
          if (intervalRef.current && isActive) {
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(performRefresh, newInterval);
          }
        }
      }
    } catch (error) {
      console.error('Smart refresh failed:', error);
      
      // Increase interval on errors to reduce failure rate
      if (adaptiveMode) {
        currentIntervalRef.current = Math.min(
          autoRefreshDelay * 3, 
          currentIntervalRef.current * 2
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshFunction, isRefreshing, adaptiveMode, calculateOptimalInterval, isActive, autoRefreshDelay]);

  // Start/stop refresh interval
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(performRefresh, currentIntervalRef.current);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, performRefresh]);

  return {
    isRefreshing,
    refreshCount,
    currentInterval: currentIntervalRef.current,
    averageRefreshTime: performanceHistoryRef.current.length > 0 
      ? performanceHistoryRef.current.reduce((a, b) => a + b, 0) / performanceHistoryRef.current.length 
      : 0,
    performRefreshNow: performRefresh,
  };
}

/**
 * High-level hook that combines all debounced simulation optimizations
 */
export function useOptimizedSimulation(
  simulationId: string | null,
  fetchFunction: (id: string) => Promise<Simulation>,
  options: DebouncedSimulationOptions = {}
) {
  // Debounced simulation data
  const { simulation, isLoading, error, refresh } = useDebouncedSimulationData(
    simulationId,
    fetchFunction,
    options
  );

  // Throttled force graph updates
  const { 
    bacteria: optimizedBacteria, 
    isUpdating: isGraphUpdating,
    forceUpdate: forceGraphUpdate 
  } = useThrottledForceGraph(
    simulation?.currentState?.bacteria || [],
    options
  );

  // Batched statistics
  const {
    statistics,
    isCalculating: isStatsCalculating,
    forceUpdate: forceStatsUpdate
  } = useBatchedStatistics(simulation, options);

  // Smart refresh for active simulations
  const {
    isRefreshing,
    refreshCount,
    currentInterval,
    averageRefreshTime,
    performRefreshNow
  } = useSmartRefresh(
    () => Promise.resolve(refresh()),
    simulation?.currentState?.isRunning || false,
    options
  );

  return {
    // Data
    simulation,
    bacteria: optimizedBacteria,
    statistics,
    
    // Loading states
    isLoading,
    isGraphUpdating,
    isStatsCalculating,
    isRefreshing,
    
    // Error handling
    error,
    
    // Performance metrics
    refreshCount,
    currentInterval,
    averageRefreshTime,
    
    // Manual controls
    refresh: performRefreshNow,
    forceGraphUpdate,
    forceStatsUpdate,
  };
} 
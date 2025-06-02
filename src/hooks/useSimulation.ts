import { useState, useCallback, useEffect, useRef } from "react";
import {
  Simulation,
  SimulationParametersInput,
  SimulationState,
  Bacterium,
} from "@/types/simulation";
import { simulationApi, getErrorMessage, isNetworkError } from "@/lib/api";

interface UseSimulationOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
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
  ) => Promise<void>;
  loadSimulation: (id: string) => Promise<void>;
  clearError: () => void;
  checkConnection: () => Promise<void>;
}

export function useSimulation(
  options: UseSimulationOptions = {}
): UseSimulationReturn {
  const { autoRefresh = false, refreshInterval = 1000 } = options;

  // State
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [bacteria, setBacteria] = useState<Bacterium[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(true);

  // Refs for cleanup
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Derived state
  const isSimulationRunning = simulation?.currentState?.isRunning ?? false;

  // Error handling helper
  const handleError = useCallback((err: unknown) => {
    const message = getErrorMessage(err);
    setError(message);

    if (isNetworkError(err)) {
      setIsConnected(false);
    }

    console.error("Simulation error:", err);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Check API connection
  const checkConnection = useCallback(async () => {
    try {
      await simulationApi.healthCheck();
      setIsConnected(true);
      if (error && isNetworkError(error)) {
        setError(null);
      }
    } catch (err) {
      setIsConnected(false);
      if (!error) {
        handleError(err);
      }
    }
  }, [error, handleError]);

  // Create a new simulation
  const createSimulation = useCallback(
    async (name: string, parameters: SimulationParametersInput) => {
      setIsLoading(true);
      setError(null);

      try {
        const newSimulation = await simulationApi.createSimulation(
          name,
          parameters
        );
        setSimulation(newSimulation);
        setBacteria(newSimulation.currentState.bacteria);
        setIsConnected(true);
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  // Load existing simulation
  const loadSimulation = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const loadedSimulation = await simulationApi.getSimulation(id);
        setSimulation(loadedSimulation);
        setBacteria(loadedSimulation.currentState.bacteria);
        setIsConnected(true);
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [handleError]
  );

  // Start simulation
  const startSimulation = useCallback(async () => {
    if (!simulation) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await simulationApi.startSimulation(
        simulation.id
      );
      setSimulation(updatedSimulation);
      setBacteria(updatedSimulation.currentState.bacteria);
      setIsConnected(true);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [simulation, handleError]);

  // Stop simulation
  const stopSimulation = useCallback(async () => {
    if (!simulation) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await simulationApi.stopSimulation(
        simulation.id
      );
      setSimulation(updatedSimulation);
      setBacteria(updatedSimulation.currentState.bacteria);
      setIsConnected(true);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [simulation, handleError]);

  // Reset simulation
  const resetSimulation = useCallback(async () => {
    if (!simulation) return;

    setIsLoading(true);
    setError(null);

    try {
      const updatedSimulation = await simulationApi.resetSimulation(
        simulation.id
      );
      setSimulation(updatedSimulation);
      setBacteria(updatedSimulation.currentState.bacteria);
      setIsConnected(true);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [simulation, handleError]);

  // Step simulation
  const stepSimulation = useCallback(async () => {
    if (!simulation) return;

    try {
      const updatedSimulation = await simulationApi.stepSimulation(
        simulation.id
      );
      setSimulation(updatedSimulation);
      setBacteria(updatedSimulation.currentState.bacteria);
      setIsConnected(true);
    } catch (err) {
      handleError(err);
    }
  }, [simulation, handleError]);

  // Update parameters
  const updateParameters = useCallback(
    async (parameters: Partial<SimulationParametersInput>) => {
      if (!simulation) return;

      setIsLoading(true);
      setError(null);

      try {
        const updatedSimulation = await simulationApi.updateSimulation(
          simulation.id,
          parameters
        );
        setSimulation(updatedSimulation);
        setBacteria(updatedSimulation.currentState.bacteria);
        setIsConnected(true);
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [simulation, handleError]
  );

  // Auto-refresh effect for running simulations
  useEffect(() => {
    if (autoRefresh && isSimulationRunning && simulation && isConnected) {
      refreshIntervalRef.current = setInterval(async () => {
        try {
          const updatedSimulation = await simulationApi.getSimulation(
            simulation.id
          );
          setSimulation(updatedSimulation);
          setBacteria(updatedSimulation.currentState.bacteria);
        } catch (err) {
          // Silently handle errors during auto-refresh to avoid spam
          console.warn("Auto-refresh failed:", err);
          if (isNetworkError(err)) {
            setIsConnected(false);
          }
        }
      }, refreshInterval);
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
  ]);

  // Periodic connection check
  useEffect(() => {
    const connectionCheckInterval = setInterval(checkConnection, 30000); // Check every 30 seconds

    // Initial connection check
    checkConnection();

    return () => clearInterval(connectionCheckInterval);
  }, [checkConnection]);

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
  };
}

"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { 
  ProgressiveDataLoader, 
  ProgressiveLoadingConfig, 
  LoadingStrategy,
  SimulationLoadingStrategy,
  ChunkPriority,
  ProgressCallback
} from "@/lib/progressiveLoader";
import { Bacterium, Simulation } from "@/types/simulation";

// Loading state interface
export interface ProgressiveLoadingState {
  isLoading: boolean;
  progress: {
    loaded: number;
    total: number;
    status: string;
  };
  error: string | null;
  memoryUsage: {
    estimatedMB: number;
    chunksLoaded: number;
    totalChunks: number;
  };
}

// Configuration for the hook
export interface UseProgressiveLoaderConfig extends Partial<ProgressiveLoadingConfig> {
  enabled?: boolean;
  strategy?: 'default' | 'simulation';
  autoCleanup?: boolean;
}

// Data loader function type
export type DataLoader<T> = (startIndex: number, endIndex: number) => Promise<T[]>;

/**
 * Custom hook for progressive data loading with React integration
 * 
 * Provides progressive loading capabilities for large datasets while maintaining
 * React state management and cleanup.
 */
export function useProgressiveLoader<T>(
  config: UseProgressiveLoaderConfig = {}
) {
  const {
    enabled = true,
    strategy = 'default',
    autoCleanup = true,
    ...loaderConfig
  } = config;

  // Create progressive loader instance
  const loaderRef = useRef<ProgressiveDataLoader<T> | null>(null);
  const isInitializedRef = useRef(false);
  
  // Loading state
  const [state, setState] = useState<ProgressiveLoadingState>({
    isLoading: false,
    progress: { loaded: 0, total: 0, status: '' },
    error: null,
    memoryUsage: { estimatedMB: 0, chunksLoaded: 0, totalChunks: 0 }
  });

  // Create loading strategy
  const loadingStrategy = useMemo((): LoadingStrategy | undefined => {
    if (!enabled) return undefined;
    
    switch (strategy) {
      case 'simulation':
        return new SimulationLoadingStrategy(loaderConfig.chunkSize);
      case 'default':
      default:
        return undefined; // Use default strategy
    }
  }, [enabled, strategy, loaderConfig.chunkSize]);

  // Initialize progressive loader
  const initialize = useCallback(async (
    totalItems: number,
    itemSizeEstimate: number = 1024
  ): Promise<void> => {
    if (!enabled) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      // Create new loader instance
      loaderRef.current = new ProgressiveDataLoader<T>(loaderConfig, loadingStrategy);
      
      // Initialize with dataset metadata
      await loaderRef.current.initialize(totalItems, itemSizeEstimate);
      
      // Update state
      const memoryStats = loaderRef.current.getMemoryStats();
      setState(prev => ({
        ...prev,
        isLoading: false,
        memoryUsage: {
          estimatedMB: memoryStats.estimatedMemoryUsage,
          chunksLoaded: memoryStats.loadedChunks,
          totalChunks: memoryStats.totalChunks
        }
      }));
      
      isInitializedRef.current = true;
      
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      }));
    }
  }, [enabled, loaderConfig, loadingStrategy]);

  // Load data for specific range
  const loadData = useCallback(async (
    startIndex: number,
    endIndex: number,
    loader: DataLoader<T>
  ): Promise<T[]> => {
    if (!enabled || !loaderRef.current || !isInitializedRef.current) {
      // Fallback to direct loading
      return await loader(startIndex, endIndex);
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const progressCallback: ProgressCallback = (loaded, total, status) => {
        setState(prev => ({
          ...prev,
          progress: { loaded, total, status }
        }));
      };

      const result = await loaderRef.current.requestData(
        startIndex,
        endIndex,
        loader,
        progressCallback
      );

      // Update memory stats
      const memoryStats = loaderRef.current.getMemoryStats();
      setState(prev => ({
        ...prev,
        isLoading: false,
        memoryUsage: {
          estimatedMB: memoryStats.estimatedMemoryUsage,
          chunksLoaded: memoryStats.loadedChunks,
          totalChunks: memoryStats.totalChunks
        }
      }));

      return result;

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Loading failed'
      }));
      
      // Fallback to direct loading on error
      return await loader(startIndex, endIndex);
    }
  }, [enabled]);

  // Load visible data with prefetching
  const loadVisibleData = useCallback(async (
    visibleRange: { start: number; end: number },
    loader: DataLoader<T>
  ): Promise<T[]> => {
    if (!enabled || !loaderRef.current || !isInitializedRef.current) {
      // Fallback to direct loading
      return await loader(visibleRange.start, visibleRange.end);
    }

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const progressCallback: ProgressCallback = (loaded, total, status) => {
        setState(prev => ({
          ...prev,
          progress: { loaded, total, status }
        }));
      };

      const result = await loaderRef.current.requestVisibleData(
        visibleRange,
        loader,
        progressCallback
      );

      // Update memory stats
      const memoryStats = loaderRef.current.getMemoryStats();
      setState(prev => ({
        ...prev,
        isLoading: false,
        memoryUsage: {
          estimatedMB: memoryStats.estimatedMemoryUsage,
          chunksLoaded: memoryStats.loadedChunks,
          totalChunks: memoryStats.totalChunks
        }
      }));

      return result;

    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Loading failed'
      }));
      
      // Fallback to direct loading on error
      return await loader(visibleRange.start, visibleRange.end);
    }
  }, [enabled]);

  // Get chunk information for debugging
  const getChunkInfo = useCallback(() => {
    if (!loaderRef.current) return [];
    return loaderRef.current.getChunkInfo();
  }, []);

  // Clear all loaded data
  const clearData = useCallback(() => {
    if (loaderRef.current) {
      loaderRef.current.clear();
      setState(prev => ({
        ...prev,
        memoryUsage: { estimatedMB: 0, chunksLoaded: 0, totalChunks: 0 }
      }));
    }
  }, []);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (autoCleanup && loaderRef.current) {
        loaderRef.current.destroy();
        loaderRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [autoCleanup]);

  return {
    // State
    state,
    isInitialized: isInitializedRef.current,
    
    // Methods
    initialize,
    loadData,
    loadVisibleData,
    clearData,
    getChunkInfo,
    
    // Utilities
    isEnabled: enabled
  };
}

/**
 * Specialized hook for bacterial simulation data
 */
export function useProgressiveBacteriaLoader(
  config: UseProgressiveLoaderConfig = {}
) {
  return useProgressiveLoader<Bacterium>({
    ...config,
    strategy: 'simulation',
    chunkSize: 1000,
    maxMemoryUsage: 150, // 150MB for bacteria data
    prefetchSize: 3
  });
}

/**
 * Specialized hook for simulation history data
 */
export function useProgressiveSimulationLoader(
  config: UseProgressiveLoaderConfig = {}
) {
  return useProgressiveLoader<Simulation>({
    ...config,
    strategy: 'default',
    chunkSize: 50,
    maxMemoryUsage: 100, // 100MB for simulation metadata
    prefetchSize: 2
  });
}

/**
 * Hook for managing progressive loading with virtual scrolling
 */
export function useProgressiveVirtualScroll<T>(
  totalItems: number,
  itemHeight: number,
  containerHeight: number,
  loader: DataLoader<T>,
  config: UseProgressiveLoaderConfig = {}
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [data, setData] = useState<T[]>([]);
  
  const progressive = useProgressiveLoader<T>(config);
  
  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount + 5, totalItems); // +5 for buffer
    
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, totalItems]);

  // Initialize progressive loader
  useEffect(() => {
    if (totalItems > 0) {
      progressive.initialize(totalItems, 2048); // Estimate 2KB per item
    }
  }, [totalItems, progressive]);

  // Load visible data when range changes
  useEffect(() => {
    if (progressive.isInitialized && visibleRange.end > visibleRange.start) {
      progressive.loadVisibleData(visibleRange, loader)
        .then(setData)
        .catch(error => {
          console.error('Failed to load visible data:', error);
        });
    }
  }, [visibleRange, progressive, loader]);

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    // Data and state
    data,
    state: progressive.state,
    visibleRange,
    
    // Scroll handling
    handleScroll,
    scrollTop,
    
    // Progressive loader methods
    clearData: progressive.clearData,
    getChunkInfo: progressive.getChunkInfo
  };
}

export default useProgressiveLoader; 
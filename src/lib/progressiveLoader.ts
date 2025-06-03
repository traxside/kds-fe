"use client";

// Progressive loading configuration
export interface ProgressiveLoadingConfig {
  chunkSize: number;
  prefetchSize: number;
  maxMemoryUsage: number; // MB
  timeWindowSize: number; // generations to keep in memory
  priorityThreshold: number; // priority for loading
}

// Data chunk interface
export interface DataChunk<T> {
  id: string;
  startIndex: number;
  endIndex: number;
  data: T[];
  priority: ChunkPriority;
  lastAccessed: number;
  memorySize: number; // bytes
  isLoading: boolean;
  isLoaded: boolean;
  error?: string;
}

// Priority levels for loading
export enum ChunkPriority {
  CRITICAL = 0,  // Currently visible data
  HIGH = 1,      // Next visible data
  NORMAL = 2,    // Anticipated data
  LOW = 3,       // Background prefetch
  IDLE = 4       // Can be evicted
}

// Loading strategy interface
export interface LoadingStrategy {
  getVisibleRange(scrollPosition: number, viewportSize: number, itemSize: number): { start: number; end: number };
  calculatePriority(chunkIndex: number, visibleRange: { start: number; end: number }): ChunkPriority;
  shouldPrefetch(chunkIndex: number, visibleRange: { start: number; end: number }): boolean;
}

// Memory usage tracking
interface MemoryStats {
  totalChunks: number;
  loadedChunks: number;
  estimatedMemoryUsage: number; // MB
  lastEviction: number;
}

// Progress callback for loading operations
export type ProgressCallback = (loaded: number, total: number, status: string) => void;

/**
 * Progressive Data Loader for large simulation datasets
 * 
 * Handles chunked loading, memory management, and priority-based prefetching
 * to maintain responsive UI with large bacterial population datasets.
 */
export class ProgressiveDataLoader<T> {
  private chunks: Map<string, DataChunk<T>> = new Map();
  private config: ProgressiveLoadingConfig;
  private strategy: LoadingStrategy;
  private memoryStats: MemoryStats;
  private loadingQueue: Set<string> = new Set();
  private evictionTimer?: NodeJS.Timeout;
  
  constructor(config: Partial<ProgressiveLoadingConfig> = {}, strategy?: LoadingStrategy) {
    this.config = {
      chunkSize: 1000,
      prefetchSize: 2,
      maxMemoryUsage: 100, // 100MB default
      timeWindowSize: 50,
      priorityThreshold: ChunkPriority.NORMAL,
      ...config
    };
    
    this.strategy = strategy || new DefaultLoadingStrategy();
    
    this.memoryStats = {
      totalChunks: 0,
      loadedChunks: 0,
      estimatedMemoryUsage: 0,
      lastEviction: Date.now()
    };
    
    // Start memory management timer
    this.startMemoryManagement();
  }

  /**
   * Initialize loader with dataset metadata
   */
  async initialize(totalItems: number, itemSizeEstimate: number = 1024): Promise<void> {
    const totalChunks = Math.ceil(totalItems / this.config.chunkSize);
    
    // Create chunk metadata without loading data
    for (let i = 0; i < totalChunks; i++) {
      const startIndex = i * this.config.chunkSize;
      const endIndex = Math.min(startIndex + this.config.chunkSize, totalItems);
      const chunkId = `chunk_${i}`;
      
      const chunk: DataChunk<T> = {
        id: chunkId,
        startIndex,
        endIndex,
        data: [],
        priority: ChunkPriority.IDLE,
        lastAccessed: 0,
        memorySize: (endIndex - startIndex) * itemSizeEstimate,
        isLoading: false,
        isLoaded: false
      };
      
      this.chunks.set(chunkId, chunk);
    }
    
    this.memoryStats.totalChunks = totalChunks;
  }

  /**
   * Request data for a specific range (triggers progressive loading)
   */
  async requestData(
    startIndex: number, 
    endIndex: number, 
    loader: (start: number, end: number) => Promise<T[]>,
    onProgress?: ProgressCallback
  ): Promise<T[]> {
    const result: T[] = [];
    const chunksToLoad: string[] = [];
    
    // Find chunks that intersect with requested range
    const affectedChunks = this.findChunksInRange(startIndex, endIndex);
    
    onProgress?.(0, affectedChunks.length, "Analyzing required chunks...");
    
    // Check which chunks need loading
    for (const chunkId of affectedChunks) {
      const chunk = this.chunks.get(chunkId)!;
      chunk.lastAccessed = Date.now();
      
      if (!chunk.isLoaded && !chunk.isLoading) {
        chunksToLoad.push(chunkId);
      }
    }
    
    // Load chunks in priority order
    if (chunksToLoad.length > 0) {
      await this.loadChunks(chunksToLoad, loader, onProgress);
    }
    
    // Collect data from loaded chunks
    for (const chunkId of affectedChunks) {
      const chunk = this.chunks.get(chunkId)!;
      if (chunk.isLoaded) {
        // Calculate intersection with requested range
        const intersectionStart = Math.max(startIndex, chunk.startIndex);
        const intersectionEnd = Math.min(endIndex, chunk.endIndex);
        
        if (intersectionStart < intersectionEnd) {
          const localStart = intersectionStart - chunk.startIndex;
          const localEnd = localStart + (intersectionEnd - intersectionStart);
          result.push(...chunk.data.slice(localStart, localEnd));
        }
      }
    }
    
    onProgress?.(affectedChunks.length, affectedChunks.length, "Data loading complete");
    
    return result;
  }

  /**
   * Request visible data and prefetch adjacent chunks
   */
  async requestVisibleData(
    visibleRange: { start: number; end: number },
    loader: (start: number, end: number) => Promise<T[]>,
    onProgress?: ProgressCallback
  ): Promise<T[]> {
    // Update chunk priorities based on visibility
    this.updateChunkPriorities(visibleRange);
    
    // Load visible data first
    const visibleData = await this.requestData(
      visibleRange.start, 
      visibleRange.end, 
      loader, 
      onProgress
    );
    
    // Schedule prefetch in background
    this.schedulePrefetch(visibleRange, loader);
    
    return visibleData;
  }

  /**
   * Prefetch data that will likely be needed soon
   */
  private async schedulePrefetch(
    visibleRange: { start: number; end: number },
    loader: (start: number, end: number) => Promise<T[]>
  ): Promise<void> {
    const prefetchChunks: string[] = [];
    
    // Find chunks to prefetch based on strategy
    for (const [chunkId, chunk] of this.chunks) {
      if (!chunk.isLoaded && !chunk.isLoading) {
        const chunkIndex = this.getChunkIndex(chunkId);
        if (this.strategy.shouldPrefetch(chunkIndex, visibleRange)) {
          prefetchChunks.push(chunkId);
        }
      }
    }
    
    // Limit prefetch to avoid memory issues
    const limitedPrefetch = prefetchChunks
      .slice(0, this.config.prefetchSize)
      .filter(() => this.canAllocateMemory(this.config.chunkSize * 1024)); // Rough estimate
    
    if (limitedPrefetch.length > 0) {
      // Load in background (fire and forget)
      this.loadChunks(limitedPrefetch, loader).catch(error => {
        console.warn("Prefetch failed:", error);
      });
    }
  }

  /**
   * Load specific chunks with progress tracking
   */
  private async loadChunks(
    chunkIds: string[],
    loader: (start: number, end: number) => Promise<T[]>,
    onProgress?: ProgressCallback
  ): Promise<void> {
    let completed = 0;
    
    // Sort by priority
    const sortedChunks = chunkIds
      .map(id => this.chunks.get(id)!)
      .sort((a, b) => a.priority - b.priority)
      .map(chunk => chunk.id);
    
    onProgress?.(0, sortedChunks.length, "Starting chunk loading...");
    
    // Load chunks sequentially to avoid overwhelming the system
    for (const chunkId of sortedChunks) {
      const chunk = this.chunks.get(chunkId)!;
      
      if (chunk.isLoaded || chunk.isLoading) {
        completed++;
        continue;
      }
      
      // Check memory before loading
      if (!this.canAllocateMemory(chunk.memorySize)) {
        await this.evictChunks();
        
        // Check again after eviction
        if (!this.canAllocateMemory(chunk.memorySize)) {
          console.warn(`Cannot load chunk ${chunkId}: insufficient memory`);
          continue;
        }
      }
      
      try {
        chunk.isLoading = true;
        this.loadingQueue.add(chunkId);
        
        onProgress?.(completed, sortedChunks.length, `Loading chunk ${chunk.id}...`);
        
        // Load the actual data
        const data = await loader(chunk.startIndex, chunk.endIndex);
        
        chunk.data = data;
        chunk.isLoaded = true;
        chunk.lastAccessed = Date.now();
        
        // Update memory stats
        this.memoryStats.loadedChunks++;
        this.memoryStats.estimatedMemoryUsage += chunk.memorySize / (1024 * 1024); // Convert to MB
        
      } catch (error) {
        chunk.error = error instanceof Error ? error.message : "Unknown error";
        console.error(`Failed to load chunk ${chunkId}:`, error);
      } finally {
        chunk.isLoading = false;
        this.loadingQueue.delete(chunkId);
        completed++;
        
        onProgress?.(completed, sortedChunks.length, `Loaded chunk ${chunk.id}`);
      }
    }
  }

  /**
   * Update chunk priorities based on current visible range
   */
  private updateChunkPriorities(visibleRange: { start: number; end: number }): void {
    for (const [chunkId, chunk] of this.chunks) {
      const chunkIndex = this.getChunkIndex(chunkId);
      chunk.priority = this.strategy.calculatePriority(chunkIndex, visibleRange);
    }
  }

  /**
   * Find chunks that intersect with given range
   */
  private findChunksInRange(startIndex: number, endIndex: number): string[] {
    const result: string[] = [];
    
    for (const [chunkId, chunk] of this.chunks) {
      if (chunk.startIndex < endIndex && chunk.endIndex > startIndex) {
        result.push(chunkId);
      }
    }
    
    return result;
  }

  /**
   * Get chunk index from chunk ID
   */
  private getChunkIndex(chunkId: string): number {
    return parseInt(chunkId.split('_')[1]);
  }

  /**
   * Check if we can allocate more memory
   */
  private canAllocateMemory(bytes: number): boolean {
    const additionalMB = bytes / (1024 * 1024);
    return (this.memoryStats.estimatedMemoryUsage + additionalMB) < this.config.maxMemoryUsage;
  }

  /**
   * Evict chunks to free memory
   */
  private async evictChunks(): Promise<void> {
    const evictableChunks = Array.from(this.chunks.values())
      .filter(chunk => chunk.isLoaded && !this.loadingQueue.has(chunk.id))
      .filter(chunk => chunk.priority >= this.config.priorityThreshold)
      .sort((a, b) => {
        // Sort by priority (higher first) then by last accessed (older first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        return a.lastAccessed - b.lastAccessed;
      });
    
    // Evict enough chunks to free 25% of max memory
    const targetFree = this.config.maxMemoryUsage * 0.25;
    let freedMemory = 0;
    let evicted = 0;
    
    for (const chunk of evictableChunks) {
      if (freedMemory >= targetFree) break;
      
      // Evict the chunk
      chunk.data = [];
      chunk.isLoaded = false;
      chunk.error = undefined;
      
      freedMemory += chunk.memorySize / (1024 * 1024);
      this.memoryStats.loadedChunks--;
      this.memoryStats.estimatedMemoryUsage -= chunk.memorySize / (1024 * 1024);
      evicted++;
    }
    
    this.memoryStats.lastEviction = Date.now();
    
    if (evicted > 0) {
      console.log(`Evicted ${evicted} chunks, freed ${freedMemory.toFixed(2)}MB`);
    }
  }

  /**
   * Start memory management background process
   */
  private startMemoryManagement(): void {
    this.evictionTimer = setInterval(() => {
      if (this.memoryStats.estimatedMemoryUsage > this.config.maxMemoryUsage * 0.8) {
        this.evictChunks().catch(error => {
          console.error("Memory eviction failed:", error);
        });
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get current memory statistics
   */
  getMemoryStats(): MemoryStats {
    return { ...this.memoryStats };
  }

  /**
   * Get chunk information for debugging
   */
  getChunkInfo(): Array<{ id: string; loaded: boolean; priority: ChunkPriority; size: number }> {
    return Array.from(this.chunks.values()).map(chunk => ({
      id: chunk.id,
      loaded: chunk.isLoaded,
      priority: chunk.priority,
      size: chunk.data.length
    }));
  }

  /**
   * Clear all data and reset loader
   */
  clear(): void {
    if (this.evictionTimer) {
      clearInterval(this.evictionTimer);
    }
    
    this.chunks.clear();
    this.loadingQueue.clear();
    this.memoryStats = {
      totalChunks: 0,
      loadedChunks: 0,
      estimatedMemoryUsage: 0,
      lastEviction: Date.now()
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clear();
  }
}

/**
 * Default loading strategy implementation
 */
export class DefaultLoadingStrategy implements LoadingStrategy {
  getVisibleRange(scrollPosition: number, viewportSize: number, itemSize: number): { start: number; end: number } {
    const start = Math.floor(scrollPosition / itemSize);
    const end = Math.ceil((scrollPosition + viewportSize) / itemSize);
    return { start, end };
  }

  calculatePriority(chunkIndex: number, visibleRange: { start: number; end: number }): ChunkPriority {
    const chunkStart = chunkIndex * 1000; // Assuming default chunk size
    const chunkEnd = chunkStart + 1000;
    
    // Check if chunk intersects with visible range
    if (chunkStart < visibleRange.end && chunkEnd > visibleRange.start) {
      return ChunkPriority.CRITICAL;
    }
    
    // Check if chunk is adjacent to visible range
    const distance = Math.min(
      Math.abs(chunkStart - visibleRange.end),
      Math.abs(chunkEnd - visibleRange.start)
    );
    
    if (distance <= 1000) return ChunkPriority.HIGH;
    if (distance <= 5000) return ChunkPriority.NORMAL;
    if (distance <= 10000) return ChunkPriority.LOW;
    
    return ChunkPriority.IDLE;
  }

  shouldPrefetch(chunkIndex: number, visibleRange: { start: number; end: number }): boolean {
    const priority = this.calculatePriority(chunkIndex, visibleRange);
    return priority <= ChunkPriority.NORMAL;
  }
}

/**
 * Simulation-specific loading strategy
 */
export class SimulationLoadingStrategy extends DefaultLoadingStrategy {
  constructor(private chunkSize: number = 1000) {
    super();
  }

  calculatePriority(chunkIndex: number, visibleRange: { start: number; end: number }): ChunkPriority {
    const chunkStart = chunkIndex * this.chunkSize;
    const chunkEnd = chunkStart + this.chunkSize;
    
    // For simulations, prioritize recent generations higher
    const isRecent = chunkIndex >= Math.max(0, Math.floor(visibleRange.end / this.chunkSize) - 5);
    
    if (chunkStart < visibleRange.end && chunkEnd > visibleRange.start) {
      return ChunkPriority.CRITICAL;
    }
    
    if (isRecent) {
      return ChunkPriority.HIGH;
    }
    
    return super.calculatePriority(chunkIndex, visibleRange);
  }
}

export default ProgressiveDataLoader; 
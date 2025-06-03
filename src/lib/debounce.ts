/**
 * @fileoverview Debounce and throttle utilities for performance optimization
 * 
 * Provides comprehensive utilities for:
 * - Basic debouncing and throttling
 * - Batched updates for multiple rapid changes
 * - Priority-based update scheduling
 * - Adaptive timing based on system performance
 * 
 * @author Bacteria Simulation Team
 * @since 1.0.0
 */

export type DebounceFunction<T extends (...args: any[]) => any> = T & {
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
};

export type ThrottleFunction<T extends (...args: any[]) => any> = T & {
  cancel: () => void;
  flush: () => void;
  pending: () => boolean;
};

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
    maxWait?: number;
  } = {}
): DebounceFunction<T> {
  let lastArgs: Parameters<T> | undefined;
  let lastThis: any;
  let maxTimeoutId: NodeJS.Timeout | undefined;
  let result: ReturnType<T>;
  let timerId: NodeJS.Timeout | undefined;
  let lastCallTime: number | undefined;
  let lastInvokeTime = 0;
  let leading = false;
  let maxing = false;
  let trailing = true;

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }

  wait = +wait || 0;
  if (options && typeof options === 'object') {
    leading = !!options.leading;
    maxing = 'maxWait' in options;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  function invokeFunc(time: number) {
    const args = lastArgs!;
    const thisArg = lastThis;

    lastArgs = lastThis = undefined;
    lastInvokeTime = time;
    result = func.apply(thisArg, args);
    return result;
  }

  function leadingEdge(time: number) {
    lastInvokeTime = time;
    timerId = setTimeout(timerExpired, wait);
    return leading ? invokeFunc(time) : result;
  }

  function remainingWait(time: number) {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;
    const timeWaiting = wait - timeSinceLastCall;

    return maxing
      ? Math.min(timeWaiting, options.maxWait! - timeSinceLastInvoke)
      : timeWaiting;
  }

  function shouldInvoke(time: number) {
    const timeSinceLastCall = time - lastCallTime!;
    const timeSinceLastInvoke = time - lastInvokeTime;

    return (
      lastCallTime === undefined ||
      timeSinceLastCall >= wait ||
      timeSinceLastCall < 0 ||
      (maxing && timeSinceLastInvoke >= options.maxWait!)
    );
  }

  function timerExpired() {
    const time = Date.now();
    if (shouldInvoke(time)) {
      return trailingEdge(time);
    }
    timerId = setTimeout(timerExpired, remainingWait(time));
  }

  function trailingEdge(time: number) {
    timerId = undefined;

    if (trailing && lastArgs) {
      return invokeFunc(time);
    }
    lastArgs = lastThis = undefined;
    return result;
  }

  function cancel() {
    if (timerId !== undefined) {
      clearTimeout(timerId);
    }
    if (maxTimeoutId !== undefined) {
      clearTimeout(maxTimeoutId);
    }
    lastInvokeTime = 0;
    lastArgs = lastCallTime = lastThis = timerId = undefined;
  }

  function flush() {
    return timerId === undefined ? result : trailingEdge(Date.now());
  }

  function pending() {
    return timerId !== undefined;
  }

  function debounced(this: any, ...args: Parameters<T>): ReturnType<T> {
    const time = Date.now();
    const isInvoking = shouldInvoke(time);

    lastArgs = args;
    lastThis = this;
    lastCallTime = time;

    if (isInvoking) {
      if (timerId === undefined) {
        return leadingEdge(lastCallTime);
      }
      if (maxing) {
        clearTimeout(timerId);
        timerId = setTimeout(timerExpired, wait);
        return invokeFunc(lastCallTime);
      }
    }
    if (timerId === undefined) {
      timerId = setTimeout(timerExpired, wait);
    }
    return result;
  }

  debounced.cancel = cancel;
  debounced.flush = flush;
  debounced.pending = pending;

  return debounced as unknown as DebounceFunction<T>;
}

/**
 * Creates a throttled function that only invokes func at most once per every wait milliseconds.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options: {
    leading?: boolean;
    trailing?: boolean;
  } = {}
): ThrottleFunction<T> {
  let leading = true;
  let trailing = true;

  if (typeof func !== 'function') {
    throw new TypeError('Expected a function');
  }

  if (options && typeof options === 'object') {
    leading = 'leading' in options ? !!options.leading : leading;
    trailing = 'trailing' in options ? !!options.trailing : trailing;
  }

  return debounce(func, wait, {
    leading,
    trailing,
    maxWait: wait,
  }) as ThrottleFunction<T>;
}

/**
 * Priority levels for update scheduling
 */
export enum UpdatePriority {
  IMMEDIATE = 0,    // Critical updates (errors, resistance emergence)
  HIGH = 1,         // Important updates (generation changes)
  NORMAL = 2,       // Regular updates (statistics)
  LOW = 3,          // Background updates (minor UI changes)
}

/**
 * Update item for batching system
 */
export interface UpdateItem<T = any> {
  id: string;
  priority: UpdatePriority;
  callback: () => T;
  timestamp: number;
  dependencies?: string[];
}

/**
 * Batched update scheduler that groups multiple rapid updates
 */
export class UpdateScheduler {
  private pendingUpdates = new Map<string, UpdateItem>();
  private scheduledFlush: NodeJS.Timeout | null = null;
  private readonly flushDelay: number;
  private readonly maxBatchSize: number;
  private readonly performanceMonitor: {
    averageFlushTime: number;
    flushCount: number;
  } = {
    averageFlushTime: 0,
    flushCount: 0,
  };

  constructor(
    flushDelay: number = 16, // ~60fps
    maxBatchSize: number = 50
  ) {
    this.flushDelay = flushDelay;
    this.maxBatchSize = maxBatchSize;
  }

  /**
   * Schedule an update to be batched with other updates
   */
  schedule<T>(update: UpdateItem<T>): void {
    this.pendingUpdates.set(update.id, update);

    // Force flush for immediate priority updates
    if (update.priority === UpdatePriority.IMMEDIATE) {
      this.flush();
      return;
    }

    // Force flush if batch size limit reached
    if (this.pendingUpdates.size >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // Schedule a flush if none is pending
    if (!this.scheduledFlush) {
      this.scheduledFlush = setTimeout(() => {
        this.flush();
      }, this.flushDelay);
    }
  }

  /**
   * Immediately flush all pending updates
   */
  flush(): void {
    if (this.scheduledFlush) {
      clearTimeout(this.scheduledFlush);
      this.scheduledFlush = null;
    }

    if (this.pendingUpdates.size === 0) {
      return;
    }

    const startTime = performance.now();

    // Sort updates by priority and timestamp
    const updates = Array.from(this.pendingUpdates.values()).sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower priority number = higher importance
      }
      return a.timestamp - b.timestamp; // Earlier timestamp first
    });

    // Process dependency-resolved updates
    const processed = new Set<string>();
    const processedUpdates: any[] = [];

    const processUpdate = (update: UpdateItem) => {
      if (processed.has(update.id)) {
        return;
      }

      // Check if dependencies are satisfied
      if (update.dependencies) {
        const unmetDependencies = update.dependencies.filter(
          dep => !processed.has(dep)
        );
        if (unmetDependencies.length > 0) {
          return; // Skip for now, will retry in next iteration
        }
      }

      try {
        const result = update.callback();
        processedUpdates.push(result);
        processed.add(update.id);
      } catch (error) {
        console.error(`Update ${update.id} failed:`, error);
        processed.add(update.id); // Mark as processed to avoid infinite retry
      }
    };

    // Process updates in multiple passes to handle dependencies
    let lastProcessedCount = 0;
    let maxIterations = 10; // Prevent infinite loops

    while (processed.size < updates.length && maxIterations > 0) {
      const currentProcessedCount = processed.size;
      
      updates.forEach(processUpdate);
      
      // If no progress was made, break to avoid infinite loop
      if (processed.size === lastProcessedCount) {
        console.warn('Circular dependency detected in update scheduler');
        break;
      }
      
      lastProcessedCount = currentProcessedCount;
      maxIterations--;
    }

    // Clear processed updates
    processed.forEach(id => {
      this.pendingUpdates.delete(id);
    });

    // Update performance metrics
    const flushTime = performance.now() - startTime;
    this.performanceMonitor.flushCount++;
    this.performanceMonitor.averageFlushTime = 
      (this.performanceMonitor.averageFlushTime * (this.performanceMonitor.flushCount - 1) + flushTime) / 
      this.performanceMonitor.flushCount;

    // Log performance if flush takes too long
    if (flushTime > 16) { // More than one frame
      console.warn(`Slow update batch: ${flushTime.toFixed(2)}ms for ${processed.size} updates`);
    }
  }

  /**
   * Cancel a pending update
   */
  cancel(id: string): boolean {
    return this.pendingUpdates.delete(id);
  }

  /**
   * Clear all pending updates
   */
  clear(): void {
    if (this.scheduledFlush) {
      clearTimeout(this.scheduledFlush);
      this.scheduledFlush = null;
    }
    this.pendingUpdates.clear();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    return {
      ...this.performanceMonitor,
      pendingUpdates: this.pendingUpdates.size,
      isFlushScheduled: this.scheduledFlush !== null,
    };
  }
}

/**
 * Adaptive debounce that adjusts timing based on system performance
 */
export function adaptiveDebounce<T extends (...args: any[]) => any>(
  func: T,
  baseWait: number,
  options: {
    minWait?: number;
    maxWait?: number;
    performanceThreshold?: number; // ms - if function takes longer, increase wait time
  } = {}
): DebounceFunction<T> {
  const { 
    minWait = baseWait / 2, 
    maxWait = baseWait * 3, 
    performanceThreshold = 16 
  } = options;

  let currentWait = baseWait;
  let performanceHistory: number[] = [];
  const maxHistorySize = 10;

  const adaptiveFunc = function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const startTime = performance.now();
    
    try {
      const result = func.apply(this, args);
      
      // Measure execution time
      const executionTime = performance.now() - startTime;
      
      // Update performance history
      performanceHistory.push(executionTime);
      if (performanceHistory.length > maxHistorySize) {
        performanceHistory.shift();
      }
      
      // Calculate average execution time
      const avgExecutionTime = performanceHistory.reduce((a, b) => a + b, 0) / performanceHistory.length;
      
      // Adjust wait time based on performance
      if (avgExecutionTime > performanceThreshold) {
        currentWait = Math.min(maxWait, currentWait * 1.2);
      } else if (avgExecutionTime < performanceThreshold / 2) {
        currentWait = Math.max(minWait, currentWait * 0.9);
      }
      
      return result;
    } catch (error) {
      // On error, increase wait time to reduce frequency of failed calls
      currentWait = Math.min(maxWait, currentWait * 1.5);
      throw error;
    }
  };

  // Create debounced function with dynamic wait time
  let debouncedFunc = debounce(adaptiveFunc, currentWait);

  // Recreate debounced function when wait time changes significantly
  const recreateDebounced = debounce(() => {
    const oldPending = debouncedFunc.pending();
    if (!oldPending) {
      debouncedFunc = debounce(adaptiveFunc, currentWait);
    }
  }, 100);

  const wrapper = (function(this: any, ...args: Parameters<T>): ReturnType<T> {
    recreateDebounced();
    return debouncedFunc.apply(this, args);
  }) as DebounceFunction<T>;

  wrapper.cancel = () => debouncedFunc.cancel();
  wrapper.flush = () => debouncedFunc.flush();
  wrapper.pending = () => debouncedFunc.pending();

  return wrapper;
}

/**
 * Global update scheduler instance for application-wide batching
 */
export const globalUpdateScheduler = new UpdateScheduler();

/**
 * Utility functions for common debouncing patterns
 */
export const debouncedUtils = {
  /**
   * Debounced state setter for React components
   */
  createDebouncedSetter: <T>(
    setter: (value: T) => void,
    delay: number = 300
  ) => {
    return debounce(setter, delay, { leading: false, trailing: true });
  },

  /**
   * Throttled event handler for high-frequency events
   */
  createThrottledHandler: <T extends (...args: any[]) => any>(
    handler: T,
    delay: number = 100
  ) => {
    return throttle(handler, delay, { leading: true, trailing: true });
  },

  /**
   * Debounced API caller with error handling
   */
  createDebouncedApiCall: <T extends (...args: any[]) => Promise<any>>(
    apiCall: T,
    delay: number = 500
  ) => {
    return debounce(async (...args: Parameters<T>) => {
      try {
        return await apiCall(...args);
      } catch (error) {
        console.error('Debounced API call failed:', error);
        throw error;
      }
    }, delay, { leading: false, trailing: true });
  },
}; 
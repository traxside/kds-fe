/**
 * @fileoverview Performance Monitor Component
 * 
 * Development component for monitoring debouncing and throttling effectiveness.
 * Shows real-time metrics about update frequencies, performance gains, and
 * system resource usage.
 * 
 * @author Bacteria Simulation Team  
 * @since 1.0.0
 */

"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  LuActivity, 
  LuClock, 
  LuCpu, 
  LuChartBar, 
  LuRefreshCw,
  LuTrendingUp,
  LuTrendingDown,
  LuMinus,
  LuZap,
  LuTriangleAlert,
  LuSettings,
} from 'react-icons/lu';
import { useSimulationContext } from '@/context/SimulationContext';
import { globalUpdateScheduler } from '@/lib/debounce';

interface PerformanceMetrics {
  updateFrequency: number;
  averageUpdateTime: number;
  totalUpdates: number;
  droppedUpdates: number;
  memoryUsage: number;
  cpuUsage: number;
  batchEfficiency: number;
}

interface PerformanceMonitorProps {
  showAdvancedMetrics?: boolean;
  refreshInterval?: number;
  className?: string;
}

export default function PerformanceMonitor({
  showAdvancedMetrics = false,
  refreshInterval = 1000,
  className = "",
}: PerformanceMonitorProps) {
  const { simulation, isSimulationRunning, isConnected } = useSimulationContext();
  
  // Mock performance metrics for now - these could be enhanced later
  const refreshCount = 0;
  const currentRefreshInterval = refreshInterval;
  const averageRefreshTime = Math.random() * 100; // Mock random response time
  const lastFetchTime = averageRefreshTime;
  const totalFetches = refreshCount;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    updateFrequency: 0,
    averageUpdateTime: 0,
    totalUpdates: 0,
    droppedUpdates: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    batchEfficiency: 0,
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [performanceHistory, setPerformanceHistory] = useState<number[]>([]);

  // Calculate performance metrics
  const calculateMetrics = useCallback(() => {
    const schedulerStats = globalUpdateScheduler.getPerformanceStats();
    
    // Calculate update frequency (updates per second)
    const updateFrequency = refreshCount > 0 && currentRefreshInterval > 0 
      ? 1000 / currentRefreshInterval 
      : 0;

    // Calculate batch efficiency (percentage of updates batched vs immediate)
    const batchEfficiency = schedulerStats.flushCount > 0
      ? Math.round((schedulerStats.flushCount / Math.max(totalFetches, 1)) * 100)
      : 0;

    // Estimate memory usage (rough calculation based on performance API)
    const memoryUsage = (performance as any)?.memory?.usedJSHeapSize 
      ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
      : 0;

    // Track performance history for CPU usage estimation
    setPerformanceHistory(prev => {
      const newHistory = [...prev, averageRefreshTime];
      return newHistory.slice(-10); // Keep last 10 measurements
    });

    // Estimate CPU usage based on performance trends
    const cpuUsage = performanceHistory.length > 1
      ? Math.min(100, Math.round((averageRefreshTime / 16) * 100)) // 16ms = 60fps baseline
      : 0;

    const newMetrics: PerformanceMetrics = {
      updateFrequency,
      averageUpdateTime: averageRefreshTime,
      totalUpdates: totalFetches,
      droppedUpdates: 0, // Would need more sophisticated tracking
      memoryUsage,
      cpuUsage,
      batchEfficiency,
    };

    setMetrics(newMetrics);
  }, [
    refreshCount, 
    currentRefreshInterval, 
    averageRefreshTime, 
    totalFetches, 
    performanceHistory
  ]);

  // Auto-refresh metrics
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(calculateMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, calculateMetrics]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  // Format time in milliseconds
  const formatTime = (ms: number): string => {
    if (ms < 1) return `${(ms * 1000).toFixed(0)}μs`;
    if (ms < 1000) return `${ms.toFixed(1)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Format frequency
  const formatFrequency = (hz: number): string => {
    if (hz < 1) return `${(hz * 1000).toFixed(0)}mHz`;
    return `${hz.toFixed(1)}Hz`;
  };

  // Get performance status color
  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return "text-green-600";
    if (value <= thresholds[1]) return "text-yellow-600";
    return "text-red-600";
  };

  // Get trend icon
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return <LuTrendingUp className="h-3 w-3 text-red-500" />;
    if (current < previous) return <LuTrendingDown className="h-3 w-3 text-green-500" />;
    return <LuMinus className="h-3 w-3 text-gray-500" />;
  };

  return (
    <Card className={`${className} transition-all duration-200`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <LuActivity className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Performance Monitor</CardTitle>
            {isSimulationRunning && (
              <Badge variant="outline" className="text-green-600 border-green-200">
                Live
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
            >
              <LuRefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              <LuSettings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <LuClock className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Update Rate</span>
            </div>
            <div className={`text-lg font-bold ${getPerformanceColor(metrics.updateFrequency, [1, 5])}`}>
              {formatFrequency(metrics.updateFrequency)}
            </div>
            <div className="text-xs text-gray-500">
              Interval: {currentRefreshInterval}ms
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <LuChartBar className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Response Time</span>
            </div>
            <div className={`text-lg font-bold ${getPerformanceColor(metrics.averageUpdateTime, [50, 200])}`}>
              {formatTime(metrics.averageUpdateTime)}
            </div>
            <div className="text-xs text-gray-500">
              Last: {formatTime(lastFetchTime)}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <LuActivity className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Total Updates</span>
            </div>
            <div className="text-lg font-bold text-blue-600">
              {metrics.totalUpdates.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">
              Refresh: {refreshCount}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <LuCpu className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium">Batch Efficiency</span>
            </div>
            <div className={`text-lg font-bold ${getPerformanceColor(100 - metrics.batchEfficiency, [20, 50])}`}>
              {metrics.batchEfficiency}%
            </div>
            <div className="text-xs text-gray-500">
              Optimization
            </div>
          </div>
        </div>

        {/* Advanced Metrics (when expanded) */}
        {isExpanded && (
          <>
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Advanced Metrics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {showAdvancedMetrics && (
                  <>
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <div className={`text-lg font-bold ${getPerformanceColor(metrics.memoryUsage, [50, 100])}`}>
                        {metrics.memoryUsage} MB
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-sm font-medium">CPU Load</span>
                      <div className={`text-lg font-bold ${getPerformanceColor(metrics.cpuUsage, [30, 70])}`}>
                        {metrics.cpuUsage}%
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <span className="text-sm font-medium">Scheduler Stats</span>
                  <div className="text-sm space-y-1">
                    <div>Pending: {globalUpdateScheduler.getPerformanceStats().pendingUpdates}</div>
                    <div>Avg Flush: {globalUpdateScheduler.getPerformanceStats().averageFlushTime.toFixed(1)}ms</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Performance History Chart (simplified) */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">Performance Trend</h4>
              <div className="h-16 flex items-end space-x-1">
                {performanceHistory.map((time, index) => {
                  const height = Math.max(4, Math.min(64, (time / 100) * 64));
                  const color = time > 100 ? 'bg-red-500' : time > 50 ? 'bg-yellow-500' : 'bg-green-500';
                  return (
                    <div
                      key={index}
                      className={`w-2 ${color} rounded-sm`}
                      style={{ height: `${height}px` }}
                      title={`${time.toFixed(1)}ms`}
                    />
                  );
                })}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Response time history (last 10 updates)
              </div>
            </div>

            {/* Controls */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                  />
                  <Label htmlFor="auto-refresh" className="text-sm">
                    Auto-refresh metrics
                  </Label>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPerformanceHistory([])}
                >
                  Clear History
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Performance Status Summary */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Performance</span>
            <div className="flex items-center space-x-2">
              {metrics.averageUpdateTime <= 50 && metrics.batchEfficiency >= 70 ? (
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Excellent
                </Badge>
              ) : metrics.averageUpdateTime <= 100 && metrics.batchEfficiency >= 50 ? (
                <Badge variant="outline" className="text-yellow-600 border-yellow-200">
                  Good
                </Badge>
              ) : (
                <Badge variant="outline" className="text-red-600 border-red-200">
                  Needs Optimization
                </Badge>
              )}
            </div>
          </div>
          
          {metrics.averageUpdateTime > 100 && (
            <div className="text-xs text-orange-600 mt-1">
              Consider increasing refresh intervals or reducing update frequency
            </div>
          )}
          
          {metrics.batchEfficiency < 50 && (
            <div className="text-xs text-orange-600 mt-1">
              Low batching efficiency - check update patterns
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 
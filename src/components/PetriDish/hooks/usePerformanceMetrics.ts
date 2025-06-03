import { useState, useCallback, useRef } from "react";
import { PerformanceMetrics, OptimalParameters } from "../types";

export function usePerformanceMetrics(
  bacteriaLength: number,
  isSimulationRunning: boolean,
  enableAdaptivePerformance: boolean
) {
  const frameTimeRef = useRef<number>(Date.now());
  const renderCountRef = useRef<number>(0);
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    frameRate: 60,
    lastFrameTime: 0,
    avgRenderTime: 16,
    zoomLevel: 1,
    nodeCount: 0,
  });

  const updatePerformanceMetrics = useCallback(() => {
    const now = Date.now();
    const timeSinceLastFrame = now - frameTimeRef.current;
    const currentFrameRate = timeSinceLastFrame > 0 ? 1000 / timeSinceLastFrame : 60;
    
    renderCountRef.current++;
    frameTimeRef.current = now;

    if (renderCountRef.current % 10 === 0 && enableAdaptivePerformance) {
      setPerformanceMetrics(prev => ({
        ...prev,
        frameRate: currentFrameRate,
        lastFrameTime: now,
        avgRenderTime: timeSinceLastFrame,
        nodeCount: bacteriaLength,
      }));
    }
  }, [bacteriaLength, enableAdaptivePerformance]);

  const handleZoom = useCallback((transform: any) => {
    if (enableAdaptivePerformance) {
      setPerformanceMetrics(prev => ({
        ...prev,
        zoomLevel: transform.k || 1,
      }));
    }
  }, [enableAdaptivePerformance]);

  const getOptimalParameters = useCallback((
    nodeCount: number,
    frameRate: number,
    zoomLevel: number
  ): OptimalParameters => {
    // Base configuration similar to D3's disjoint force-directed graph example
    let chargeStrength = -30;
    let forceXStrength = 0.1;
    let forceYStrength = 0.1;
    let alphaDecay = 0.0228; // D3's default
    let velocityDecay = 0.4;
    let linkStrength = 0.1;

    // Adaptive scaling based on node count
    if (nodeCount > 2000) {
      chargeStrength = -15;
      forceXStrength = 0.05;
      forceYStrength = 0.05;
      alphaDecay = 0.05;
      velocityDecay = 0.6;
      linkStrength = 0.05;
    } else if (nodeCount > 1000) {
      chargeStrength = -20;
      forceXStrength = 0.07;
      forceYStrength = 0.07;
      alphaDecay = 0.035;
      velocityDecay = 0.5;
      linkStrength = 0.07;
    } else if (nodeCount > 500) {
      chargeStrength = -25;
      forceXStrength = 0.08;
      forceYStrength = 0.08;
      alphaDecay = 0.03;
      velocityDecay = 0.45;
      linkStrength = 0.08;
    }

    // Performance-based adjustments
    if (frameRate < 30) {
      chargeStrength *= 0.7;
      forceXStrength *= 0.8;
      forceYStrength *= 0.8;
      alphaDecay *= 1.5;
      velocityDecay *= 1.3;
    } else if (frameRate < 45) {
      chargeStrength *= 0.85;
      forceXStrength *= 0.9;
      forceYStrength *= 0.9;
      alphaDecay *= 1.2;
      velocityDecay *= 1.1;
    }

    // Zoom-based adjustments
    if (zoomLevel > 2) {
      chargeStrength *= 1.1;
      alphaDecay *= 0.9;
      velocityDecay *= 0.95;
    } else if (zoomLevel < 0.5) {
      chargeStrength *= 0.9;
      alphaDecay *= 1.1;
      velocityDecay *= 1.05;
    }

    return {
      chargeStrength,
      forceXStrength,
      forceYStrength,
      alphaDecay,
      velocityDecay,
      linkStrength,
    };
  }, []);

  return {
    performanceMetrics,
    updatePerformanceMetrics,
    handleZoom,
    getOptimalParameters,
  };
} 
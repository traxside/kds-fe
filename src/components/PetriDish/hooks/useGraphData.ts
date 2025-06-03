import React, { useState } from "react";
import { Bacterium } from "@/types/simulation";
import { CullingStats } from "../types";
import { createGraphNodes, createValidatedLinks, validateLinks } from "../utils";
import { CachedNodeCuller, PerformanceMonitor } from "@/lib/performance";

const nodeCuller = new CachedNodeCuller();
const performanceMonitor = new PerformanceMonitor();

export function useGraphData(
  bacteria: Bacterium[],
  maxDisplayNodes: number,
  enableSpatialSampling: boolean
) {
  const [cullingStats, setCullingStats] = useState<CullingStats | null>(null);

  const graphData = React.useMemo(() => {
    const endCullingTimer = performanceMonitor.startTiming("node-culling");

    let displayBacteria: Bacterium[];

    if (bacteria.length > maxDisplayNodes) {
      displayBacteria = nodeCuller.getCulledNodes(
        bacteria,
        maxDisplayNodes,
        enableSpatialSampling
      );

      setCullingStats({
        originalCount: bacteria.length,
        displayCount: displayBacteria.length,
        cullingRatio: (bacteria.length - displayBacteria.length) / bacteria.length,
      });
    } else {
      displayBacteria = bacteria;
      setCullingStats(null);
    }

    const nodes = createGraphNodes(displayBacteria);
    const links = createValidatedLinks(displayBacteria);
    const validatedLinks = validateLinks(links, nodes);

    endCullingTimer();

    return {
      nodes,
      links: validatedLinks,
    };
  }, [bacteria, maxDisplayNodes, enableSpatialSampling]);

  return {
    graphData,
    cullingStats,
  };
} 
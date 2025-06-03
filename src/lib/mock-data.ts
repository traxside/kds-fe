import { Bacterium } from "@/types/simulation";
import { SimulationEvent } from "@/components/VirtualizedSimulationHistory";

/**
 * Generate large dataset of bacteria for testing virtualization
 */
export function generateLargeBacteriaDataset(count: number = 10000): Bacterium[] {
  const bacteria: Bacterium[] = [];
  const petriSize = 600;
  const center = { x: petriSize / 2, y: petriSize / 2 };
  
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * 2 * Math.PI;
    const radius = Math.random() * (petriSize / 2 - 30);
    const x = center.x + radius * Math.cos(angle);
    const y = center.y + radius * Math.sin(angle);
    const isResistant = Math.random() < 0.25; // 25% resistance rate
    
    const bacterium: Bacterium = {
      id: `bacteria-${i.toString().padStart(6, '0')}`,
      x,
      y,
      isResistant,
      fitness: 0.3 + Math.random() * 0.7, // Fitness between 0.3 and 1.0
      age: Math.floor(Math.random() * 20), // Age 0-19
      generation: Math.floor(Math.random() * 50), // Generation 0-49
      parentId: i > 0 ? `bacteria-${Math.floor(Math.random() * i).toString().padStart(6, '0')}` : undefined,
      color: isResistant ? "#ef4444" : "#22c55e",
      size: 2 + Math.random() * 4, // Size 2-6
    };
    
    bacteria.push(bacterium);
  }
  
  return bacteria;
}

/**
 * Generate simulation events for testing history virtualization
 */
export function generateSimulationEvents(count: number = 5000): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const eventTypes: SimulationEvent['type'][] = [
    'population_change',
    'resistance_emergence', 
    'mutation_event',
    'antibiotic_applied',
    'milestone'
  ];
  const severityLevels: SimulationEvent['severity'][] = ['low', 'medium', 'high', 'critical'];
  
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - count); // Events over the last 'count' hours
  
  for (let i = 0; i < count; i++) {
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    const severity = severityLevels[Math.floor(Math.random() * severityLevels.length)];
    const generation = Math.floor(i / 10); // Roughly 10 events per generation
    
    const timestamp = new Date(startDate.getTime() + (i * 60 * 60 * 1000)); // One event per hour
    
    const event: SimulationEvent = {
      id: `event-${i.toString().padStart(6, '0')}`,
      generation,
      timestamp,
      type,
      severity,
      title: generateEventTitle(type, generation),
      description: generateEventDescription(type, generation),
      data: generateEventData(type),
    };
    
    events.push(event);
  }
  
  return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

function generateEventTitle(type: SimulationEvent['type'], generation: number): string {
  switch (type) {
    case 'population_change':
      return `Population ${Math.random() > 0.5 ? 'Growth' : 'Decline'} Detected`;
    case 'resistance_emergence':
      return `New Resistance Strain Emerged`;
    case 'mutation_event':
      return `Mutation Event Recorded`;
    case 'antibiotic_applied':
      return `Antibiotic Treatment Applied`;
    case 'milestone':
      return `Generation ${generation} Milestone Reached`;
    default:
      return `Unknown Event Type`;
  }
}

function generateEventDescription(type: SimulationEvent['type'], generation: number): string {
  switch (type) {
    case 'population_change':
      return `Significant population change observed in generation ${generation}. Environmental factors may be influencing bacterial growth patterns.`;
    case 'resistance_emergence':
      return `A new antibiotic-resistant strain has been detected in the population. This may impact treatment effectiveness.`;
    case 'mutation_event':
      return `Genetic mutations have been observed in multiple bacteria. Monitoring for potential resistance development.`;
    case 'antibiotic_applied':
      return `Antibiotic treatment has been administered to the bacterial population. Observing survival and adaptation responses.`;
    case 'milestone':
      return `Generation ${generation} has been completed. Population characteristics and evolutionary progress recorded.`;
    default:
      return `Event details are being analyzed for generation ${generation}.`;
  }
}

function generateEventData(type: SimulationEvent['type']): SimulationEvent['data'] {
  const data: SimulationEvent['data'] = {};
  
  switch (type) {
    case 'population_change':
      data.populationChange = Math.floor((Math.random() - 0.5) * 1000); // -500 to +500
      data.previousValue = Math.floor(Math.random() * 5000) + 1000;
      data.newValue = data.previousValue + data.populationChange;
      break;
    case 'resistance_emergence':
      data.resistanceRatio = Math.random() * 0.5 + 0.1; // 10% to 60%
      data.mutationCount = Math.floor(Math.random() * 20) + 1;
      break;
    case 'mutation_event':
      data.mutationCount = Math.floor(Math.random() * 50) + 5;
      break;
    case 'antibiotic_applied':
      data.antibioticLevel = Math.random() * 0.8 + 0.1; // 10% to 90%
      data.populationChange = -Math.floor(Math.random() * 200); // Population decline
      break;
    case 'milestone':
      data.resistanceRatio = Math.random() * 0.4 + 0.05; // 5% to 45%
      data.populationChange = Math.floor(Math.random() * 500) + 100;
      break;
  }
  
  return data;
}

/**
 * Generate sample tabular data for general virtualized table testing
 */
export interface SampleDataRow {
  id: string;
  name: string;
  value: number;
  category: string;
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  description: string;
}

export function generateSampleTableData(count: number = 10000): SampleDataRow[] {
  const categories = ['Biology', 'Chemistry', 'Physics', 'Medicine', 'Research'];
  const statuses: SampleDataRow['status'][] = ['active', 'inactive', 'pending'];
  const data: SampleDataRow[] = [];
  
  for (let i = 0; i < count; i++) {
    const row: SampleDataRow = {
      id: `row-${i.toString().padStart(6, '0')}`,
      name: `Sample Item ${i + 1}`,
      value: Math.random() * 1000,
      category: categories[Math.floor(Math.random() * categories.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      description: `This is a sample description for item ${i + 1}. It contains some test data for virtualization testing.`,
    };
    
    data.push(row);
  }
  
  return data;
}

/**
 * Performance testing utilities
 */
export function measureVirtualizationPerformance<T>(
  data: T[],
  virtualizedRenderer: () => void,
  nonVirtualizedRenderer: () => void
) {
  console.log(`🚀 Testing virtualization performance with ${data.length} items`);
  
  // Measure virtualized performance
  const virtualizedStart = performance.now();
  virtualizedRenderer();
  const virtualizedEnd = performance.now();
  const virtualizedTime = virtualizedEnd - virtualizedStart;
  
  // Measure non-virtualized performance (only for smaller datasets)
  let nonVirtualizedTime = 0;
  if (data.length <= 1000) {
    const nonVirtualizedStart = performance.now();
    nonVirtualizedRenderer();
    const nonVirtualizedEnd = performance.now();
    nonVirtualizedTime = nonVirtualizedEnd - nonVirtualizedStart;
  }
  
  console.log(`📊 Performance Results:`);
  console.log(`   Virtualized: ${virtualizedTime.toFixed(2)}ms`);
  if (nonVirtualizedTime > 0) {
    console.log(`   Non-virtualized: ${nonVirtualizedTime.toFixed(2)}ms`);
    console.log(`   Performance gain: ${((nonVirtualizedTime - virtualizedTime) / nonVirtualizedTime * 100).toFixed(1)}%`);
  }
  
  return {
    virtualizedTime,
    nonVirtualizedTime,
    performanceGain: nonVirtualizedTime > 0 ? (nonVirtualizedTime - virtualizedTime) / nonVirtualizedTime : 0,
  };
}

/**
 * Memory usage estimation
 */
export function estimateVirtualizationMemoryUsage(itemCount: number, itemSizeBytes: number = 500) {
  const virtualizedMemory = 20 * itemSizeBytes; // Only ~20 items rendered at once
  const nonVirtualizedMemory = itemCount * itemSizeBytes; // All items in DOM
  
  return {
    virtualizedKB: virtualizedMemory / 1024,
    nonVirtualizedKB: nonVirtualizedMemory / 1024,
    memorySavings: ((nonVirtualizedMemory - virtualizedMemory) / nonVirtualizedMemory) * 100,
  };
} 
"use client";

import React, { memo, useMemo, useState, useCallback } from "react";
import { VariableSizeList as List } from "react-window";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LuClock, LuTrendingUp, LuTrendingDown, LuZap, LuShield } from "react-icons/lu";

// Types for simulation history data
export interface SimulationEvent {
  id: string;
  generation: number;
  timestamp: Date;
  type: 'population_change' | 'resistance_emergence' | 'mutation_event' | 'antibiotic_applied' | 'milestone';
  title: string;
  description: string;
  data: {
    populationChange?: number;
    resistanceRatio?: number;
    mutationCount?: number;
    antibioticLevel?: number;
    previousValue?: number;
    newValue?: number;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface VirtualizedSimulationHistoryProps {
  events: SimulationEvent[];
  height?: number;
  onEventSelect?: (event: SimulationEvent) => void;
  selectedEventId?: string;
}

interface HistoryItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    filteredEvents: SimulationEvent[];
    onSelect?: (event: SimulationEvent) => void;
    selectedId?: string;
    getItemHeight: (index: number) => number;
  };
}

// Individual history event item component
const HistoryEventItem = memo<HistoryItemProps>(function HistoryEventItem({
  index,
  style,
  data,
}) {
  const event = data.filteredEvents[index];
  const isSelected = data.selectedId === event.id;

  const handleClick = useCallback(() => {
    data.onSelect?.(event);
  }, [data.onSelect, event]);

  if (!event) {
    return <div style={style}>Loading...</div>;
  }

  // Get icon based on event type
  const getEventIcon = () => {
    switch (event.type) {
      case 'population_change':
        return event.data.populationChange && event.data.populationChange > 0 
          ? <LuTrendingUp className="h-4 w-4 text-green-500" />
          : <LuTrendingDown className="h-4 w-4 text-red-500" />;
      case 'resistance_emergence':
        return <LuShield className="h-4 w-4 text-orange-500" />;
      case 'mutation_event':
        return <LuZap className="h-4 w-4 text-purple-500" />;
      case 'antibiotic_applied':
        return <LuZap className="h-4 w-4 text-blue-500" />;
      default:
        return <LuClock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get severity color
  const getSeverityColor = () => {
    switch (event.severity) {
      case 'critical': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-gray-300 dark:border-gray-600';
    }
  };

  const hasDataFields = Object.values(event.data).some(value => value !== undefined);

  return (
    <div style={style}>
      <div
        className={`
          p-4 mx-2 my-1 rounded-lg border cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : getSeverityColor()
          }
        `}
        onClick={handleClick}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-3">
            {getEventIcon()}
            <div>
              <div className="font-medium text-sm">
                {event.title}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Generation {event.generation} • {event.timestamp.toLocaleDateString()} {event.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge 
              variant={event.severity === 'critical' ? 'destructive' : 'outline'}
              className="text-xs capitalize"
            >
              {event.severity}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {event.type.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Description */}
        <div className="text-sm text-gray-700 dark:text-gray-300 mb-2">
          {event.description}
        </div>

        {/* Data Fields */}
        {hasDataFields && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {event.data.populationChange !== undefined && (
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500">Population:</span>
                <span className={`ml-1 font-medium ${
                  event.data.populationChange > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {event.data.populationChange > 0 ? '+' : ''}{event.data.populationChange}
                </span>
              </div>
            )}
            
            {event.data.resistanceRatio !== undefined && (
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500">Resistance:</span>
                <span className="ml-1 font-medium text-orange-600">
                  {(event.data.resistanceRatio * 100).toFixed(1)}%
                </span>
              </div>
            )}
            
            {event.data.mutationCount !== undefined && (
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500">Mutations:</span>
                <span className="ml-1 font-medium text-purple-600">
                  {event.data.mutationCount}
                </span>
              </div>
            )}
            
            {event.data.antibioticLevel !== undefined && (
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500">Antibiotic:</span>
                <span className="ml-1 font-medium text-blue-600">
                  {(event.data.antibioticLevel * 100).toFixed(0)}%
                </span>
              </div>
            )}
            
            {event.data.previousValue !== undefined && event.data.newValue !== undefined && (
              <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                <span className="text-gray-500">Change:</span>
                <span className="ml-1 font-medium">
                  {event.data.previousValue} → {event.data.newValue}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

const VirtualizedSimulationHistory = memo<VirtualizedSimulationHistoryProps>(function VirtualizedSimulationHistory({
  events,
  height = 400,
  onEventSelect,
  selectedEventId,
}) {
  const [filterBySeverity, setFilterBySeverity] = useState<string>('all');
  const [filterByType, setFilterByType] = useState<string>('all');

  // Filter events based on selected criteria
  const filteredEvents = useMemo(() => {
    let filtered = [...events].sort((a, b) => b.generation - a.generation); // Sort by generation, newest first

    if (filterBySeverity !== 'all') {
      filtered = filtered.filter(event => event.severity === filterBySeverity);
    }

    if (filterByType !== 'all') {
      filtered = filtered.filter(event => event.type === filterByType);
    }

    return filtered;
  }, [events, filterBySeverity, filterByType]);

  // Calculate dynamic height for each item based on content
  const getItemHeight = useCallback((index: number) => {
    const event = filteredEvents[index];
    if (!event) return 100;

    let baseHeight = 80; // Base height for header and description
    
    // Add height for data fields
    const dataFieldCount = Object.values(event.data).filter(value => value !== undefined).length;
    if (dataFieldCount > 0) {
      const rows = Math.ceil(dataFieldCount / 3); // 3 columns per row
      baseHeight += rows * 40; // 40px per row of data
    }

    // Add padding and margins
    return baseHeight + 24;
  }, [filteredEvents]);

  // Memoize list data
  const listData = useMemo(() => ({
    filteredEvents,
    onSelect: onEventSelect,
    selectedId: selectedEventId,
    getItemHeight,
  }), [filteredEvents, onEventSelect, selectedEventId, getItemHeight]);

  // Get unique event types and severities for filters
  const eventTypes = useMemo(() => {
    const types = Array.from(new Set(events.map(e => e.type)));
    return types.sort();
  }, [events]);

  const severityLevels = ['low', 'medium', 'high', 'critical'];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Simulation History ({filteredEvents.length} events)
        </CardTitle>
        
        {/* Filters */}
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium mb-2">Filter by Severity:</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterBySeverity === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBySeverity('all')}
              >
                All
              </Button>
              {severityLevels.map((severity) => (
                <Button
                  key={severity}
                  variant={filterBySeverity === severity ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterBySeverity(severity)}
                  className="capitalize"
                >
                  {severity}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Filter by Type:</div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={filterByType === 'all' ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterByType('all')}
              >
                All
              </Button>
              {eventTypes.map((type) => (
                <Button
                  key={type}
                  variant={filterByType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterByType(type)}
                  className="capitalize"
                >
                  {type.replace('_', ' ')}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            No simulation events found
          </div>
        ) : (
          <List
            height={height}
            width="100%"
            itemCount={filteredEvents.length}
            itemSize={getItemHeight}
            itemData={listData}
            overscanCount={3} // Render 3 extra items for smooth scrolling
          >
            {HistoryEventItem}
          </List>
        )}
      </CardContent>
    </Card>
  );
});

export default VirtualizedSimulationHistory; 
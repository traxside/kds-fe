"use client";

import React, { memo, useMemo, useState, useCallback, useEffect } from "react";
import { FixedSizeList, ListOnScrollProps } from "react-window";
import { Bacterium } from "@/types/simulation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LuSearch, LuFilter, LuChevronDown, LuChevronUp, LuZap } from "react-icons/lu";
import { useProgressiveBacteriaLoader, DataLoader } from "@/hooks/useProgressiveLoader";
import { ProgressiveLoadingIndicator, CompactProgressiveLoadingIndicator } from "./ProgressiveLoadingIndicator";

interface VirtualizedBacteriaListProps {
  bacteria: Bacterium[];
  height?: number;
  onBacteriumSelect?: (bacterium: Bacterium) => void;
  selectedBacteriumId?: string;
  enableProgressiveLoading?: boolean;
  // For large datasets, provide a loader function instead of passing all data
  dataLoader?: DataLoader<Bacterium>;
  totalItemCount?: number;
}

interface BacteriaListItemProps {
  index: number;
  style: React.CSSProperties;
  data: {
    filteredBacteria: Bacterium[];
    onSelect?: (bacterium: Bacterium) => void;
    selectedId?: string;
    isProgressive?: boolean;
  };
}

// Individual bacterium row component - memoized for performance
const BacteriaListItem = memo<BacteriaListItemProps>(function BacteriaListItem({
  index,
  style,
  data,
}) {
  const bacterium = data.filteredBacteria[index];
  const isSelected = data.selectedId === bacterium?.id;
  const isProgressive = data.isProgressive;

  const handleClick = useCallback(() => {
    if (bacterium) {
      data.onSelect?.(bacterium);
    }
  }, [data, bacterium]);

  if (!bacterium) {
    return (
      <div style={style}>
        <div className="p-3 mx-2 my-1 rounded-lg border border-gray-200 dark:border-gray-700 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={style}>
      <div
        className={`
          p-3 mx-2 my-1 rounded-lg border cursor-pointer transition-all duration-200
          ${isSelected 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
          }
          ${isProgressive ? 'border-l-4 border-l-cyan-400' : ''}
        `}
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-4 h-4 rounded-full border-2"
              style={{
                backgroundColor: bacterium.color,
                borderColor: bacterium.isResistant ? '#ffffff' : 'transparent',
              }}
            />
            <div>
              <div className="text-sm font-medium flex items-center space-x-2">
                <span>ID: {bacterium.id}</span>
                {isProgressive && (
                  <Badge variant="outline" className="text-xs text-cyan-600 border-cyan-400">
                    <LuZap className="h-3 w-3 mr-1" />
                    Progressive
                  </Badge>
                )}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Gen {bacterium.generation} • Age {bacterium.age}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {bacterium.isResistant && (
              <Badge variant="destructive" className="text-xs">
                Resistant
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Fitness: {(bacterium.fitness * 100).toFixed(0)}%
            </Badge>
          </div>
        </div>
        
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
          <div>Position: ({bacterium.x.toFixed(0)}, {bacterium.y.toFixed(0)})</div>
          <div>Size: {bacterium.size.toFixed(1)}px</div>
        </div>
      </div>
    </div>
  );
});

// Filter and sort options
type SortOption = 'id' | 'generation' | 'age' | 'fitness' | 'resistance';
type FilterOption = 'all' | 'resistant' | 'sensitive';

const VirtualizedBacteriaList = memo<VirtualizedBacteriaListProps>(function VirtualizedBacteriaList({
  bacteria,
  height = 400,
  onBacteriumSelect,
  selectedBacteriumId,
  enableProgressiveLoading = false,
  dataLoader,
  totalItemCount,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [progressiveData, setProgressiveData] = useState<Bacterium[]>([]);

  // Progressive loading hook - only used when enabled
  const progressiveLoader = useProgressiveBacteriaLoader({
    enabled: enableProgressiveLoading && !!dataLoader && !!totalItemCount,
    chunkSize: 1000,
    maxMemoryUsage: 150, // 150MB
    prefetchSize: 3
  });

  // Initialize progressive loader
  useEffect(() => {
    if (enableProgressiveLoading && dataLoader && totalItemCount && progressiveLoader.isEnabled) {
      progressiveLoader.initialize(totalItemCount, 2048); // Estimate 2KB per bacterium
    }
  }, [enableProgressiveLoading, dataLoader, totalItemCount, progressiveLoader]);

  // Determine data source (regular bacteria array or progressive data)
  const sourceData = useMemo(() => {
    if (enableProgressiveLoading && progressiveData.length > 0) {
      return progressiveData;
    }
    return bacteria;
  }, [enableProgressiveLoading, progressiveData, bacteria]);

  // Filter and sort bacteria
  const filteredAndSortedBacteria = useMemo(() => {
    let filtered = sourceData;

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(bacterium => 
        bacterium.id.toLowerCase().includes(searchLower) ||
        bacterium.generation.toString().includes(searchLower) ||
        bacterium.age.toString().includes(searchLower)
      );
    }

    // Apply resistance filter
    switch (filterBy) {
      case 'resistant':
        filtered = filtered.filter(b => b.isResistant);
        break;
      case 'sensitive':
        filtered = filtered.filter(b => !b.isResistant);
        break;
      // 'all' shows everything
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: string | number, bValue: string | number;
      
      switch (sortBy) {
        case 'id':
          aValue = a.id;
          bValue = b.id;
          break;
        case 'generation':
          aValue = a.generation;
          bValue = b.generation;
          break;
        case 'age':
          aValue = a.age;
          bValue = b.age;
          break;
        case 'fitness':
          aValue = a.fitness;
          bValue = b.fitness;
          break;
        case 'resistance':
          aValue = a.isResistant ? 1 : 0;
          bValue = b.isResistant ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sourceData, searchTerm, sortBy, sortDirection, filterBy]);

  // Load initial visible data for progressive loading
  useEffect(() => {
    if (enableProgressiveLoading && dataLoader && progressiveLoader.isInitialized) {
      const visibleCount = Math.ceil(height / 80) + 10; // 80px per item + buffer
      
      progressiveLoader.loadVisibleData(
        { start: 0, end: visibleCount },
        dataLoader
      ).then(data => {
        setProgressiveData(data);
      }).catch(error => {
        console.error('Failed to load initial progressive data:', error);
      });
    }
  }, [enableProgressiveLoading, dataLoader, progressiveLoader, height]);

  // Memoize list data to prevent unnecessary re-renders
  const listData = useMemo(() => ({
    filteredBacteria: filteredAndSortedBacteria,
    onSelect: onBacteriumSelect,
    selectedId: selectedBacteriumId,
    isProgressive: enableProgressiveLoading,
  }), [filteredAndSortedBacteria, onBacteriumSelect, selectedBacteriumId, enableProgressiveLoading]);

  const handleSortChange = useCallback((newSortBy: SortOption) => {
    if (sortBy === newSortBy) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('asc');
    }
  }, [sortBy]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  const handleFilterChange = useCallback((filter: FilterOption) => {
    setFilterBy(filter);
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters(prev => !prev);
  }, []);

  // Handle list scroll for progressive loading
  const handleScroll = useCallback((props: ListOnScrollProps) => {
    if (enableProgressiveLoading && dataLoader && progressiveLoader.isInitialized && props.scrollOffset !== undefined) {
      const itemHeight = 80;
      const startIndex = Math.floor(props.scrollOffset / itemHeight);
      const visibleCount = Math.ceil(height / itemHeight);
      const endIndex = startIndex + visibleCount + 20; // Add buffer
      
      // Load data for visible range
      progressiveLoader.loadVisibleData(
        { start: startIndex, end: endIndex },
        dataLoader
      ).then(data => {
        setProgressiveData(prevData => {
          // Merge new data with existing, avoiding duplicates
          const existingIds = new Set(prevData.map(item => item.id));
          const newItems = data.filter(item => !existingIds.has(item.id));
          return [...prevData, ...newItems];
        });
      }).catch((error) => {
        console.error('Failed to load progressive data on scroll:', error);
      });
    }
  }, [enableProgressiveLoading, dataLoader, progressiveLoader, height]);

  const totalCount = enableProgressiveLoading ? (totalItemCount || bacteria.length) : bacteria.length;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <span>Bacteria List ({filteredAndSortedBacteria.length} of {totalCount})</span>
            {enableProgressiveLoading && (
              <Badge variant="outline" className="text-cyan-600 border-cyan-400">
                <LuZap className="h-3 w-3 mr-1" />
                Progressive
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {enableProgressiveLoading && progressiveLoader.isEnabled && (
              <CompactProgressiveLoadingIndicator 
                state={progressiveLoader.state}
                className="text-xs"
              />
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFilters}
              className="flex items-center space-x-1"
            >
              <LuFilter className="h-4 w-4" />
              {showFilters ? <LuChevronUp className="h-4 w-4" /> : <LuChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative">
          <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by ID, generation, or age..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        {/* Progressive Loading Indicator */}
        {enableProgressiveLoading && progressiveLoader.isEnabled && progressiveLoader.state.isLoading && (
          <ProgressiveLoadingIndicator 
            state={progressiveLoader.state}
            showDetails={true}
          />
        )}

        {/* Filters and Sort Options */}
        {showFilters && (
          <div className="space-y-3 pt-3 border-t">
            {/* Progressive Loading Toggle */}
            {(dataLoader && totalItemCount) && (
              <div className="flex items-center justify-between p-3 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-900/20">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="progressive-loading"
                    checked={enableProgressiveLoading}
                    onCheckedChange={(checked: boolean) => {
                      // This would typically be controlled by parent component
                      console.log("Progressive loading toggled:", checked);
                    }}
                  />
                  <Label htmlFor="progressive-loading" className="text-sm font-medium">
                    Progressive Loading
                  </Label>
                </div>
                <Badge variant="outline" className="text-cyan-600 border-cyan-400">
                  {totalItemCount?.toLocaleString()} items
                </Badge>
              </div>
            )}

            {/* Filter Options */}
            <div>
              <div className="text-sm font-medium mb-2">Filter by Type:</div>
              <div className="flex space-x-2">
                {(['all', 'resistant', 'sensitive'] as const).map((filter) => (
                  <Button
                    key={filter}
                    variant={filterBy === filter ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleFilterChange(filter)}
                    className="capitalize"
                  >
                    {filter}
                  </Button>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <div className="text-sm font-medium mb-2">Sort by:</div>
              <div className="flex flex-wrap gap-2">
                {(['id', 'generation', 'age', 'fitness', 'resistance'] as const).map((sort) => (
                  <Button
                    key={sort}
                    variant={sortBy === sort ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSortChange(sort)}
                    className="capitalize"
                  >
                    {sort}
                    {sortBy === sort && (
                      sortDirection === 'asc' ? <LuChevronUp className="ml-1 h-3 w-3" /> : <LuChevronDown className="ml-1 h-3 w-3" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 overflow-hidden">
        {filteredAndSortedBacteria.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            {progressiveLoader.state.isLoading ? "Loading bacteria data..." : "No bacteria found matching your criteria"}
          </div>
        ) : (
          <FixedSizeList
            height={height}
            width="100%"
            itemCount={filteredAndSortedBacteria.length}
            itemSize={80} // Fixed height for each item
            itemData={listData}
            overscanCount={5} // Render 5 extra items for smooth scrolling
            onScroll={handleScroll}
          >
            {BacteriaListItem}
          </FixedSizeList>
        )}
      </CardContent>
    </Card>
  );
});

export default VirtualizedBacteriaList; 
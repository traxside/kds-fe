"use client";

import React, { useState, useCallback } from "react";
import { 
  LuSearch, 
  LuFilter, 
  LuX, 
  LuCalendar, 
  LuStar, 
  LuTag,
  LuHeart,
  LuTrendingUp,
  LuChevronDown,
  LuChevronUp,
  LuRefreshCw
} from "react-icons/lu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  SimulationSearchFilters, 
  simulationCategories
} from "@/types/simulation";

interface MetadataSearchPanelProps {
  filters: SimulationSearchFilters;
  onFiltersChange: (filters: SimulationSearchFilters) => void;
  availableTags?: string[];
  onReset?: () => void;
  className?: string;
  compact?: boolean;
}

export default function MetadataSearchPanel({
  filters,
  onFiltersChange,
  availableTags = [],
  onReset,
  className = "",
  compact = false,
}: MetadataSearchPanelProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [dateRangeExpanded, setDateRangeExpanded] = useState(false);

  const handleFilterChange = useCallback((updates: Partial<SimulationSearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  }, [filters, onFiltersChange]);

  const handleTagToggle = useCallback((tag: string) => {
    const currentTags = filters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    
    handleFilterChange({ tags: newTags.length > 0 ? newTags : undefined });
  }, [filters.tags, handleFilterChange]);

  const handleRatingClick = useCallback((rating: number) => {
    const newRating = filters.rating === rating ? undefined : rating;
    handleFilterChange({ rating: newRating });
  }, [filters.rating, handleFilterChange]);

  const handleReset = useCallback(() => {
    const resetFilters: SimulationSearchFilters = {
      searchQuery: "",
      status: "all",
    };
    onFiltersChange(resetFilters);
    onReset?.();
  }, [onFiltersChange, onReset]);

  const getActiveFilterCount = () => {
    let count = 0;
    
    if (filters.searchQuery && filters.searchQuery.trim()) count++;
    if (filters.status && filters.status !== "all") count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.category) count++;
    if (filters.rating) count++;
    if (filters.favoritesOnly) count++;
    if (filters.createdAfter || filters.createdBefore) count++;
    if (filters.complexityRange) count++;
    if (filters.populationRange) count++;
    if (filters.growthRateRange) count++;
    if (filters.antibioticConcentrationRange) count++;
    if (filters.mutationRateRange) count++;
    
    return count;
  };

  const renderStarRating = () => (
    <div className="flex items-center space-x-1">
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => handleRatingClick(i + 1)}
          className={`p-1 rounded transition-colors ${
            filters.rating && i < filters.rating
              ? "text-yellow-500 hover:text-yellow-600"
              : "text-gray-300 hover:text-gray-400"
          }`}
        >
          <LuStar className={`h-4 w-4 ${
            filters.rating && i < filters.rating ? "fill-current" : ""
          }`} />
        </button>
      ))}
      {filters.rating && (
        <span className="ml-2 text-xs text-muted-foreground">
          {filters.rating}+ stars
        </span>
      )}
    </div>
  );

  const renderCompactView = () => (
    <Card className={className}>
      <CardContent className="pt-4">
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search simulations..."
              value={filters.searchQuery || ""}
              onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Status Filter */}
            <select
              value={filters.status || "all"}
              onChange={(e) => handleFilterChange({ 
                status: e.target.value as SimulationSearchFilters["status"] 
              })}
              className="flex h-8 rounded-md border border-input bg-background px-2 text-xs"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>

            {/* Favorites Toggle */}
            <Button
              variant={filters.favoritesOnly ? "default" : "outline"}
              size="sm"
              onClick={() => handleFilterChange({ 
                favoritesOnly: !filters.favoritesOnly 
              })}
              className="h-8 px-2 text-xs"
            >
              <LuHeart className="h-3 w-3 mr-1" />
              Favorites
            </Button>

            {/* Expand Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 px-2 text-xs"
            >
              <LuFilter className="h-3 w-3 mr-1" />
              More ({getActiveFilterCount()})
              {isExpanded ? (
                <LuChevronUp className="h-3 w-3 ml-1" />
              ) : (
                <LuChevronDown className="h-3 w-3 ml-1" />
              )}
            </Button>
          </div>

          {/* Active Filters Display */}
          {getActiveFilterCount() > 0 && (
            <div className="flex flex-wrap gap-1">
              {filters.tags?.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <LuTag className="h-3 w-3 mr-1" />
                  {tag}
                  <button
                    onClick={() => handleTagToggle(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <LuX className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              {filters.category && (
                <Badge variant="secondary" className="text-xs capitalize">
                  {filters.category}
                  <button
                    onClick={() => handleFilterChange({ category: undefined })}
                    className="ml-1 hover:text-red-500"
                  >
                    <LuX className="h-3 w-3" />
                  </button>
                </Badge>
              )}

              {getActiveFilterCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="h-5 px-2 text-xs text-muted-foreground hover:text-red-500"
                >
                  <LuRefreshCw className="h-3 w-3 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (compact && !isExpanded) {
    return renderCompactView();
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <LuFilter className="h-5 w-5 mr-2" />
            Advanced Search
            {getActiveFilterCount() > 0 && (
              <Badge variant="secondary" className="ml-2">
                {getActiveFilterCount()}
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex space-x-2">
            {compact && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(false)}
                className="h-8 w-8 p-0"
              >
                <LuChevronUp className="h-4 w-4" />
              </Button>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="flex items-center space-x-1"
            >
              <LuRefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Basic Search */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Basic Search</h4>
          
          {/* Search Input */}
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name or description..."
              value={filters.searchQuery || ""}
              onChange={(e) => handleFilterChange({ searchQuery: e.target.value })}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Status
            </label>
            <select
              value={filters.status || "all"}
              onChange={(e) => handleFilterChange({ 
                status: e.target.value as SimulationSearchFilters["status"] 
              })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <Separator />

        {/* Metadata Filters */}
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Metadata Filters</h4>
          
          {/* Category Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Category
            </label>
            <select
              value={filters.category || ""}
              onChange={(e) => handleFilterChange({ 
                category: e.target.value || undefined 
              })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Categories</option>
              {simulationCategories.map((category) => (
                <option key={category} value={category} className="capitalize">
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Minimum Rating
            </label>
            {renderStarRating()}
          </div>

          {/* Tags Filter */}
          {availableTags.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableTags.map((tag) => {
                  const isSelected = filters.tags?.includes(tag) || false;
                  return (
                    <Badge
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleTagToggle(tag)}
                    >
                      <LuTag className="h-3 w-3 mr-1" />
                      {tag}
                      {isSelected && <LuX className="h-3 w-3 ml-1" />}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}

          {/* Special Filters */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="favorites"
                checked={filters.favoritesOnly || false}
                onCheckedChange={(checked) => handleFilterChange({ 
                  favoritesOnly: checked as boolean 
                })}
              />
              <label htmlFor="favorites" className="text-sm font-medium flex items-center">
                <LuHeart className="h-4 w-4 mr-2" />
                Favorites only
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={filters.isPublic || false}
                onCheckedChange={(checked) => handleFilterChange({ 
                  isPublic: checked as boolean 
                })}
              />
              <label htmlFor="public" className="text-sm font-medium">
                Public simulations only
              </label>
            </div>
          </div>
        </div>

        <Separator />

        {/* Date Range Filter */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center">
              <LuCalendar className="h-4 w-4 mr-2" />
              Date Range
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDateRangeExpanded(!dateRangeExpanded)}
              className="h-6 w-6 p-0"
            >
              {dateRangeExpanded ? (
                <LuChevronUp className="h-3 w-3" />
              ) : (
                <LuChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>

          {dateRangeExpanded && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Created After
                </label>
                <Input
                  type="date"
                  value={filters.createdAfter || ""}
                  onChange={(e) => handleFilterChange({ 
                    createdAfter: e.target.value || undefined 
                  })}
                  className="text-sm"
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Created Before
                </label>
                <Input
                  type="date"
                  value={filters.createdBefore || ""}
                  onChange={(e) => handleFilterChange({ 
                    createdBefore: e.target.value || undefined 
                  })}
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Complexity Filter */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm flex items-center">
              <LuTrendingUp className="h-4 w-4 mr-2" />
              Complexity Range
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Min Complexity
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={filters.complexityRange?.min || ""}
                onChange={(e) => {
                  const min = e.target.value ? parseInt(e.target.value) : undefined;
                  handleFilterChange({
                    complexityRange: min ? {
                      min,
                      max: filters.complexityRange?.max || 10
                    } : undefined
                  });
                }}
                className="text-sm"
                placeholder="1"
              />
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Max Complexity
              </label>
              <Input
                type="number"
                min="1"
                max="10"
                value={filters.complexityRange?.max || ""}
                onChange={(e) => {
                  const max = e.target.value ? parseInt(e.target.value) : undefined;
                  handleFilterChange({
                    complexityRange: max ? {
                      min: filters.complexityRange?.min || 1,
                      max
                    } : undefined
                  });
                }}
                className="text-sm"
                placeholder="10"
              />
            </div>
          </div>
        </div>

        {/* Sorting Options */}
        <Separator />
        
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Sort Options</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Sort By
              </label>
              <select
                value={filters.sortBy || "date"}
                onChange={(e) => handleFilterChange({ 
                  sortBy: e.target.value as SimulationSearchFilters["sortBy"] 
                })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="date">Date Created</option>
                <option value="name">Name</option>
                <option value="rating">Rating</option>
                <option value="complexity">Complexity</option>
                <option value="performance">Performance</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">
                Order
              </label>
              <select
                value={filters.sortOrder || "desc"}
                onChange={(e) => handleFilterChange({ 
                  sortOrder: e.target.value as "asc" | "desc" 
                })}
                className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 
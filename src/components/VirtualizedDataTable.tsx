"use client";

import React, { memo, useMemo, useState, useCallback } from "react";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LuSearch, LuChevronUp, LuChevronDown, LuArrowUpDown } from "react-icons/lu";

// Generic column definition interface
export interface ColumnDefinition<T = unknown> {
  key: string;
  title: string;
  width?: number;
  minWidth?: number;
  render?: (item: T, index: number) => React.ReactNode;
  sortable?: boolean;
  searchable?: boolean;
  accessor?: (item: T) => string | number; // For sorting and searching
}

interface VirtualizedDataTableProps<T = unknown> {
  data: T[];
  columns: ColumnDefinition<T>[];
  height?: number;
  rowHeight?: number;
  onRowSelect?: (item: T, index: number) => void;
  selectedRowIndex?: number;
  searchable?: boolean;
  sortable?: boolean;
  title?: string;
  emptyMessage?: string;
}

interface TableRowProps<T = unknown> {
  index: number;
  style: React.CSSProperties;
  data: {
    filteredData: T[];
    columns: ColumnDefinition<T>[];
    onSelect?: (item: T, index: number) => void;
    selectedIndex?: number;
    originalIndices: number[];
  };
}

// Individual table row component
const TableRow = memo(function TableRow<T>({
  index,
  style,
  data,
}: TableRowProps<T>) {
  const item = data.filteredData[index];
  const originalIndex = data.originalIndices[index];
  const isSelected = data.selectedIndex === originalIndex;

  const handleClick = useCallback(() => {
    data.onSelect?.(item, originalIndex);
  }, [data, item, originalIndex]);

  if (!item) {
    return <div style={style}>Loading...</div>;
  }

  return (
    <div style={style}>
      <div
        className={`
          flex items-center px-4 py-2 border-b cursor-pointer transition-colors duration-150
          ${isSelected 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
            : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          }
        `}
        onClick={handleClick}
      >        {data.columns.map((column) => {
          const cellContent = column.render 
            ? column.render(item, originalIndex)
            : column.accessor 
              ? column.accessor(item)
              : (item as Record<string, unknown>)[column.key];

          return (
            <div
              key={column.key}
              className="flex-shrink-0 truncate text-sm"
              style={{
                width: column.width || `${100 / data.columns.length}%`,
                minWidth: column.minWidth || 100,
              }}
            >
              {cellContent as React.ReactNode}
            </div>
          );
        })}
      </div>
    </div>
  );
}) as <T>(props: TableRowProps<T>) => React.JSX.Element;

function VirtualizedDataTable<T = unknown>({
  data,
  columns,
  height = 400,
  rowHeight = 50,
  onRowSelect,
  selectedRowIndex,
  searchable = true,
  sortable = true,
  title,
  emptyMessage = "No data available",
}: VirtualizedDataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter and sort data
  const { filteredData, originalIndices } = useMemo(() => {
    let filtered = data;
    let indices = data.map((_, index) => index);

    // Apply search filter
    if (searchable && searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const searchableColumns = columns.filter(col => col.searchable !== false);
      
      filtered = [];
      indices = [];

      data.forEach((item, index) => {
        const matchesSearch = searchableColumns.some(column => {
          const value = column.accessor 
            ? column.accessor(item)
            : (item as Record<string, unknown>)[column.key];
          
          return value && 
            value.toString().toLowerCase().includes(searchLower);
        });

        if (matchesSearch) {
          filtered.push(item);
          indices.push(index);
        }
      });
    }

    // Apply sorting
    if (sortable && sortColumn) {
      const sortCol = columns.find(col => col.key === sortColumn);
      if (sortCol && sortCol.sortable !== false) {
        const combined = filtered.map((item, index) => ({ item, originalIndex: indices[index] }));        combined.sort((a, b) => {
          const aValue = sortCol.accessor 
            ? sortCol.accessor(a.item)
            : (a.item as Record<string, unknown>)[sortColumn];
          const bValue = sortCol.accessor 
            ? sortCol.accessor(b.item)
            : (b.item as Record<string, unknown>)[sortColumn];

          let comparison = 0;
          
          // Type-safe comparison
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
          } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
          } else {
            // Fallback to string comparison for other types
            const aStr = String(aValue);
            const bStr = String(bValue);
            comparison = aStr.localeCompare(bStr);
          }

          return sortDirection === 'asc' ? comparison : -comparison;
        });

        filtered = combined.map(c => c.item);
        indices = combined.map(c => c.originalIndex);
      }
    }

    return { filteredData: filtered, originalIndices: indices };
  }, [data, columns, searchTerm, sortColumn, sortDirection, searchable, sortable]);

  // Handle column header click for sorting
  const handleColumnClick = useCallback((columnKey: string) => {
    if (!sortable) return;
    
    const column = columns.find(col => col.key === columnKey);
    if (!column || column.sortable === false) return;

    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  }, [columns, sortColumn, sortable]);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // Memoize list data
  const listData = useMemo(() => ({
    filteredData,
    columns,
    onSelect: onRowSelect,
    selectedIndex: selectedRowIndex,
    originalIndices,
  }), [filteredData, columns, onRowSelect, selectedRowIndex, originalIndices]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {title && (
            <CardTitle className="text-lg">
              {title} ({filteredData.length} of {data.length})
            </CardTitle>
          )}
        </div>
        
        {/* Search Bar */}
        {searchable && (
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search data..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        {/* Table Header */}
        <div className="flex items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b font-medium text-sm">
          {columns.map((column) => {
            const isSortable = sortable && column.sortable !== false;
            const isCurrentSort = sortColumn === column.key;
            
            return (
              <div
                key={column.key}
                className={`
                  flex items-center flex-shrink-0 truncate
                  ${isSortable ? 'cursor-pointer hover:text-blue-600' : ''}
                `}
                style={{
                  width: column.width || `${100 / columns.length}%`,
                  minWidth: column.minWidth || 100,
                }}
                onClick={() => handleColumnClick(column.key)}
              >
                <span>{column.title}</span>
                {isSortable && (
                  <span className="ml-1">
                    {!isCurrentSort && <LuArrowUpDown className="h-3 w-3 text-gray-400" />}
                    {isCurrentSort && sortDirection === 'asc' && <LuChevronUp className="h-3 w-3" />}
                    {isCurrentSort && sortDirection === 'desc' && <LuChevronDown className="h-3 w-3" />}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Table Body */}
        {filteredData.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400">
            {emptyMessage}
          </div>
        ) : (
          <List
            height={height - 120} // Subtract header height
            width="100%"
            itemCount={filteredData.length}
            itemSize={rowHeight}
            itemData={listData}
            overscanCount={5}
          >
            {TableRow as React.ComponentType<ListChildComponentProps>}
          </List>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(VirtualizedDataTable) as typeof VirtualizedDataTable; 
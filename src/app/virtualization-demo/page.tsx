"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VirtualizedBacteriaList from "@/components/VirtualizedBacteriaList";
import VirtualizedSimulationHistory from "@/components/VirtualizedSimulationHistory";
import VirtualizedDataTable, { ColumnDefinition } from "@/components/VirtualizedDataTable";
import { 
  generateLargeBacteriaDataset, 
  generateSimulationEvents, 
  generateSampleTableData,
  estimateVirtualizationMemoryUsage,
  SampleDataRow 
} from "@/lib/mock-data";
import { Bacterium } from "@/types/simulation";
import { SimulationEvent } from "@/components/VirtualizedSimulationHistory";

export default function VirtualizationDemoPage() {
  const [selectedBacterium, setSelectedBacterium] = useState<Bacterium | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<SimulationEvent | null>(null);
  const [selectedTableRow, setSelectedTableRow] = useState<SampleDataRow | null>(null);
  const [selectedTableIndex, setSelectedTableIndex] = useState<number | undefined>();

  // Generate large datasets for demonstration
  const largeBacteriaDataset = useMemo(() => generateLargeBacteriaDataset(10000), []);
  const simulationEvents = useMemo(() => generateSimulationEvents(5000), []);
  const sampleTableData = useMemo(() => generateSampleTableData(10000), []);

  // Table column definitions
  const tableColumns: ColumnDefinition<SampleDataRow>[] = useMemo(() => [
    {
      key: 'id',
      title: 'ID',
      width: 120,
      sortable: true,
      accessor: (item) => item.id,
    },
    {
      key: 'name',
      title: 'Name',
      width: 200,
      sortable: true,
      searchable: true,
      accessor: (item) => item.name,
    },
    {
      key: 'value',
      title: 'Value',
      width: 120,
      sortable: true,
      render: (item) => item.value.toFixed(2),
      accessor: (item) => item.value,
    },
    {
      key: 'category',
      title: 'Category',
      width: 150,
      sortable: true,
      searchable: true,
      render: (item) => (
        <Badge variant="outline" className="capitalize">
          {item.category}
        </Badge>
      ),
      accessor: (item) => item.category,
    },
    {
      key: 'status',
      title: 'Status',
      width: 120,
      sortable: true,
      render: (item) => {
        const variant = item.status === 'active' ? 'default' : 
                      item.status === 'inactive' ? 'destructive' : 'secondary';
        return (
          <Badge variant={variant} className="capitalize">
            {item.status}
          </Badge>
        );
      },
      accessor: (item) => item.status,
    },
    {
      key: 'createdAt',
      title: 'Created',
      width: 180,
      sortable: true,
      render: (item) => item.createdAt.toLocaleDateString(),
      accessor: (item) => item.createdAt,
    },
  ], []);

  // Calculate memory usage estimates
  const bacteriaMemory = estimateVirtualizationMemoryUsage(largeBacteriaDataset.length, 300);
  const eventsMemory = estimateVirtualizationMemoryUsage(simulationEvents.length, 500);
  const tableMemory = estimateVirtualizationMemoryUsage(sampleTableData.length, 200);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Virtualization Performance Demo</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Demonstrating efficient rendering of large datasets using React Window virtualization.
          Each component can handle thousands of items while maintaining smooth performance.
        </p>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Bacteria List Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>Items: <span className="font-mono">{largeBacteriaDataset.length.toLocaleString()}</span></div>
              <div>Memory saved: <span className="font-mono text-green-600">{bacteriaMemory.memorySavings.toFixed(1)}%</span></div>
              <div>Virtualized: <span className="font-mono">{bacteriaMemory.virtualizedKB.toFixed(1)}KB</span></div>
              <div>Non-virtualized: <span className="font-mono">{bacteriaMemory.nonVirtualizedKB.toFixed(1)}KB</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Simulation History Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>Events: <span className="font-mono">{simulationEvents.length.toLocaleString()}</span></div>
              <div>Memory saved: <span className="font-mono text-green-600">{eventsMemory.memorySavings.toFixed(1)}%</span></div>
              <div>Virtualized: <span className="font-mono">{eventsMemory.virtualizedKB.toFixed(1)}KB</span></div>
              <div>Non-virtualized: <span className="font-mono">{eventsMemory.nonVirtualizedKB.toFixed(1)}KB</span></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Data Table Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div>Rows: <span className="font-mono">{sampleTableData.length.toLocaleString()}</span></div>
              <div>Memory saved: <span className="font-mono text-green-600">{tableMemory.memorySavings.toFixed(1)}%</span></div>
              <div>Virtualized: <span className="font-mono">{tableMemory.virtualizedKB.toFixed(1)}KB</span></div>
              <div>Non-virtualized: <span className="font-mono">{tableMemory.nonVirtualizedKB.toFixed(1)}KB</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="bacteria" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="bacteria">Bacteria List</TabsTrigger>
          <TabsTrigger value="history">Simulation History</TabsTrigger>
          <TabsTrigger value="table">Data Table</TabsTrigger>
        </TabsList>

        <TabsContent value="bacteria" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VirtualizedBacteriaList
                bacteria={largeBacteriaDataset}
                height={600}
                onBacteriumSelect={setSelectedBacterium}
                selectedBacteriumId={selectedBacterium?.id}
              />
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Bacterium</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedBacterium ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-6 h-6 rounded-full border-2"
                          style={{
                            backgroundColor: selectedBacterium.color,
                            borderColor: selectedBacterium.isResistant ? '#ffffff' : 'transparent',
                          }}
                        />
                        <span className="font-mono text-sm">{selectedBacterium.id}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Generation: {selectedBacterium.generation}</div>
                        <div>Age: {selectedBacterium.age}</div>
                        <div>Fitness: {(selectedBacterium.fitness * 100).toFixed(1)}%</div>
                        <div>Size: {selectedBacterium.size.toFixed(1)}px</div>
                        <div>X: {selectedBacterium.x.toFixed(0)}</div>
                        <div>Y: {selectedBacterium.y.toFixed(0)}</div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {selectedBacterium.isResistant && (
                          <Badge variant="destructive">Resistant</Badge>
                        )}
                        {selectedBacterium.parentId && (
                          <Badge variant="outline">Has Parent</Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Click on a bacterium to view details
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dataset Info</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>Total bacteria: {largeBacteriaDataset.length.toLocaleString()}</div>
                  <div>Resistant: {largeBacteriaDataset.filter(b => b.isResistant).length.toLocaleString()} ({((largeBacteriaDataset.filter(b => b.isResistant).length / largeBacteriaDataset.length) * 100).toFixed(1)}%)</div>
                  <div>Generations: {Math.max(...largeBacteriaDataset.map(b => b.generation)) + 1}</div>
                  <div>Avg fitness: {(largeBacteriaDataset.reduce((sum, b) => sum + b.fitness, 0) / largeBacteriaDataset.length * 100).toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VirtualizedSimulationHistory
                events={simulationEvents}
                height={600}
                onEventSelect={setSelectedEvent}
                selectedEventId={selectedEvent?.id}
              />
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Event</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedEvent ? (
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium">{selectedEvent.title}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          Gen {selectedEvent.generation} • {selectedEvent.type.replace('_', ' ')}
                        </div>
                      </div>
                      
                      <p className="text-sm">{selectedEvent.description}</p>
                      
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant={selectedEvent.severity === 'critical' ? 'destructive' : 'outline'}
                          className="capitalize"
                        >
                          {selectedEvent.severity}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {selectedEvent.type.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      {Object.keys(selectedEvent.data).length > 0 && (
                        <div className="pt-2 border-t">
                          <div className="text-sm font-medium mb-2">Event Data:</div>
                          <div className="space-y-1 text-xs">
                            {Object.entries(selectedEvent.data).map(([key, value]) => (
                              value !== undefined && (
                                <div key={key} className="flex justify-between">
                                  <span className="capitalize">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                                  <span className="font-mono">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Click on an event to view details
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Timeline Stats</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>Total events: {simulationEvents.length.toLocaleString()}</div>
                  <div>Time span: {Math.ceil((simulationEvents[0]?.timestamp.getTime() - simulationEvents[simulationEvents.length - 1]?.timestamp.getTime()) / (1000 * 60 * 60 * 24))} days</div>
                  <div>Critical events: {simulationEvents.filter(e => e.severity === 'critical').length}</div>
                  <div>Resistance events: {simulationEvents.filter(e => e.type === 'resistance_emergence').length}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="table" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <VirtualizedDataTable
                data={sampleTableData}
                columns={tableColumns}
                height={600}
                title="Sample Data Table"
                onRowSelect={(item, index) => {
                  setSelectedTableRow(item);
                  setSelectedTableIndex(index);
                }}
                selectedRowIndex={selectedTableIndex}
              />
            </div>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selected Row</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedTableRow ? (
                    <div className="space-y-3">
                      <div>
                        <div className="font-medium">{selectedTableRow.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                          {selectedTableRow.id}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>Value: {selectedTableRow.value.toFixed(2)}</div>
                        <div>Category: {selectedTableRow.category}</div>
                        <div>Status: {selectedTableRow.status}</div>
                        <div>Index: {selectedTableIndex}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium">Description:</div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedTableRow.description}
                        </p>
                      </div>
                      
                      <div className="text-xs text-gray-500">
                        Created: {selectedTableRow.createdAt.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">
                      Click on a table row to view details
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Table Stats</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div>Total rows: {sampleTableData.length.toLocaleString()}</div>
                  <div>Active: {sampleTableData.filter(r => r.status === 'active').length.toLocaleString()}</div>
                  <div>Inactive: {sampleTableData.filter(r => r.status === 'inactive').length.toLocaleString()}</div>
                  <div>Pending: {sampleTableData.filter(r => r.status === 'pending').length.toLocaleString()}</div>
                  <div>Categories: {new Set(sampleTableData.map(r => r.category)).size}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Virtualization Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-2">
              <h4 className="font-medium">Performance</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Only renders visible items</li>
                <li>• Constant memory usage</li>
                <li>• Smooth scrolling</li>
                <li>• Fast initial load</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Scalability</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Handles millions of items</li>
                <li>• No performance degradation</li>
                <li>• Memory efficient</li>
                <li>• Browser stays responsive</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Features</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Search and filtering</li>
                <li>• Sorting capabilities</li>
                <li>• Selection support</li>
                <li>• Custom cell rendering</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">User Experience</h4>
              <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                <li>• Instant interactions</li>
                <li>• Responsive interface</li>
                <li>• No loading delays</li>
                <li>• Smooth animations</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 
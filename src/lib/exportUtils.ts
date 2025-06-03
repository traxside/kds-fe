"use client";

import { Simulation } from "@/types/simulation";

// Export formats supported
export type ExportFormat = "json" | "csv";

// Export options interface
export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  includeBacteriaData?: boolean;
  includeStatistics?: boolean;
  compress?: boolean;
  filename?: string;
}

// Progress callback for large exports
export type ExportProgressCallback = (progress: number, message?: string) => void;

// CSV row interface for type safety
interface CSVRow {
  [key: string]: string | number | boolean;
}

/**
 * Export utilities for simulation data
 */
export class SimulationExporter {
  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-z0-9]/gi, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase();
  }

  private static generateFilename(simulation: Simulation, format: ExportFormat): string {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
    const baseName = simulation.name ? 
      this.sanitizeFilename(simulation.name) : 
      `simulation_${simulation.id}`;
    
    return `${baseName}_${timestamp}.${format}`;
  }

  private static convertToCSV(data: CSVRow[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(",");
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Handle values that might contain commas or quotes
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    );

    return [csvHeaders, ...csvRows].join("\n");
  }

  /**
   * Export a single simulation to JSON format
   */
  static async exportSimulationJSON(
    simulation: Simulation, 
    options: Partial<ExportOptions> = {},
    onProgress?: ExportProgressCallback
  ): Promise<void> {
    try {
      onProgress?.(10, "Preparing simulation data...");

      // Compute status from simulation state
      const getSimulationStatus = (sim: Simulation) => {
        if (sim.currentState.isRunning) return "running";
        if (sim.currentState.isPaused) return "paused";
        if (sim.completedAt) return "completed";
        return "ready";
      };

      const exportData: {
        metadata: {
          exportDate: string;
          version: string;
          type: string;
        };
        simulation: {
          id: string;
          name: string;
          description?: string;
          createdAt: string;
          updatedAt: string;
          status: string;
          parameters?: typeof simulation.parameters;
          statistics?: typeof simulation.statistics;
          bacteria?: typeof simulation.currentState.bacteria;
        };
      } = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: "1.0",
          type: "simulation_export"
        },
        simulation: {
          id: simulation.id,
          name: simulation.name,
          description: simulation.description,
          createdAt: simulation.createdAt,
          updatedAt: simulation.updatedAt,
          status: getSimulationStatus(simulation)
        }
      };

      onProgress?.(30, "Processing parameters...");

      if (options.includeMetadata !== false) {
        exportData.simulation.parameters = simulation.parameters;
      }

      onProgress?.(50, "Processing statistics...");

      if (options.includeStatistics !== false && simulation.statistics) {
        exportData.simulation.statistics = simulation.statistics;
      }

      onProgress?.(70, "Processing bacteria data...");

      if (options.includeBacteriaData && simulation.currentState?.bacteria) {
        exportData.simulation.bacteria = simulation.currentState.bacteria || [];
      }

      onProgress?.(90, "Generating file...");

      const jsonContent = JSON.stringify(exportData, null, 2);
      const filename = options.filename || this.generateFilename(simulation, "json");

      onProgress?.(100, "Download ready!");

      this.downloadFile(jsonContent, filename, "application/json");
    } catch (error) {
      console.error("Export failed:", error);
      throw new Error(`Failed to export simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export a single simulation to CSV format
   */
  static async exportSimulationCSV(
    simulation: Simulation,
    options: Partial<ExportOptions> = {},
    onProgress?: ExportProgressCallback
  ): Promise<void> {
    try {
      onProgress?.(10, "Preparing simulation data...");

      // Compute status from simulation state
      const getSimulationStatus = (sim: Simulation) => {
        if (sim.currentState.isRunning) return "running";
        if (sim.currentState.isPaused) return "paused";
        if (sim.completedAt) return "completed";
        return "ready";
      };

      const csvData: CSVRow[] = [];

      // Add metadata row
      if (options.includeMetadata !== false) {
        csvData.push({
          type: "metadata",
          id: simulation.id,
          name: simulation.name || "",
          description: simulation.description || "",
          status: getSimulationStatus(simulation),
          created_at: simulation.createdAt,
          updated_at: simulation.updatedAt
        });
      }

      onProgress?.(30, "Processing parameters...");

      // Add parameters row
      if (simulation.parameters) {
        csvData.push({
          type: "parameters",
          initial_population: simulation.parameters.initialPopulation,
          growth_rate: simulation.parameters.growthRate,
          antibiotic_concentration: simulation.parameters.antibioticConcentration,
          mutation_rate: simulation.parameters.mutationRate,
          duration: simulation.parameters.duration,
          petri_dish_size: simulation.parameters.petriDishSize
        });
      }

      onProgress?.(50, "Processing statistics...");

      // Add statistics rows
      if (options.includeStatistics !== false && simulation.statistics) {
        const stats = simulation.statistics;
        const headers = Object.keys(stats);
        const csvRows: string[] = [headers.join(",")];
        
        stats.totalPopulation.forEach((_, index) => {
          const row = headers.map(header => {
            const key = header.toLowerCase().replace(/\s+/g, "") as keyof typeof stats;
            const values = stats[key] as number[];
            return values[index]?.toString() || "0";
          });
          csvRows.push(row.join(","));
        });
      }

      onProgress?.(70, "Processing bacteria data...");

      // Add bacteria data if requested
      if (options.includeBacteriaData && simulation.currentState?.bacteria) {
        simulation.currentState.bacteria.forEach((bacterium) => {
          csvData.push({
            type: "bacterium",
            bacterium_id: bacterium.id,
            x: bacterium.x,
            y: bacterium.y,
            is_resistant: bacterium.isResistant,
            fitness: bacterium.fitness || 0,
            age: bacterium.age || 0,
            generation: bacterium.generation || 0,
            parent_id: bacterium.parentId || "",
            color: bacterium.color,
            size: bacterium.size || 5
          });
        });
      }

      onProgress?.(90, "Generating CSV file...");

      const csvContent = this.convertToCSV(csvData);
      const filename = options.filename || this.generateFilename(simulation, "csv");

      onProgress?.(100, "Download ready!");

      this.downloadFile(csvContent, filename, "text/csv");
    } catch (error) {
      console.error("CSV export failed:", error);
      throw new Error(`Failed to export simulation as CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export multiple simulations as a batch
   */
  static async exportSimulationsBatch(
    simulations: Simulation[],
    format: ExportFormat = "json",
    options: Partial<ExportOptions> = {},
    onProgress?: ExportProgressCallback
  ): Promise<void> {
    try {
      onProgress?.(5, `Preparing to export ${simulations.length} simulations...`);

      if (format === "json") {
        const batchData = {
          metadata: {
            exportDate: new Date().toISOString(),
            version: "1.0",
            type: "batch_simulation_export",
            count: simulations.length
          },
          simulations: simulations
        };

        onProgress?.(80, "Generating batch JSON file...");
        
        const jsonContent = JSON.stringify(batchData, null, 2);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
        const filename = options.filename || `simulation_batch_${timestamp}.json`;

        onProgress?.(100, "Batch download ready!");
        this.downloadFile(jsonContent, filename, "application/json");
      } else {
        // For CSV, we'll create separate files in a ZIP (simplified approach: single CSV with all data)
        const allCsvData: CSVRow[] = [];
        
        for (let i = 0; i < simulations.length; i++) {
          const simulation = simulations[i];
          const progress = 20 + (i / simulations.length) * 60;
          onProgress?.(progress, `Processing simulation ${i + 1} of ${simulations.length}...`);

          // Add separator row for each simulation
          allCsvData.push({
            type: "simulation_separator",
            simulation_id: simulation.id,
            simulation_name: simulation.name || "",
            simulation_index: i + 1
          });

          // Add simulation data (reuse single simulation logic)
          // This is a simplified version - you could enhance this
          if (simulation.parameters) {
            allCsvData.push({
              type: "parameters",
              simulation_id: simulation.id,
              initial_population: simulation.parameters.initialPopulation,
              growth_rate: simulation.parameters.growthRate,
              antibiotic_concentration: simulation.parameters.antibioticConcentration,
              mutation_rate: simulation.parameters.mutationRate,
              duration: simulation.parameters.duration,
              petri_dish_size: simulation.parameters.petriDishSize
            });
          }
        }

        onProgress?.(90, "Generating batch CSV file...");
        
        const csvContent = this.convertToCSV(allCsvData);
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, "");
        const filename = options.filename || `simulation_batch_${timestamp}.csv`;

        onProgress?.(100, "Batch CSV download ready!");
        this.downloadFile(csvContent, filename, "text/csv");
      }
    } catch (error) {
      console.error("Batch export failed:", error);
      throw new Error(`Failed to export simulations batch: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Convenience functions for easier usage
export const exportSimulationJSON = SimulationExporter.exportSimulationJSON.bind(SimulationExporter);
export const exportSimulationCSV = SimulationExporter.exportSimulationCSV.bind(SimulationExporter);
export const exportSimulationsBatch = SimulationExporter.exportSimulationsBatch.bind(SimulationExporter);

export default SimulationExporter; 
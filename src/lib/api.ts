import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { SimulationParametersInput, Simulation } from "@/types/simulation";

// Configuration constants
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Generic API error class compatible with Axios
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Logging utility
const apiLogger = {
  log: (level: "info" | "error" | "warn", message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      console[level](`[API] ${message}`, data || "");
    }
  },
};

// Create Axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor for logging and authentication
api.interceptors.request.use(
  (config) => {
    // Add request ID for tracking
    const requestId = Math.random().toString(36).substring(7);
    config.headers["X-Request-ID"] = requestId;

    // Log outgoing request
    apiLogger.log(
      "info",
      `Request ${requestId}: ${config.method?.toUpperCase()} ${config.url}`,
      {
        headers: config.headers,
        data: config.data,
      }
    );

    // Add auth token if available (placeholder for future auth implementation)
    const token =
      typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    apiLogger.log("error", "Request interceptor error", error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const requestId = response.config.headers["X-Request-ID"];
    apiLogger.log(
      "info",
      `Response ${requestId}: ${response.status} ${response.statusText}`,
      {
        data: response.data,
      }
    );
    return response;
  },
  (error: AxiosError) => {
    const requestId = error.config?.headers?.["X-Request-ID"];

    // Transform Axios error to our ApiError format
    if (error.response) {
      // Server responded with error status
      const errorData = error.response.data as Record<string, unknown>; // Type assertion for error response data
      const apiError = new ApiError(
        error.response.status,
        errorData?.message as string ||
          `HTTP ${error.response.status}: ${error.response.statusText}`,
        errorData,
        error.code
      );

      apiLogger.log(
        "error",
        `Response ${requestId}: ${apiError.status} ${apiError.message}`,
        {
          data: apiError.data,
        }
      );

      return Promise.reject(apiError);
    } else if (error.request) {
      // Network error or timeout
      const networkError = new ApiError(
        0,
        "Network error: Unable to reach the server",
        null,
        error.code
      );

      apiLogger.log("error", `Network error ${requestId}:`, error.message);

      return Promise.reject(networkError);
    } else {
      // Request setup error
      const setupError = new ApiError(
        0,
        `Request setup error: ${error.message}`,
        null,
        error.code
      );

      apiLogger.log("error", `Setup error ${requestId}:`, error.message);

      return Promise.reject(setupError);
    }
  }
);

// Retry mechanism with exponential backoff
const retryRequest = async <T>(
  requestFn: () => Promise<AxiosResponse<T>>,
  retries: number = MAX_RETRIES,
  delay: number = RETRY_DELAY
): Promise<AxiosResponse<T>> => {
  try {
    return await requestFn();
  } catch (error) {
    if (retries === 0) {
      throw error;
    }

    // Only retry on network errors or 5xx server errors
    const shouldRetry =
      (error instanceof ApiError &&
        (error.status === 0 || error.status >= 500)) ||
      (error instanceof Error && error.message.includes("timeout"));

    if (!shouldRetry) {
      throw error;
    }

    apiLogger.log(
      "warn",
      `Retrying request in ${delay}ms. Retries left: ${retries - 1}`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryRequest(requestFn, retries - 1, delay * 2); // Exponential backoff
  }
};

// API service for simulation operations
export const simulationApi = {
  // Create a new simulation
  createSimulation: (
    data: { name: string; parameters: SimulationParametersInput },
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.post<Simulation>("/simulations", data, axiosConfig)
    );
  },

  // Get all simulations
  getSimulations: (config?: AxiosRequestConfig & { signal?: AbortSignal }) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.get<Simulation[]>("/simulations", axiosConfig)
    );
  },

  // Get a specific simulation by ID
  getSimulation: (
    id: string,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.get<Simulation>(`/simulations/${id}`, axiosConfig)
    );
  },

  // Update simulation parameters
  updateSimulation: (
    id: string,
    data: { parameters: Partial<SimulationParametersInput> },
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.put<Simulation>(`/simulations/${id}`, data, axiosConfig)
    );
  },

  // Start a simulation
  startSimulation: (
    id: string,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.post<Simulation>(`/simulations/${id}/start`, {}, axiosConfig)
    );
  },

  // Stop a simulation
  stopSimulation: (
    id: string,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.post<Simulation>(`/simulations/${id}/stop`, {}, axiosConfig)
    );
  },

  // Reset a simulation
  resetSimulation: (
    id: string,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.post<Simulation>(`/simulations/${id}/reset`, {}, axiosConfig)
    );
  },

  // Delete a simulation
  deleteSimulation: (
    id: string,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.delete<void>(`/simulations/${id}`, axiosConfig)
    );
  },

  // Step simulation forward (for manual control)
  stepSimulation: (
    id: string,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.post<Simulation>(`/simulations/${id}/step`, {}, axiosConfig)
    );
  },

  // Update simulation speed
  updateSimulationSpeed: (
    id: string,
    speed: number,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.put<Simulation>(`/simulations/${id}/speed`, { speed }, axiosConfig)
    );
  },

  // Health check
  healthCheck: (config?: AxiosRequestConfig & { signal?: AbortSignal }) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() => api.get<unknown>("/health", axiosConfig));
  },

  // Save simulation snapshot (clone current state with new name)
  saveSimulationSnapshot: (
    sourceId: string,
    data: { name: string; description?: string },
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.post<Simulation>(`/simulations/${sourceId}/snapshot`, data, axiosConfig)
    );
  },

  // Load simulation (duplicate functionality for clarity)
  loadSimulation: (
    id: string,
    config?: AxiosRequestConfig & { signal?: AbortSignal }
  ) => {
    const { signal, ...axiosConfig } = config || {};
    if (signal) {
      (axiosConfig as AxiosRequestConfig).signal = signal;
    }
    return retryRequest(() =>
      api.get<Simulation>(`/simulations/${id}`, axiosConfig)
    );
  },
};

// Convenience methods with simplified API (backward compatibility)
export const simulationApiSimple = {
  // Create a new simulation
  async createSimulation(
    name: string,
    parameters: SimulationParametersInput,
    signal?: AbortSignal
  ): Promise<Simulation> {
    const response = await simulationApi.createSimulation(
      { name, parameters },
      { signal }
    );
    return response.data;
  },

  // Get all simulations
  async getSimulations(signal?: AbortSignal): Promise<Simulation[]> {
    const response = await simulationApi.getSimulations({ signal });
    return response.data;
  },

  // Get a specific simulation by ID
  async getSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
    const response = await simulationApi.getSimulation(id, { signal });
    return response.data;
  },

  // Update simulation parameters
  async updateSimulation(
    id: string,
    parameters: Partial<SimulationParametersInput>,
    signal?: AbortSignal
  ): Promise<Simulation> {
    const response = await simulationApi.updateSimulation(
      id,
      { parameters },
      { signal }
    );
    return response.data;
  },

  // Start a simulation
  async startSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
    const response = await simulationApi.startSimulation(id, { signal });
    return response.data;
  },

  // Stop a simulation
  async stopSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
    const response = await simulationApi.stopSimulation(id, { signal });
    return response.data;
  },

  // Reset a simulation
  async resetSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
    const response = await simulationApi.resetSimulation(id, { signal });
    return response.data;
  },

  // Delete a simulation
  async deleteSimulation(id: string, signal?: AbortSignal): Promise<void> {
    await simulationApi.deleteSimulation(id, { signal });
  },

  // Step simulation forward (for manual control)
  async stepSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
    const response = await simulationApi.stepSimulation(id, { signal });
    return response.data;
  },

  // Health check
  async healthCheck(signal?: AbortSignal) {
    const response = await simulationApi.healthCheck({ signal });
    return response.data;
  },

  // Save simulation snapshot (clone with new name)
  async saveSimulationSnapshot(
    sourceId: string,
    name: string,
    description?: string,
    signal?: AbortSignal
  ): Promise<Simulation> {
    const response = await simulationApi.saveSimulationSnapshot(
      sourceId,
      { name, description },
      { signal }
    );
    return response.data;
  },

  // Load simulation (alias for getSimulation for semantic clarity)
  async loadSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
    const response = await simulationApi.loadSimulation(id, { signal });
    return response.data;
  },

  // Update simulation speed
  async updateSimulationSpeed(id: string, speed: number, signal?: AbortSignal): Promise<Simulation> {
    const response = await simulationApi.updateSimulationSpeed(id, speed, { signal });
    return response.data;
  }
};

// Mock API service for development and testing
export const mockSimulationApi = {
  // Mock data
  mockSimulations: [
    {
      id: "mock-1",
      name: "Test Simulation 1",
      parameters: {
        initialPopulation: 100,
        growthRate: 0.1,
        antibioticConcentration: 0.0,
        mutationRate: 0.01,
        duration: 100,
        petriDishSize: 600,
      },
      currentState: {
        generation: 0,
        timeElapsed: 0,
        bacteria: [],
        isRunning: false,
        isPaused: false,
        stepCount: 0,
        simulationSpeed: 1,
      },
      statistics: {
        totalPopulation: [100],
        resistantCount: [20],
        sensitiveCount: [80],
        averageFitness: [0.75],
        mutationEvents: [0],
        generations: [0],
        antibioticDeaths: [0],
        naturalDeaths: [0],
        reproductions: [0],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ] as Simulation[],

  // Mock methods
  async createSimulation(
    name: string,
    parameters: SimulationParametersInput
  ): Promise<Simulation> {
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay

    const newSimulation: Simulation = {
      id: `mock-${Date.now()}`,
      name,
      parameters,
      currentState: {
        generation: 0,
        timeElapsed: 0,
        bacteria: [],
        isRunning: false,
        isPaused: false,
        stepCount: 0,
        simulationSpeed: 1,
      },
      statistics: {
        totalPopulation: [parameters.initialPopulation],
        resistantCount: [Math.floor(parameters.initialPopulation * 0.2)],
        sensitiveCount: [Math.floor(parameters.initialPopulation * 0.8)],
        averageFitness: [0.75],
        mutationEvents: [0],
        generations: [0],
        antibioticDeaths: [0],
        naturalDeaths: [0],
        reproductions: [0],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.mockSimulations.push(newSimulation);
    return newSimulation;
  },

  async getSimulations(): Promise<Simulation[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return [...this.mockSimulations];
  },

  async getSimulation(id: string): Promise<Simulation> {
    await new Promise((resolve) => setTimeout(resolve, 200));
    const simulation = this.mockSimulations.find((s) => s.id === id);
    if (!simulation) {
      throw new ApiError(404, `Simulation with id ${id} not found`);
    }
    return simulation;
  },

  async deleteSimulation(id: string): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const index = this.mockSimulations.findIndex((s) => s.id === id);
    if (index === -1) {
      throw new ApiError(404, `Simulation with id ${id} not found`);
    }
    this.mockSimulations.splice(index, 1);
  },

  async healthCheck() {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      status: "healthy",
      message: "Mock API service is running",
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        state: "ready",
      },
    };
  },

  // Save simulation snapshot (clone with new name)
  async saveSimulationSnapshot(
    sourceId: string,
    name: string,
    description?: string
  ): Promise<Simulation> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    const sourceSimulation = this.mockSimulations.find((s) => s.id === sourceId);
    if (!sourceSimulation) {
      throw new ApiError(404, `Source simulation with id ${sourceId} not found`);
    }

    // Create a deep copy of the source simulation with new name and ID
    const newSimulation: Simulation = {
      ...JSON.parse(JSON.stringify(sourceSimulation)), // Deep copy
      id: `mock-snapshot-${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: undefined, // Reset completion status
    };

    this.mockSimulations.push(newSimulation);
    return newSimulation;
  },

  // Load simulation (alias for getSimulation)
  async loadSimulation(id: string): Promise<Simulation> {
    return this.getSimulation(id);
  },
};

// Utility function for handling API errors in components
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred";
}

// Utility function to check if error is network-related
export function isNetworkError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 0;
}

// Utility function to check if error is server-related
export function isServerError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 500;
}

// Utility function to check if error is client-related
export function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

// Request cancellation utility
export function createAbortController(): AbortController {
  return new AbortController();
}

// Export default as the simple API for backward compatibility
export default simulationApiSimple;

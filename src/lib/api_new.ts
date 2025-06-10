import axios, { AxiosError,  AxiosResponse } from "axios";
import { SimulationParametersInput, Simulation } from "@/types/simulation";

// Configuration constants
const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
const HEALTH_BASE_URL = 
    process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000";
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Generic API error class
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

        // Add auth token if available
        if (typeof window !== "undefined") {
            const token = localStorage.getItem("auth_token");
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
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

        if (error.response) {
            // Server responded with error status
            const errorData = error.response.data as Record<string, unknown>;
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
                { data: apiError.data }
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
): Promise<T> => {
    try {
        const response = await requestFn();
        return response.data; // Extract data here
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

// Simplified API service for simulation operations
export const simulationApiSimple = {
    // Create a new simulation
    async createSimulation(
        name: string,
        parameters: SimulationParametersInput,
        signal?: AbortSignal
    ): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.post<{message: string, simulation: Simulation}>("/simulations", { name, parameters }, { signal })
        );
        
        // Backend returns {message, simulation}, extract simulation object
        console.log('[API] createSimulation response:', response);
        
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        // If response is already a Simulation object (fallback)
        return response as Simulation;
    },

    // Get all simulations
    async getSimulations(signal?: AbortSignal): Promise<Simulation[]> {
        return retryRequest(() =>
            api.get<Simulation[]>("/simulations", { signal })
        );
    },

    // Get a specific simulation by ID
    async getSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.get<{simulation: Simulation}>(`/simulations/${id}`, { signal })
        );
        
        // Backend returns {simulation}, extract simulation object
        console.log('[API] getSimulation response:', response);
        
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        // If response is already a Simulation object (fallback)
        return response as Simulation;
    },

    // Update simulation parameters
    async updateSimulation(
        id: string,
        parameters: Partial<SimulationParametersInput>,
        signal?: AbortSignal
    ): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.put<{message: string, simulation: Simulation}>(`/simulations/${id}`, { parameters }, { signal })
        );
        
        // Backend returns {message, simulation}, extract simulation object
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        return response as Simulation;
    },

    // Start a simulation
    async startSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.put<{message: string, simulation: Simulation}>(`/simulations/${id}/start`, {}, { signal })
        );
        
        // Backend returns {message, simulation}, extract simulation object
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        return response as Simulation;
    },

    // Stop a simulation
    async stopSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.post<{message: string, simulation: Simulation}>(`/simulations/${id}/stop`, {}, { signal })
        );
        
        // Backend returns {message, simulation}, extract simulation object
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        return response as Simulation;
    },

    // Reset a simulation
    async resetSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.post<{message: string, simulation: Simulation}>(`/simulations/${id}/reset`, {}, { signal })
        );
        
        // Backend returns {message, simulation}, extract simulation object
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        return response as Simulation;
    },

    // Delete a simulation
    async deleteSimulation(id: string, signal?: AbortSignal): Promise<void> {
        return retryRequest(() =>
            api.delete<void>(`/simulations/${id}`, { signal })
        );
    },

    // Step simulation (advance one generation)
    async stepSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.put<{message: string, simulation: Simulation}>(`/simulations/${id}/step`, {}, { signal })
        );
        
        // Backend returns {message, simulation}, extract simulation object
        console.log('[API] stepSimulation response:', response);
        
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        // If response is already a Simulation object (fallback)
        return response as Simulation;
    },

    // Run complete simulation to final generation
    async runFullSimulation(id: string, signal?: AbortSignal): Promise<any> {
        const response = await retryRequest(() =>
            api.put<{message: string, simulation: Simulation, allGenerations: any[]}>(`/simulations/${id}/run-full`, {}, { signal })
        );
        
        // Backend returns {message, simulation, allGenerations} - return full response
        console.log('[API] runFullSimulation response:', response);
        
        // Return the full response object so the hook can access both simulation and allGenerations
        return response;
    },

    // Update simulation speed
    async updateSimulationSpeed(
        id: string,
        speed: number,
        signal?: AbortSignal
    ): Promise<Simulation> {
        const response = await retryRequest(() =>
            api.put<{message: string, simulation: Simulation}>(`/simulations/${id}/speed`, { speed }, { signal })
        );
        
        // Backend returns {message, simulation}, extract simulation object
        if (response && typeof response === 'object' && 'simulation' in response) {
            return response.simulation;
        }
        
        return response as Simulation;
    },

    // Health check
    async healthCheck(signal?: AbortSignal): Promise<unknown> {
         // Create a separate instance for health check without /api prefix
        const healthApi = axios.create({
            baseURL: HEALTH_BASE_URL,
            timeout: DEFAULT_TIMEOUT,
            headers: {
                "Content-Type": "application/json",
            },
        });
        
        return retryRequest(() =>
            healthApi.get<unknown>("/health", { signal })
        );
    },

    // Save simulation snapshot (clone current state with new name)
    async saveSimulationSnapshot(
        sourceId: string,
        name: string,
        description?: string,
        signal?: AbortSignal
    ): Promise<Simulation> {
        return retryRequest(() =>
            api.post<Simulation>(
                `/simulations/${sourceId}/snapshot`,
                { name, description },
                { signal }
            )
        );
    },

    // Load simulation (alias for getSimulation for semantic clarity)
    async loadSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        return this.getSimulation(id, signal);
    },
};

// Utility functions for error handling
export function getErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        return error.message;
    }
    if (error instanceof Error) {
        return error.message;
    }
    return "An unexpected error occurred";
}

export function isNetworkError(error: unknown): boolean {
    return error instanceof ApiError && error.status === 0;
}

export function isServerError(error: unknown): boolean {
    return error instanceof ApiError && error.status >= 500;
}

export function isClientError(error: unknown): boolean {
    return error instanceof ApiError && error.status >= 400 && error.status < 500;
}

export function createAbortController(): AbortController {
    return new AbortController();
}

// Export the main API as default
export default simulationApiSimple;

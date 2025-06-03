import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { SimulationParametersInput, Simulation } from "@/types/simulation";

// Configuration constants
const API_ENDPOINT = 'http://localhost:5000/api'; // Replace with your backend URL (e.g., 'http://localhost:5000' or 'https://yourdomain.com')
const API_BASE_URL = `${API_ENDPOINT}/api`;
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

// Response types based on your backend controller
interface PaginationResponse<T> {
    simulations: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

interface SimulationStepResponse {
    message: string;
    simulation: {
        id: string;
        generation: number;
        population: number;
        resistant: number;
        sensitive: number;
        averageFitness: number;
        isCompleted: boolean;
    };
}

interface SimulationControlResponse {
    message: string;
    simulation: {
        id: string;
        isRunning?: boolean;
        isPaused?: boolean;
        generation: number;
    };
}

interface SimulationCreateResponse {
    message: string;
    simulation: Simulation;
}

interface SimulationDeleteResponse {
    message: string;
    simulationId: string;
}

// API service for simulation operations
export const simulationApi = {
    // Create a new simulation - POST /api/simulations
    createSimulation: (
        data: {
            name: string;
            description?: string;
            parameters: SimulationParametersInput
        },
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }
        return retryRequest(() =>
            api.post<SimulationCreateResponse>("/simulations", data, axiosConfig)
        );
    },

    // Get all simulations with pagination and filtering - GET /api/simulations
    getSimulations: (
        params?: {
            page?: number;
            limit?: number;
            status?: 'running' | 'paused' | 'completed';
            search?: string;
        },
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }

        // Add query parameters
        if (params) {
            axiosConfig.params = params;
        }

        return retryRequest(() =>
            api.get<PaginationResponse<Simulation>>("/simulations", axiosConfig)
        );
    },

    // Get a specific simulation by ID - GET /api/simulations/:id
    getSimulation: (
        id: string,
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }
        return retryRequest(() =>
            api.get<{ simulation: Simulation }>(`/simulations/${id}`, axiosConfig)
        );
    },

    // Advance simulation by one generation - PUT /api/simulations/:id/step
    stepSimulation: (
        id: string,
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }
        return retryRequest(() =>
            api.put<SimulationStepResponse>(`/simulations/${id}/step`, {}, axiosConfig)
        );
    },

    // Start or resume simulation - PUT /api/simulations/:id/start
    startSimulation: (
        id: string,
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }
        return retryRequest(() =>
            api.put<SimulationControlResponse>(`/simulations/${id}/start`, {}, axiosConfig)
        );
    },

    // Pause simulation - PUT /api/simulations/:id/pause
    pauseSimulation: (
        id: string,
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }
        return retryRequest(() =>
            api.put<SimulationControlResponse>(`/simulations/${id}/pause`, {}, axiosConfig)
        );
    },

    // Export simulation data - GET /api/simulations/:id/export
    exportSimulation: (
        id: string,
        format: 'json' | 'csv' = 'json',
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }

        // Set response type based on format
        if (format === 'csv') {
            axiosConfig.responseType = 'blob';
        }

        axiosConfig.params = { format };

        return retryRequest(() =>
            api.get(`/simulations/${id}/export`, axiosConfig)
        );
    },

    // Delete simulation - DELETE /api/simulations/:id
    deleteSimulation: (
        id: string,
        config?: AxiosRequestConfig & { signal?: AbortSignal }
    ) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }
        return retryRequest(() =>
            api.delete<SimulationDeleteResponse>(`/simulations/${id}`, axiosConfig)
        );
    },

    // Health check (if implemented in your backend)
    healthCheck: (config?: AxiosRequestConfig & { signal?: AbortSignal }) => {
        const { signal, ...axiosConfig } = config || {};
        if (signal) {
            (axiosConfig as AxiosRequestConfig).signal = signal;
        }
        return retryRequest(() => api.get<unknown>("/health", axiosConfig));
    },
};

// Convenience methods with simplified API (backward compatibility)
export const simulationApiSimple = {
    // Create a new simulation
    async createSimulation(
        name: string,
        parameters: SimulationParametersInput,
        description?: string,
        signal?: AbortSignal
    ): Promise<Simulation> {
        const response = await simulationApi.createSimulation(
            { name, description, parameters },
            { signal }
        );
        return response.data.simulation;
    },

    // Get all simulations
    async getSimulations(
        options?: {
            page?: number;
            limit?: number;
            status?: 'running' | 'paused' | 'completed';
            search?: string;
        },
        signal?: AbortSignal
    ): Promise<PaginationResponse<Simulation>> {
        const response = await simulationApi.getSimulations(options, { signal });
        return response.data;
    },

    // Get a specific simulation by ID
    async getSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        const response = await simulationApi.getSimulation(id, { signal });
        return response.data.simulation;
    },

    // Step simulation forward by one generation
    async stepSimulation(id: string, signal?: AbortSignal): Promise<SimulationStepResponse> {
        const response = await simulationApi.stepSimulation(id, { signal });
        return response.data;
    },

    // Start a simulation
    async startSimulation(id: string, signal?: AbortSignal): Promise<SimulationControlResponse> {
        const response = await simulationApi.startSimulation(id, { signal });
        return response.data;
    },

    // Pause a simulation
    async pauseSimulation(id: string, signal?: AbortSignal): Promise<SimulationControlResponse> {
        const response = await simulationApi.pauseSimulation(id, { signal });
        return response.data;
    },

    // // Export simulation data
    // async exportSimulation(
    //     id: string,
    //     format: 'json' | 'csv' = 'json',
    //     signal?: AbortSignal
    // ): Promise<any> {
    //     const response = await simulationApi.exportSimulation(id, format, { signal });
    //     return response.data;
    // },

    // Delete a simulation
    async deleteSimulation(id: string, signal?: AbortSignal): Promise<SimulationDeleteResponse> {
        const response = await simulationApi.deleteSimulation(id, { signal });
        return response.data;
    },

    // Health check
    async healthCheck(signal?: AbortSignal) {
        const response = await simulationApi.healthCheck({ signal });
        return response.data;
    },

    // Load simulation (alias for getSimulation for semantic clarity)
    async loadSimulation(id: string, signal?: AbortSignal): Promise<Simulation> {
        return this.getSimulation(id, signal);
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

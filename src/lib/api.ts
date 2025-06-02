import { SimulationParametersInput, Simulation } from "@/types/simulation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Generic API error class
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Generic API response handler
async function handleApiResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      errorData
    );
  }

  return response.json();
}

// API service for simulation operations
export const simulationApi = {
  // Create a new simulation
  async createSimulation(
    name: string,
    parameters: SimulationParametersInput
  ): Promise<Simulation> {
    const response = await fetch(`${API_BASE_URL}/simulations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        parameters,
      }),
    });

    return handleApiResponse<Simulation>(response);
  },

  // Get all simulations
  async getSimulations(): Promise<Simulation[]> {
    const response = await fetch(`${API_BASE_URL}/simulations`);
    return handleApiResponse<Simulation[]>(response);
  },

  // Get a specific simulation by ID
  async getSimulation(id: string): Promise<Simulation> {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}`);
    return handleApiResponse<Simulation>(response);
  },

  // Update simulation parameters
  async updateSimulation(
    id: string,
    parameters: Partial<SimulationParametersInput>
  ): Promise<Simulation> {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ parameters }),
    });

    return handleApiResponse<Simulation>(response);
  },

  // Start a simulation
  async startSimulation(id: string): Promise<Simulation> {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}/start`, {
      method: "POST",
    });

    return handleApiResponse<Simulation>(response);
  },

  // Stop a simulation
  async stopSimulation(id: string): Promise<Simulation> {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}/stop`, {
      method: "POST",
    });

    return handleApiResponse<Simulation>(response);
  },

  // Reset a simulation
  async resetSimulation(id: string): Promise<Simulation> {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}/reset`, {
      method: "POST",
    });

    return handleApiResponse<Simulation>(response);
  },

  // Delete a simulation
  async deleteSimulation(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        response.status,
        errorData.message || `Failed to delete simulation`,
        errorData
      );
    }
  },

  // Step simulation forward (for manual control)
  async stepSimulation(id: string): Promise<Simulation> {
    const response = await fetch(`${API_BASE_URL}/simulations/${id}/step`, {
      method: "POST",
    });

    return handleApiResponse<Simulation>(response);
  },

  // Health check
  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return handleApiResponse<{
      status: string;
      message: string;
      timestamp: string;
      database: {
        connected: boolean;
        state: string;
      };
    }>(response);
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
  return error instanceof TypeError && error.message.includes("fetch");
}

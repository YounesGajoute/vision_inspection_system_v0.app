/**
 * API Client for Vision Inspection System
 * Handles all REST API communication with backend
 */

import type {
  Program,
  ProgramConfig,
  CaptureOptions,
  CapturedImage,
  OptimizationResult,
  MasterImageUploadResponse,
  ProgramListResponse,
  HealthStatus,
} from '@/types';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Generic request handler with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle non-OK responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // ==================== PROGRAM ENDPOINTS ====================

  /**
   * Create a new inspection program
   */
  async createProgram(name: string, config: ProgramConfig): Promise<Program> {
    return this.request<Program>('/programs', {
      method: 'POST',
      body: JSON.stringify({ name, config }),
    });
  }

  /**
   * Get list of all programs
   */
  async getPrograms(activeOnly: boolean = true): Promise<Program[]> {
    const response = await this.request<ProgramListResponse>(
      `/programs?active_only=${activeOnly}`
    );
    return response.programs;
  }

  /**
   * Get a single program by ID
   */
  async getProgram(id: number): Promise<Program> {
    return this.request<Program>(`/programs/${id}`);
  }

  /**
   * Update an existing program
   */
  async updateProgram(id: number, updates: Partial<{ name: string; config: ProgramConfig }>): Promise<{ message: string; program: Program }> {
    return this.request(`/programs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  /**
   * Delete a program (soft delete)
   */
  async deleteProgram(id: number): Promise<{ message: string }> {
    return this.request(`/programs/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== MASTER IMAGE ENDPOINTS ====================

  /**
   * Upload master image for a program
   */
  async uploadMasterImage(programId: number, file: File): Promise<MasterImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('programId', programId.toString());

    const url = `${this.baseURL}/master-image`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Master image upload failed', error);
      throw error;
    }
  }

  /**
   * Get master image for a program
   */
  async getMasterImage(programId: number): Promise<{ image: string; format: string }> {
    return this.request(`/master-image/${programId}`);
  }

  // ==================== CAMERA ENDPOINTS ====================

  /**
   * Capture a single image from camera
   */
  async captureImage(options: CaptureOptions = {}): Promise<CapturedImage> {
    return this.request<CapturedImage>('/camera/capture', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  /**
   * Auto-optimize camera settings (brightness and focus)
   */
  async autoOptimize(): Promise<OptimizationResult> {
    return this.request<OptimizationResult>('/camera/auto-optimize', {
      method: 'POST',
    });
  }

  /**
   * Start live camera preview
   */
  async startPreview(): Promise<{ message: string }> {
    return this.request('/camera/preview/start', {
      method: 'POST',
    });
  }

  /**
   * Stop live camera preview
   */
  async stopPreview(): Promise<{ message: string }> {
    return this.request('/camera/preview/stop', {
      method: 'POST',
    });
  }

  // ==================== GPIO ENDPOINTS ====================

  /**
   * Get current state of all GPIO outputs
   */
  async getGPIOOutputs(): Promise<{ outputs: Record<number, boolean> }> {
    return this.request('/gpio/outputs');
  }

  /**
   * Set a single GPIO output state
   */
  async setGPIOOutput(outputNumber: number, state: boolean): Promise<{ message: string }> {
    return this.request(`/gpio/outputs/${outputNumber}`, {
      method: 'POST',
      body: JSON.stringify({ state }),
    });
  }

  /**
   * Run GPIO test sequence
   */
  async testGPIO(): Promise<{ message: string }> {
    return this.request('/gpio/test', {
      method: 'POST',
    });
  }

  // ==================== HEALTH CHECK ====================

  /**
   * Get system health status
   */
  async healthCheck(): Promise<HealthStatus> {
    return this.request<HealthStatus>('/health');
  }
}

// Export singleton instance
export const api = new APIClient();

// Export class for testing or custom instances
export default APIClient;


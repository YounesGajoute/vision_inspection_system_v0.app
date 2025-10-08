/**
 * TypeScript type definitions for Vision Inspection System
 */

// ==================== PROGRAM TYPES ====================

export interface Program {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  last_run: string | null;
  total_inspections: number;
  ok_count: number;
  ng_count: number;
  config: ProgramConfig;
  master_image_path: string | null;
  is_active: boolean;
  description?: string;
  success_rate?: number;
  tool_count?: number;
}

export interface ProgramConfig {
  triggerType: 'internal' | 'external';
  triggerInterval?: number;  // For internal trigger (1-10000 ms)
  triggerDelay?: number;      // For external trigger (0-1000 ms)
  brightnessMode: 'normal' | 'hdr' | 'highgain';
  focusValue: number;  // 0-100
  masterImage: string | null;
  tools: ToolConfig[];
  outputs: OutputAssignment;
}

// ==================== TOOL TYPES ====================

export type ToolType = 
  | 'outline' 
  | 'area' 
  | 'color_area' 
  | 'edge_detection' 
  | 'position_adjust';

export interface ToolConfig {
  id: string;
  type: ToolType;
  name: string;
  color: string;  // Hex color for ROI visualization
  roi: ROI;
  threshold: number;  // 0-100
  upperLimit?: number;  // Optional upper limit for range-based judgment (0-200)
  parameters?: Record<string, any>;  // Tool-specific parameters
}

export interface ROI {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ==================== OUTPUT TYPES ====================

export type OutputName = 'OUT1' | 'OUT2' | 'OUT3' | 'OUT4' | 'OUT5' | 'OUT6' | 'OUT7' | 'OUT8';
export type OutputCondition = 'OK' | 'NG' | 'Always ON' | 'Always OFF' | 'Not Used';

export interface OutputAssignment {
  OUT1: OutputCondition;  // BUSY (fixed)
  OUT2: OutputCondition;  // OK signal (fixed)
  OUT3: OutputCondition;  // NG signal (fixed)
  OUT4: OutputCondition;  // Configurable
  OUT5: OutputCondition;  // Configurable
  OUT6: OutputCondition;  // Configurable
  OUT7: OutputCondition;  // Configurable
  OUT8: OutputCondition;  // Configurable
}

// ==================== INSPECTION RESULT TYPES ====================

export interface InspectionResult {
  id?: number;
  program_id: number;
  timestamp: string;
  overall_status: 'OK' | 'NG';
  processing_time_ms: number;
  tool_results: ToolResult[];
  image_path?: string;
  trigger_type: 'internal' | 'external' | 'manual';
  notes?: string;
}

export interface ToolResult {
  tool_type: ToolType;
  name: string;
  status: 'OK' | 'NG';
  matching_rate: number;
  threshold: number;
  upper_limit?: number;
  error?: string;
  offset?: {
    dx: number;
    dy: number;
  };
  confidence?: number;
}

// ==================== CAMERA TYPES ====================

export interface CaptureOptions {
  brightnessMode?: 'normal' | 'hdr' | 'highgain';
  focusValue?: number;
}

export interface CapturedImage {
  image: string;  // Base64 encoded
  quality: ImageQuality;
  timestamp: string;
}

export interface ImageQuality {
  brightness: number;
  sharpness: number;
  exposure: number;
  score: number;  // Overall quality score 0-100
}

export interface OptimizationResult {
  optimalBrightness: 'normal' | 'hdr' | 'highgain';
  optimalFocus: number;
  brightnessScores: {
    normal: number;
    hdr: number;
    highgain: number;
  };
  focusScore: number;
  message: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ProgramListResponse {
  programs: Program[];
}

export interface MasterImageUploadResponse {
  path: string;
  quality: ImageQuality;
  message: string;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  components: {
    camera: 'ok' | 'error';
    gpio: 'ok' | 'error';
    database: 'ok' | 'error';
    storage: 'ok' | 'error';
  };
}

// ==================== WEBSOCKET EVENT TYPES ====================

export interface WebSocketMessage {
  type: string;
  data: any;
}

export interface InspectionResultEvent {
  programId: number;
  status: 'OK' | 'NG';
  toolResults: ToolResult[];
  processingTime: number;
  inspectionCount?: number;
  image?: string;  // Base64 encoded thumbnail
  timestamp: number;
  single?: boolean;
}

export interface LiveFrameEvent {
  image: string;  // Base64 encoded
  frameNumber: number;
  timestamp: number;
}

export interface SystemStatusEvent {
  activeInspections: number;
  activeLiveFeeds: number;
  timestamp: number;
}

export interface ErrorEvent {
  message: string;
  details?: any;
}

// ==================== WIZARD STATE TYPES ====================

export interface WizardState {
  currentStep: number;
  programName: string;
  triggerType: 'internal' | 'external';
  triggerInterval: string;
  externalDelay: string;
  brightnessMode: 'normal' | 'hdr' | 'highgain';
  focusValue: number[];
  masterImageRegistered: boolean;
  masterImagePath: string | null;
  masterImageData: string | null;  // Base64
  configuredTools: ToolConfig[];
  outputAssignments: OutputAssignment;
}

// ==================== UTILITY TYPES ====================

export interface ValidationError {
  field: string;
  message: string;
}

export interface DrawingState {
  isDrawing: boolean;
  startPoint: { x: number; y: number } | null;
  currentRect: ROI | null;
}

// ==================== STORAGE TYPES ====================

export interface StoredProgram {
  id: number;
  name: string;
  lastModified: string;
}

// ==================== CONSTANTS ====================

export const TOOL_TYPES: { id: ToolType; name: string; color: string; description: string }[] = [
  { id: 'outline', name: 'Outline Tool', color: '#3b82f6', description: 'Shape matching' },
  { id: 'area', name: 'Area Tool', color: '#10b981', description: 'Monochrome area' },
  { id: 'color_area', name: 'Color Area Tool', color: '#f59e0b', description: 'Color-based area' },
  { id: 'edge_detection', name: 'Edge Detection', color: '#ef4444', description: 'Edge pixels' },
  { id: 'position_adjust', name: 'Position Adjustment', color: '#8b5cf6', description: 'Position correction (max 1)' },
];

export const OUTPUT_NAMES: OutputName[] = ['OUT1', 'OUT2', 'OUT3', 'OUT4', 'OUT5', 'OUT6', 'OUT7', 'OUT8'];

export const OUTPUT_CONDITIONS: OutputCondition[] = ['OK', 'NG', 'Always ON', 'Always OFF', 'Not Used'];

export const BRIGHTNESS_MODES: { value: 'normal' | 'hdr' | 'highgain'; label: string; description: string }[] = [
  { value: 'normal', label: 'Normal', description: 'Standard exposure' },
  { value: 'hdr', label: 'HDR', description: 'High dynamic range' },
  { value: 'highgain', label: 'High Gain', description: 'Low light conditions' },
];

export const TRIGGER_TYPES: { value: 'internal' | 'external'; label: string; description: string }[] = [
  { value: 'internal', label: 'Internal (Timer)', description: 'Trigger based on time interval' },
  { value: 'external', label: 'External (GPIO)', description: 'Trigger from GPIO input signal' },
];


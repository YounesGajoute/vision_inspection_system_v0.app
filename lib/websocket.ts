/**
 * WebSocket Client for Vision Inspection System
 * Handles real-time communication for inspections and live feed
 */

import { io, Socket } from 'socket.io-client';
import type {
  InspectionResultEvent,
  LiveFrameEvent,
  SystemStatusEvent,
  ErrorEvent,
} from '@/types';

type EventCallback<T = any> = (data: T) => void;

class WebSocketClient {
  private socket: Socket | null = null;
  private url: string;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  // Event handlers
  private handlers: Map<string, Set<EventCallback>> = new Map();

  constructor(url: string = 'http://localhost:5000') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.socket && this.isConnected) {
      console.warn('WebSocket already connected');
      return;
    }

    console.log('Connecting to WebSocket server:', this.url);

    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.setupListeners();
  }

  /**
   * Setup event listeners
   */
  private setupListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { status: 'connected' });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.emit('disconnected', { reason });
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('Max reconnection attempts reached');
        this.emit('connection_failed', { error: 'Max reconnection attempts reached' });
      }
    });

    this.socket.on('connection_status', (data) => {
      console.log('Connection status:', data);
      this.emit('connection_status', data);
    });

    // Inspection events
    this.socket.on('inspection_started', (data) => {
      console.log('Inspection started:', data);
      this.emit('inspection_started', data);
    });

    this.socket.on('inspection_result', (data: InspectionResultEvent) => {
      this.emit('inspection_result', data);
    });

    this.socket.on('inspection_stopped', (data) => {
      console.log('Inspection stopped:', data);
      this.emit('inspection_stopped', data);
    });

    this.socket.on('inspection_complete', (data) => {
      console.log('Inspection complete:', data);
      this.emit('inspection_complete', data);
    });

    // Live feed events
    this.socket.on('live_feed_started', (data) => {
      console.log('Live feed started:', data);
      this.emit('live_feed_started', data);
    });

    this.socket.on('live_frame', (data: LiveFrameEvent) => {
      this.emit('live_frame', data);
    });

    this.socket.on('live_feed_stopped', (data) => {
      console.log('Live feed stopped:', data);
      this.emit('live_feed_stopped', data);
    });

    // System events
    this.socket.on('system_status', (data: SystemStatusEvent) => {
      this.emit('system_status', data);
    });

    // Error events
    this.socket.on('error', (data: ErrorEvent) => {
      console.error('WebSocket error:', data);
      this.emit('error', data);
    });

    this.socket.on('warning', (data) => {
      console.warn('WebSocket warning:', data);
      this.emit('warning', data);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting from WebSocket server');
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Check if connected
   */
  connected(): boolean {
    return this.isConnected && this.socket !== null;
  }

  // ==================== INSPECTION METHODS ====================

  /**
   * Start continuous inspection
   */
  startInspection(programId: number, continuous: boolean = true): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('start_inspection', { programId, continuous });
  }

  /**
   * Stop current inspection
   */
  stopInspection(): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('stop_inspection');
  }

  // ==================== LIVE FEED METHODS ====================

  /**
   * Subscribe to live camera feed
   */
  subscribeLiveFeed(fps: number = 10): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('subscribe_live_feed', { fps });
  }

  /**
   * Unsubscribe from live camera feed
   */
  unsubscribeLiveFeed(): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('unsubscribe_live_feed');
  }

  // ==================== SYSTEM STATUS ====================

  /**
   * Request system status
   */
  requestSystemStatus(): void {
    if (!this.socket) {
      throw new Error('WebSocket not connected');
    }

    this.socket.emit('request_system_status');
  }

  // ==================== EVENT HANDLING ====================

  /**
   * Register event handler
   */
  on<T = any>(event: string, callback: EventCallback<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(callback);
  }

  /**
   * Unregister event handler
   */
  off<T = any>(event: string, callback: EventCallback<T>): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.delete(callback);
      if (handlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  /**
   * Emit event to registered handlers
   */
  private emit<T = any>(event: string, data: T): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for '${event}':`, error);
        }
      });
    }
  }

  /**
   * Clear all event handlers
   */
  clearHandlers(): void {
    this.handlers.clear();
  }
}

// Export singleton instance
export const ws = new WebSocketClient();

// Export class for testing or custom instances
export default WebSocketClient;


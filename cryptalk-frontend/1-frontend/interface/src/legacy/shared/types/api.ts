// API Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata?: APIMetadata;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export interface APIMetadata {
  requestId: string;
  timestamp: Date;
  version: string;
  rateLimit?: RateLimit;
  pagination?: Pagination;
}

export interface RateLimit {
  limit: number;
  remaining: number;
  resetTime: Date;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface WebSocketMessage<T = any> {
  type: WSMessageType;
  data: T;
  timestamp: Date;
  id?: string;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  timestamp: Date;
  uptime: number;
}

export interface ServiceHealth {
  name: string;
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: Date;
}

export type WSMessageType = 
  | 'message'
  | 'notification'
  | 'status-update'
  | 'error'
  | 'heartbeat';

export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
export type ContentType = 'application/json' | 'multipart/form-data' | 'text/plain';
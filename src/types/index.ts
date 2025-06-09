export interface ActivationKey {
  id: string;
  key: string;
  status: 'inactive' | 'active' | 'used' | 'expired';
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  deviceId?: string;
}

export interface ActivationRecord {
  id: string;
  keyId: string;
  deviceId: string;
  activatedAt: string;
  ipAddress: string;
  userAgent: string;
}

export interface ApiKey {
  id: string;
  key: string;
  name: string;
  createdAt: string;
  lastUsedAt?: string;
  rateLimit: number;
  isActive: boolean;
}

export interface ApiLog {
  id: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  status: number;
  timestamp: string;
  ipAddress: string;
  requestBody?: any;
  responseBody?: any;
}

export interface BatchValidationResult {
  key: string;
  isValid: boolean;
  status: string;
  message: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
    fill?: boolean;
  }[];
}

export interface DateRange {
  startDate: string;
  endDate: string;
} 
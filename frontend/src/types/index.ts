// SmartCat Feeder - TypeScript Types

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  telegramChatId?: string;
  createdAt: string;
}

export interface FeedLog {
  id: string;
  source: 'WEB' | 'TELEGRAM' | 'SCHEDULE';
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  portion: number;
  userId?: string;
  userName: string;
  requestId: string;
  message?: string;
  createdAt: string;
  completedAt?: string;
}

export interface Schedule {
  id: string;
  userId: string;
  name: string;
  time: string;
  portion: number;
  enabled: boolean;
  daysOfWeek: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceStatus {
  id: string;
  status: 'ONLINE' | 'OFFLINE';
  lastHeartbeatAt?: string;
  uptimeSeconds?: number;
  wifiStrength?: number;
  lastMessage?: string;
  servoOpenDurationMs?: number;
  feedCooldownSeconds?: number;
  updatedAt: string;
}

export interface FeedStats {
  total: number;
  todayCount: number;
  successCount: number;
  failedCount: number;
  daily: Array<{ date: string; success: number; failed: number; total: number }>;
  lastFeed?: FeedLog;
}

export interface AuthState {
  user: User | null;
  token: string | null;
}

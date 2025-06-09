import { toast } from "sonner";

export interface LogEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
  ip?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private readonly STORAGE_KEY = 'user_logs';
  private readonly MAX_LOGS = 1000; // 最多保存1000条日志

  constructor() {
    this.loadLogs();
  }

  private loadLogs() {
    const savedLogs = localStorage.getItem(this.STORAGE_KEY);
    if (savedLogs) {
      this.logs = JSON.parse(savedLogs);
    }
  }

  private saveLogs() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
  }

  log(userId: string, action: string, details: string) {
    const logEntry: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      action,
      details,
    };

    this.logs.unshift(logEntry); // 新日志添加到开头

    // 如果超过最大数量，删除最旧的日志
    if (this.logs.length > this.MAX_LOGS) {
      this.logs = this.logs.slice(0, this.MAX_LOGS);
    }

    this.saveLogs();
    console.log(`[Logger] ${action}: ${details}`);
  }

  getLogs(userId?: string) {
    if (userId) {
      return this.logs.filter(log => log.userId === userId);
    }
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.saveLogs();
  }

  exportLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const logger = new Logger(); 
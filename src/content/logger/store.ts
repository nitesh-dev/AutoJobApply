import { LogEntry, LogStore } from './types';

class LogStoreImpl implements LogStore {
  logs: LogEntry[] = [];
  private subscribers: Set<(logs: LogEntry[]) => void> = new Set();
  private maxLogs: number;

  constructor(maxLogs: number = 100) {
    this.maxLogs = maxLogs;
  }

  addLog(entry: LogEntry) {
    this.logs = [...this.logs, entry];
    
    // Keep only the most recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
    
    this.notifySubscribers();
  }

  clearLogs() {
    this.logs = [];
    this.notifySubscribers();
  }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.subscribers.add(callback);
    
    // Immediately call with current logs
    callback(this.logs);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers() {
    this.subscribers.forEach(callback => callback(this.logs));
  }

  setMaxLogs(max: number) {
    this.maxLogs = max;
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
      this.notifySubscribers();
    }
  }
}

export const logStore = new LogStoreImpl();

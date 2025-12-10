export type LogLevel = 'info' | 'success' | 'warning' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  details?: any;
}

export interface LoggerConfig {
  showInConsole: boolean;
  showInUI: boolean;
  maxLogs?: number; // Maximum number of logs to keep in memory
  levels?: LogLevel[]; // Which log levels to capture
}

export interface LogStore {
  logs: LogEntry[];
  addLog: (entry: LogEntry) => void;
  clearLogs: () => void;
  subscribe: (callback: (logs: LogEntry[]) => void) => () => void;
}

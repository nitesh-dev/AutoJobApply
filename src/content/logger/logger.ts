import { LogEntry, LogLevel, LoggerConfig } from './types';
import { logStore } from './store';
import { getUUID } from '../utils';

class Logger {
  private config: LoggerConfig = {
    showInConsole: true,
    showInUI: true,
    maxLogs: 100,
    levels: ['info', 'success', 'warning', 'error', 'debug']
  };

  constructor(config?: Partial<LoggerConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.config.levels?.includes(level) ?? true;
  }

  private createLogEntry(level: LogLevel, message: string, details?: any): LogEntry {
    return {
      id: getUUID(),
      timestamp: new Date(),
      level,
      message,
      details
    };
  }

  private logToConsole(entry: LogEntry) {
    if (!this.config.showInConsole) return;

    const timestamp = entry.timestamp.toLocaleTimeString();
    const prefix = `[${timestamp}] [${entry.level.toUpperCase()}]`;
    
    const styles: Record<LogLevel, string> = {
      info: 'color: #3b82f6',
      success: 'color: #10b981',
      warning: 'color: #f59e0b',
      error: 'color: #ef4444',
      debug: 'color: #6b7280'
    };

    console.log(
      `%c${prefix} ${entry.message}`,
      styles[entry.level],
      entry.details || ''
    );
  }

  private log(level: LogLevel, message: string, details?: any) {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, details);

    // Log to console
    this.logToConsole(entry);

    // Add to store for UI display
    if (this.config.showInUI) {
      logStore.addLog(entry);
    }
  }

  info(message: string, details?: any) {
    this.log('info', message, details);
  }

  success(message: string, details?: any) {
    this.log('success', message, details);
  }

  warning(message: string, details?: any) {
    this.log('warning', message, details);
  }

  error(message: string, details?: any) {
    this.log('error', message, details);
  }

  debug(message: string, details?: any) {
    this.log('debug', message, details);
  }

  // Method to log processing steps
  processing(step: string, details?: any) {
    this.info(`Processing: ${step}`, details);
  }

  // Update configuration
  updateConfig(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    
    if (config.maxLogs) {
      logStore.setMaxLogs(config.maxLogs);
    }
  }

  // Get current configuration
  getConfig(): LoggerConfig {
    return { ...this.config };
  }

  // Clear all logs
  clear() {
    logStore.clearLogs();
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for custom instances
export { Logger };

import { useState, useEffect, useRef } from 'react';
import { logStore } from '../logger/store';
import { LogEntry, LogLevel } from '../logger/types';
import './LogViewer.scss';

interface LogViewerProps {
  maxHeight?: string;
  showTimestamp?: boolean;
  showDetails?: boolean;
  filterLevels?: LogLevel[];
}

export function LogViewer({
  maxHeight = '400px',
  showTimestamp = true,
  showDetails = false,
  filterLevels
}: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedLog, setSelectedLog] = useState<string | null>(null);
  const logListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = logStore.subscribe((newLogs) => {
      setLogs(newLogs);
    });

    return unsubscribe;
  }, []);

  // Auto scroll to end when logs change
  useEffect(() => {
    if (logListRef.current) {
      logListRef.current.scrollTop = logListRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = filterLevels
    ? logs.filter(log => filterLevels.includes(log.level))
    : logs;

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'info':
        return 'ℹ️';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      case 'debug':
        return '🔍';
      default:
        return '📝';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleClearLogs = () => {
    logStore.clearLogs();
  };

  const toggleLogDetails = (logId: string) => {
    setSelectedLog(selectedLog === logId ? null : logId);
  };

  return (
    <div className="log-viewer">
      <div className="log-viewer-header">
        <h3>Activity Log</h3>
        <div className="log-viewer-controls">
          <button
            className="log-viewer-button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '⬇️' : '⬆️'}
          </button>
          <button
            className="log-viewer-button"
            onClick={handleClearLogs}
            title="Clear logs"
          >
            🗑️
          </button>
          <span className="log-count">{filteredLogs.length}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="log-viewer-content" style={{ maxHeight }} ref={logListRef}>
          {filteredLogs.length === 0 ? (
            <div className="log-empty">No logs yet</div>
          ) : (
            <div className="log-list">
              {filteredLogs.map((log) => (
                <div key={log.id} className={`log-entry log-${log.level}`}>
                  <div
                    className="log-entry-main"
                    onClick={() => log.details && toggleLogDetails(log.id)}
                    style={{ cursor: log.details ? 'pointer' : 'default' }}
                  >
                    <span className="log-icon">{getLevelIcon(log.level)}</span>
                    {showTimestamp && (
                      <span className="log-timestamp">
                        {formatTime(log.timestamp)}
                      </span>
                    )}
                    <span className="log-message">{log.message}</span>
                    {log.details && (
                      <span className="log-details-toggle">
                        {selectedLog === log.id ? '▼' : '▶'}
                      </span>
                    )}
                  </div>
                  {(showDetails || selectedLog === log.id) && log.details && (
                    <div className="log-details">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

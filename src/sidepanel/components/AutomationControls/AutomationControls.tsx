import { StopIcon, PlayIcon, FetchIcon } from "../Icons";
import "./AutomationControls.scss";

interface AutomationControlsProps {
  isRunning: boolean;
  onToggleAutomation: () => void;
  onStartInWindow: () => void;
  onFetchJobs: () => void;
}

export const AutomationControls = ({
  isRunning,
  onToggleAutomation,
  onStartInWindow,
  onFetchJobs,
}: AutomationControlsProps) => {
  return (
    <div className="automation-control">
      <button
        className={`btn start-btn ${isRunning ? "running" : ""}`}
        onClick={onToggleAutomation}
      >
        {isRunning ? (
          <>
            <StopIcon />
            Stop Automation
          </>
        ) : (
          <>
            <PlayIcon />
            Start Automation
          </>
        )}
      </button>

      <div className="btn-group">
        {!isRunning && (
          <button
            className="btn fetch-btn"
            onClick={onStartInWindow}
            style={{
              backgroundColor: "#6366f1",
              color: "white",
            }}
          >
            <PlayIcon />
            In New Window
          </button>
        )}

        <button
          className="btn fetch-btn"
          onClick={onFetchJobs}
          style={{
            backgroundColor: "#10b981",
            color: "white",
          }}
        >
          <FetchIcon />
          Fetch Jobs
        </button>
      </div>
    </div>
  );
};

import { StopIcon, PlayIcon, FetchIcon } from "../Icons";
import "./AutomationControls.scss";

interface AutomationControlsProps {
  isRunning: boolean;
  onToggleAutomation: () => void;
  onFetchJobs: () => void;
}

export const AutomationControls = ({
  isRunning,
  onToggleAutomation,
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

      <button
        className="btn fetch-btn"
        onClick={onFetchJobs}
        style={{
          marginLeft: "8px",
          backgroundColor: "#10b981",
          color: "white",
        }}
      >
        <FetchIcon />
        Fetch Jobs
      </button>
    </div>
  );
};

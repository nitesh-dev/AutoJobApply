import { SettingsIcon, ClearIcon, RefreshIcon } from "../Icons";
import "./Header.scss";

interface HeaderProps {
  showSettings: boolean;
  onToggleSettings: () => void;
  onClearCache: () => void;
  onRefresh: () => void;
}

export const Header = ({
  showSettings,
  onToggleSettings,
  onClearCache,
  onRefresh,
}: HeaderProps) => {
  return (
    <div className="header">
      <h2>AutoJobApply</h2>
      <div style={{ display: "flex", gap: "0.4rem" }}>
        <button
          className={`btn btn-ghost ${showSettings ? "active" : ""}`}
          onClick={onToggleSettings}
          title="Settings"
        >
          <SettingsIcon />
        </button>
        <button
          className="btn btn-ghost"
          onClick={onClearCache}
          title="Clear Cache"
        >
          <ClearIcon />
        </button>
        <button
          className="btn btn-ghost"
          onClick={onRefresh}
          title="Refresh Stats"
        >
          <RefreshIcon />
        </button>
      </div>
    </div>
  );
};

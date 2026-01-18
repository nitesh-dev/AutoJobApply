import { Stats } from "@/types";
import "./StatsGrid.scss";

interface StatsGridProps {
  stats: Stats;
}

export const StatsGrid = ({ stats }: StatsGridProps) => {
  const tabEntries = Object.entries(stats.tabs || {});

  return (
    <div className="stats-grid">
      <div className="card card-primary stat-card-flex">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span className="label">Total Jobs Found</span>
          <span className="value" style={{ fontSize: "1.2rem" }}>
            {stats.totalFound}
          </span>
        </div>
        <div
          style={{
            textAlign: "right",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span className="label">In Queue</span>
          <span className="value" style={{ color: "#60a5fa" }}>
            {stats.queueSize}
          </span>
        </div>
      </div>
      <div className="card stat-card">
        <span className="label">Analyzed</span>
        <span className="value" style={{ color: "#a78bfa" }}>
          {stats.analyzed}
        </span>
      </div>
      <div className="card stat-card">
        <span className="label">Applying</span>
        <span className="value" style={{ color: "#10b981" }}>
          {stats.applying}
        </span>
      </div>
      <div className="card stat-card">
        <span className="label">Skipped</span>
        <span className="value" style={{ color: "#f43f5e" }}>
          {stats.skipped}
        </span>
      </div>
      <div className="card stat-card">
        <span className="label">Pending</span>
        <span className="value" style={{ color: "#94a3b8" }}>
          {stats.pending}
        </span>
      </div>
      <div className="card stat-card">
        <span className="label">Completed</span>
        <span className="value" style={{ color: "#3b82f6" }}>
          {stats.completed}
        </span>
      </div>
      <div className="card stat-card">
        <span className="label">Failed</span>
        <span className="value" style={{ color: "#ef4444" }}>
          {stats.failed}
        </span>
      </div>
      <div className="card stat-card">
        <span className="label">Tabs</span>
        <span className="value">{tabEntries.length}</span>
      </div>
    </div>
  );
};

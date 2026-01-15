import { useEffect, useState } from "react";
import "./App.css";
import { api } from "@/services/extensionApi";

interface Stats {
  totalFound: number;
  analyzed: number;
  skipped: number;
  applying: number;
  completed: number;
  queueSize: number;
  pending: number;
  currentJob: {
    title: string;
    status: string;
  } | null;
  tabs: Record<string, { role: string; platform?: string }>;
}

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);

  const fetchStats = async () => {
    try {
      const response = await api.getStats();
      setStats(response as Stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 1000); // 1s polling for faster UI
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className="dashboard">Loading...</div>;

  const tabEntries = Object.entries(stats.tabs || {});

  return (
    <div className="dashboard">
      <div className="header">
        <h2>AutoJobApply</h2>
        <button
          className="refresh-btn"
          onClick={fetchStats}
          title="Force Refresh"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
          </svg>
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card primary">
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="label">Total Jobs Found</span>
            <span className="value" style={{ fontSize: "1.4rem" }}>
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

        <div className="stat-card">
          <span className="label">Analyzed</span>
          <span className="value">{stats.analyzed}</span>
        </div>
        <div className="stat-card">
          <span className="label">Applying</span>
          <span className="value" style={{ color: "#10b981" }}>
            {stats.applying}
          </span>
        </div>
        <div className="stat-card">
          <span className="label">Skipped</span>
          <span className="value" style={{ color: "#f43f5e" }}>
            {stats.skipped}
          </span>
        </div>
      </div>

      <div className="section-title">Current Job</div>
      <div className="current-job">
        {stats.currentJob ? (
          <div className="job-info">
            <div className="job-title">{stats.currentJob.title}</div>
            <div className="job-status">{stats.currentJob.status}</div>
          </div>
        ) : (
          <div style={{ color: "#64748b", fontSize: "0.75rem" }}>
            Bot is idle. Waiting for jobs...
          </div>
        )}
      </div>

      <div className="section-title">Active Tabs ({tabEntries.length})</div>
      <div className="tabs-list">
        {tabEntries.length > 0 ? (
          tabEntries.map(([id, info]) => (
            <div key={id} className="tab-item">
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
              >
                <span
                  className={`badge badge-${info.role
                    .toLowerCase()
                    .replace("_", "")}`}
                >
                  {info.role}
                </span>
                {info.platform && (
                  <span className="tab-platform">{info.platform}</span>
                )}
              </div>
              <span className="tab-id">ID: {id}</span>
            </div>
          ))
        ) : (
          <div
            style={{
              color: "#64748b",
              fontSize: "0.7rem",
              textAlign: "center",
              padding: "0.5rem",
            }}
          >
            No registered tabs.
          </div>
        )}
      </div>

      <div className="footer-stats">
        <span>Pending: {stats.pending}</span>
        <span>Completed: {stats.completed}</span>
      </div>
    </div>
  );
}

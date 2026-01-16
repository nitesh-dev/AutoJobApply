import { useEffect, useState } from "react";
import "./theme.css";
import "./App.css";
import { api } from "@/services/extensionApi";
import { Stats, UserConfig } from "@/types";

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [activeJobTab, setActiveJobTab] = useState<string>("all");

  const fetchStats = async () => {
    try {
      const response = await api.getStats();
      setStats(response as Stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await api.getConfig();
      setConfig(response);
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchConfig();
    const interval = setInterval(fetchStats, 1000); // 1s polling for faster UI
    return () => clearInterval(interval);
  }, []);

  const updateConfig = async (newConfig: Partial<UserConfig>) => {
    if (!config) return;
    try {
      const updated = await api.updateConfig(newConfig);
      setConfig(updated);
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  };

  const addQuery = () => {
    if (!config) return;
    const newQueries = [...config.query, { search: "", location: "" }];
    updateConfig({ query: newQueries });
  };

  const removeQuery = (index: number) => {
    if (!config) return;
    const newQueries = config.query.filter((_, i) => i !== index);
    updateConfig({ query: newQueries });
  };

  const handleQueryChange = (
    index: number,
    field: "search" | "location",
    value: string
  ) => {
    if (!config) return;
    const newQueries = [...config.query];
    newQueries[index] = { ...newQueries[index], [field]: value };
    updateConfig({ query: newQueries });
  };

  const toggleAutomation = async () => {
    if (!stats) return;
    try {
      if (stats.isRunning) {
        await api.stopAutomation();
      } else {
        await api.startAutomation();
      }
      fetchStats();
    } catch (error) {
      console.error("Failed to toggle automation:", error);
    }
  };

  const clearCache = async () => {
    if (
      !confirm(
        "Clear all job data and stats? This won't affect your resume or settings."
      )
    )
      return;
    try {
      await api.clearCache();
      fetchStats();
    } catch (error) {
      console.error("Failed to clear cache:", error);
    }
  };

  if (!stats || !config)
    return <div className="dashboard-container">Loading...</div>;

  const tabEntries = Object.entries(stats.tabs || {});

  return (
    <div className="dashboard-container">
      <div className="header">
        <h2>AutoJobApply</h2>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button
            className={`btn btn-ghost ${showSettings ? "active" : ""}`}
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <button
            className="btn btn-ghost"
            onClick={clearCache}
            title="Clear Cache"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 6h18"></path>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
            </svg>
          </button>
          <button
            className="btn btn-ghost"
            onClick={fetchStats}
            title="Refresh Stats"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
        </div>
      </div>

      {showSettings ? (
        <div className="settings-panel">
          <div className="card">
            <div className="section-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              RESUME CONTENT
            </div>
            <textarea
              placeholder="Paste your resume or professional bio here..."
              value={config.resumeText}
              onChange={(e) => updateConfig({ resumeText: e.target.value })}
            />
          </div>

          <div className="card">
            <div className="section-lbl">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              PLATFORMS
            </div>
            <div className="platforms-row">
              <label className="platform-checkbox">
                <input
                  type="checkbox"
                  checked={config.platform.indeed}
                  onChange={(e) =>
                    updateConfig({
                      platform: {
                        ...config.platform,
                        indeed: e.target.checked,
                      },
                    })
                  }
                />
                Indeed
              </label>
              <label className="platform-checkbox">
                <input
                  type="checkbox"
                  checked={config.platform.linkedin}
                  onChange={(e) =>
                    updateConfig({
                      platform: {
                        ...config.platform,
                        linkedin: e.target.checked,
                      },
                    })
                  }
                />
                LinkedIn
              </label>
            </div>
          </div>

          <div className="card">
            <div className="section-header-row">
              <div className="section-lbl" style={{ marginBottom: 0 }}>
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                SEARCH QUERIES
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: "3px 8px", fontSize: "0.7rem" }}
                onClick={addQuery}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add
              </button>
            </div>
            <div className="queries-list">
              {config.query.map((q, i) => (
                <div key={i} className="query-item">
                  <input
                    placeholder="Keywords"
                    value={q.search}
                    onChange={(e) =>
                      handleQueryChange(i, "search", e.target.value)
                    }
                  />
                  <input
                    placeholder="Location"
                    value={q.location}
                    onChange={(e) =>
                      handleQueryChange(i, "location", e.target.value)
                    }
                  />
                  <button
                    className="btn btn-danger-ghost"
                    style={{ width: "28px", height: "28px", padding: 0 }}
                    onClick={() => removeQuery(i)}
                    title="Remove"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}
              {config.query.length === 0 && (
                <div className="empty-msg">
                  No active searches. Add one to begin.
                </div>
              )}
            </div>
          </div>
          <button
            className="btn btn-primary"
            style={{ width: "100%", padding: "0.5rem" }}
            onClick={() => setShowSettings(false)}
          >
            Done
          </button>
        </div>
      ) : (
        <>
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

          <div className="automation-control">
            <button
              className={`btn start-btn ${stats.isRunning ? "running" : ""}`}
              onClick={toggleAutomation}
            >
              {stats.isRunning ? (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  Stop Automation
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M5 3l14 9-14 9V3z" />
                  </svg>
                  Start Automation
                </>
              )}
            </button>
          </div>

          <div className="section-lbl">Job Queue & History</div>
          <div className="job-tabs">
            {[
              "all",
              "pending",
              "analyzing",
              "applying",
              "completed",
              "skipped",
              "failed",
            ].map((tab) => {
              const count =
                tab === "all"
                  ? (stats.jobQueue || []).length
                  : (stats.jobQueue || []).filter((j) => j.status === tab)
                      .length;
              return (
                <button
                  key={tab}
                  className={`job-tab-btn ${
                    activeJobTab === tab ? "active" : ""
                  }`}
                  onClick={() => setActiveJobTab(tab)}
                >
                  <div style={{ fontSize: "0.75rem" }}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </div>
                  <div style={{ opacity: 0.8, fontSize: "0.6rem" }}>
                    {count}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="job-list">
            {(() => {
              const filteredJobs = stats.jobQueue
                .filter((j) => {
                  const currentStatus = j.status.toLowerCase();
                  if (activeJobTab === "all") return true;
                  return currentStatus === activeJobTab.toLowerCase();
                })
                .reverse();

              if (filteredJobs.length === 0) {
                return (
                  <div
                    className="empty-msg"
                    style={{
                      textAlign: "center",
                      padding: "1rem",
                      color: "var(--text-muted)",
                      fontSize: "0.8rem",
                    }}
                  >
                    No {activeJobTab === "all" ? "" : activeJobTab} jobs found.
                  </div>
                );
              }

              return filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="card job-card"
                  onClick={() => window.open(job.url, "_blank")}
                >
                  <div className="job-card-header">
                    <div className="job-card-title">{job.title}</div>
                    <span
                      className={`status-badge badge-${job.status
                        .toLowerCase()
                        .replace("_", "")}`}
                      style={{ fontSize: "0.6rem", padding: "1px 6px" }}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="job-card-meta">
                    <span>{new URL(job.url).hostname.replace("www.", "")}</span>
                    <span>•</span>
                    <span style={{ fontFamily: "monospace", opacity: 0.6 }}>
                      ID: {job.id.slice(-6)}
                    </span>
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="section-lbl" style={{ marginTop: "0.5rem" }}>
            Active Tabs ({tabEntries.length})
          </div>
          <div className="tabs-list">
            {tabEntries.length > 0 ? (
              tabEntries.map(([id, info]) => (
                <div key={id} className="card tab-item-grid">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span
                      className={`status-badge badge-${info.role
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
        </>
      )}
    </div>
  );
}

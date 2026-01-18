import { Job } from "@/types";
import { useState } from "react";
import "./JobQueue.scss";

interface JobQueueProps {
  jobQueue: Job[];
}

export const JobQueue = ({ jobQueue }: JobQueueProps) => {
  const [activeJobTab, setActiveJobTab] = useState<string>("all");

  const tabs = [
    "all",
    "pending",
    "analyzing",
    "applying",
    "completed",
    "skipped",
    "failed",
  ];

  const filteredJobs = jobQueue
    .filter((j) => {
      const currentStatus = j.status.toLowerCase();
      if (activeJobTab === "all") return true;
      return currentStatus === activeJobTab.toLowerCase();
    })
    .reverse();

  return (
    <>
      <div className="section-lbl">Job Queue & History</div>
      <div className="job-tabs">
        {tabs.map((tab) => {
          const count =
            tab === "all"
              ? jobQueue.length
              : jobQueue.filter((j) => j.status === tab).length;
          return (
            <button
              key={tab}
              className={`job-tab-btn ${activeJobTab === tab ? "active" : ""}`}
              onClick={() => setActiveJobTab(tab)}
            >
              <div style={{ fontSize: "0.75rem" }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
              <div style={{ opacity: 0.8, fontSize: "0.6rem" }}>{count}</div>
            </button>
          );
        })}
      </div>

      <div className="job-list">
        {filteredJobs.length === 0 ? (
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
        ) : (
          filteredJobs.map((job) => (
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
              {job.message && (
                <div
                  className="job-card-msg"
                  style={{
                    marginTop: "0.4rem",
                    fontSize: "0.7rem",
                    color:
                      job.status === "failed"
                        ? "#ff4d4f"
                        : job.status === "skipped"
                        ? "#faad14"
                        : "var(--text-muted)",
                    fontStyle: "italic",
                    borderTop: "1px dashed rgba(255,255,255,0.1)",
                    paddingTop: "0.2rem",
                  }}
                >
                  {job.message}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
};

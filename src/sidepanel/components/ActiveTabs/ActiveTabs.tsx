import { Role } from "@/types";
import "./ActiveTabs.scss";

interface ActiveTabsProps {
  tabs: Record<string, { role: Role; platform?: string }>;
}

export const ActiveTabs = ({ tabs }: ActiveTabsProps) => {
  const tabEntries = Object.entries(tabs || {});

  return (
    <>
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
  );
};

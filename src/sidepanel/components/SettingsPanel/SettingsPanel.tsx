import { UserConfig } from "@/types";
import "./SettingsPanel.scss";
import {
  ResumeIcon,
  PlatformIcon,
  BehaviorIcon,
  SearchIcon,
  PlusIcon,
  CloseIcon,
} from "../Icons";

interface SettingsPanelProps {
  config: UserConfig;
  localResumeText: string;
  setLocalResumeText: (text: string) => void;
  updateConfig: (newConfig: Partial<UserConfig>) => void;
  onDone: () => void;
}

export const SettingsPanel = ({
  config,
  localResumeText,
  setLocalResumeText,
  updateConfig,
  onDone,
}: SettingsPanelProps) => {
  const addQuery = () => {
    const newQueries = [...config.query, { search: "", location: "" }];
    updateConfig({ query: newQueries });
  };

  const removeQuery = (index: number) => {
    const newQueries = config.query.filter((_, i) => i !== index);
    updateConfig({ query: newQueries });
  };

  const handleQueryChange = (
    index: number,
    field: "search" | "location",
    value: string
  ) => {
    const newQueries = [...config.query];
    newQueries[index] = { ...newQueries[index], [field]: value };
    updateConfig({ query: newQueries });
  };

  return (
    <div className="settings-panel">
      <div className="card">
        <div className="section-lbl">
          <ResumeIcon />
          RESUME CONTENT
        </div>
        <textarea
          placeholder="Paste your resume or professional bio here..."
          value={localResumeText}
          onChange={(e) => setLocalResumeText(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="section-lbl">
          <PlatformIcon />
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
        <div className="section-lbl">
          <BehaviorIcon />
          BEHAVIOR
        </div>
        <label className="platform-checkbox">
          <input
            type="checkbox"
            checked={config.runInBackground}
            onChange={(e) => updateConfig({ runInBackground: e.target.checked })}
          />
          Run in background (don't force focus)
        </label>
      </div>

      <div className="card">
        <div className="section-header-row">
          <div className="section-lbl" style={{ marginBottom: 0 }}>
            <SearchIcon />
            SEARCH QUERIES
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: "3px 8px", fontSize: "0.7rem" }}
            onClick={addQuery}
          >
            <PlusIcon />
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
                <CloseIcon />
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
        onClick={onDone}
      >
        Done
      </button>
    </div>
  );
};

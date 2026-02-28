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

  const handleLocationKeywordsChange = (value: string) => {
    const keywords = value.split(",").map((k) => k.trim()).filter((k) => k !== "");
    updateConfig({ locationKeywords: keywords });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      updateConfig({
        resumeFile: {
          name: file.name,
          data: base64,
        },
      });
    };
    reader.readAsDataURL(file);
  };

  const removeResumeFile = () => {
    updateConfig({ resumeFile: undefined });
  };

  return (
    <div className="settings-panel">
      <div className="card">
        <div className="section-lbl">
          <ResumeIcon />
          RESUME FILE (PDF/DOCX)
        </div>
        <div className="file-upload-section">
          {config.resumeFile ? (
            <div className="uploaded-file">
              <span>{config.resumeFile.name}</span>
              <button 
                className="remove-file-btn" 
                onClick={removeResumeFile}
                title="Remove file"
              >
                <CloseIcon />
              </button>
            </div>
          ) : (
            <label className="file-input-label">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <PlusIcon /> Select Resume
            </label>
          )}
        </div>
      </div>

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
        <div className="section-lbl">
          <BehaviorIcon />
          AI PROVIDER
        </div>
        <div className="ai-provider-selector" style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
          <label className="platform-checkbox" style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="aiProvider"
              value="gpt"
              checked={config.aiProvider === 'gpt'}
              onChange={() => updateConfig({ aiProvider: 'gpt' })}
            />
            ChatGPT
          </label>
          <label className="platform-checkbox" style={{ cursor: 'pointer' }}>
            <input
              type="radio"
              name="aiProvider"
              value="gemini"
              checked={config.aiProvider === 'gemini'}
              onChange={() => updateConfig({ aiProvider: 'gemini' })}
            />
            Gemini
          </label>
        </div>
      </div>

      <div className="card">
        <div className="section-lbl">
          <BehaviorIcon />
          CUSTOM GPT (Ollama)
        </div>
        <div className="gpt-settings">
          <label className="platform-checkbox">
            <input
              type="checkbox"
              checked={config.useLocalGpt}
              onChange={(e) => updateConfig({ useLocalGpt: e.target.checked })}
            />
            Use Local GPT (Ollama)
          </label>

          {config.useLocalGpt && (
            <div className="local-gpt-fields" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Endpoint</label>
                <input
                  type="text"
                  placeholder="http://localhost:11434/api/generate"
                  value={config.localGptEndpoint}
                  onChange={(e) => updateConfig({ localGptEndpoint: e.target.value })}
                  style={{ fontSize: '0.75rem' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <label style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Model</label>
                <input
                  type="text"
                  placeholder="gemma:2b"
                  value={config.localGptModel}
                  onChange={(e) => updateConfig({ localGptModel: e.target.value })}
                  style={{ fontSize: '0.75rem' }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="section-header-row">
          <div className="section-lbl" style={{ marginBottom: 0 }}>
            <PlatformIcon />
            LOCATION FILTER
          </div>
        </div>
        <div className="location-filter-section" style={{ marginTop: '0.5rem' }}>
          <input
            type="text"
            placeholder="e.g. Remote, Hybrid, Bangalore (comma separated)"
            defaultValue={config.locationKeywords?.join(", ")}
            onBlur={(e) => handleLocationKeywordsChange(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem' }}
          />
          <p style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.3rem' }}>
            Only apply to jobs matching these location keywords. Leave empty to disable.
          </p>
        </div>
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

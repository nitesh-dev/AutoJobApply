import { useEffect, useState } from "react";
import "./theme.scss";
import { api } from "@/services/extensionApi";
import { Stats, UserConfig } from "@/types";
import { Header } from "./components/Header";
import { SettingsPanel } from "./components/SettingsPanel";
import { StatsGrid } from "./components/StatsGrid";
import { AutomationControls } from "./components/AutomationControls";
import { JobQueue } from "./components/JobQueue";
import { ActiveTabs } from "./components/ActiveTabs";

export default function App() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<UserConfig | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [localResumeText, setLocalResumeText] = useState("");

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
      if (response.resumeText) {
        setLocalResumeText(response.resumeText);
      }
    } catch (error) {
      console.error("Failed to fetch config:", error);
    }
  };

  const fetchJobs = async () => {
    try {
      await api.fetchJobs();
      fetchStats();
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
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

  useEffect(() => {
    if (!config) return;
    const timer = setTimeout(() => {
      if (localResumeText !== config.resumeText) {
        updateConfig({ resumeText: localResumeText });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localResumeText]);

  if (!stats || !config)
    return <div className="dashboard-container">Loading...</div>;

  return (
    <div className="dashboard-container">
      <Header
        showSettings={showSettings}
        onToggleSettings={() => setShowSettings(!showSettings)}
        onClearCache={clearCache}
        onRefresh={fetchStats}
      />

      {showSettings ? (
        <SettingsPanel
          config={config}
          localResumeText={localResumeText}
          setLocalResumeText={setLocalResumeText}
          updateConfig={updateConfig}
          onDone={() => setShowSettings(false)}
        />
      ) : (
        <>
          <StatsGrid stats={stats} />
          <AutomationControls
            isRunning={stats.isRunning}
            onToggleAutomation={toggleAutomation}
            onFetchJobs={fetchJobs}
          />
          <JobQueue jobQueue={stats.jobQueue || []} />
          <ActiveTabs tabs={stats.tabs || {}} />
        </>
      )}
    </div>
  );
}

import { useEffect } from "react";
import { useProjectStore } from "./store/useProjectStore";
import { useSpreadsheetStore } from "./store/useSpreadsheetStore";
import { useUIStore } from "./store/useUIStore";
import { Dashboard } from "./components/dashboard/Dashboard";
import { SpreadsheetView } from "./components/spreadsheet/SpreadsheetView";
import { ExportDialog } from "./components/spreadsheet/ExportDialog";
import { ImportDialog } from "./components/spreadsheet/ImportDialog";
import { Notification } from "./components/layout/Notification";

export default function App() {
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const loadFromStorage = useProjectStore((s) => s.loadFromStorage);
  const saveToStorage = useProjectStore((s) => s.saveToStorage);
  const theme = useUIStore((s) => s.theme);

  // Apply dark class on mount and on theme change
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Load data from localStorage on mount
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Auto-save on changes
  const projects = useProjectStore((s) => s.projects);
  useEffect(() => {
    if (projects.length > 0) {
      const timer = setTimeout(() => saveToStorage(), 500);
      return () => clearTimeout(timer);
    }
  }, [projects, saveToStorage]);

  // Sync active sheet ID
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === s.activeProjectId),
  );
  useEffect(() => {
    if (project && project.sheets.length > 0) {
      useSpreadsheetStore.setState({ activeSheetId: project.sheets[0].id });
    }
  }, [project?.id]);

  return (
    <div className="h-screen w-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-200">
      {activeProjectId ? <SpreadsheetView /> : <Dashboard />}
      <ExportDialog />
      <ImportDialog />
      <Notification />
    </div>
  );
}

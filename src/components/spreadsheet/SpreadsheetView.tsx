import { useProjectStore } from "../../store/useProjectStore";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { useUIStore } from "../../store/useUIStore";
import { Toolbar } from "./Toolbar";
import { FormulaBar } from "./FormulaBar";
import { Grid } from "./Grid";
import { SheetTabs } from "./SheetTabs";
import { TimelinePanel } from "../timeline/TimelinePanel";
import { ChartPanel } from "../charts/ChartPanel";
import { ArrowLeft, Moon, Sun } from "lucide-react";

export function SpreadsheetView() {
  const activeProject = useProjectStore((s) => s.getActiveProject());
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const activePanel = useUIStore((s) => s.activePanel);
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  if (!activeProject) return null;

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0">
        <button
          onClick={() => setActiveProject(null)}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="返回项目列表"
        >
          <ArrowLeft size={18} className="text-gray-500 dark:text-gray-400" />
        </button>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate flex-1">
          {activeProject.name}
        </span>
        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={theme === "light" ? "切换到深色模式" : "切换到浅色模式"}
        >
          {theme === "light" ? (
            <Moon size={16} className="text-gray-500 dark:text-gray-400" />
          ) : (
            <Sun size={16} className="text-yellow-500" />
          )}
        </button>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Formula Bar */}
      <FormulaBar />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Timeline panel (conditional) */}
        {activePanel === "timeline" && <TimelinePanel />}

        {/* Spreadsheet Grid */}
        <div className="flex-1 min-h-0">
          <Grid />
        </div>

        {/* Chart panel (conditional) */}
        {activePanel === "chart" && <ChartPanel />}
      </div>

      {/* Sheet Tabs */}
      <SheetTabs />
    </div>
  );
}

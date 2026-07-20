import { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { useUIStore } from "../../store/useUIStore";
import { ChartRenderer } from "./ChartRenderer";
import { ChartConfigForm } from "./ChartConfigForm";
import type { ChartConfig } from "../../types";
import { Plus, X, BarChart3 } from "lucide-react";

const CHART_COLORS = ["#93c5fd", "#86efac", "#fde68a", "#fca5a5", "#c4b5fd", "#a5f3fc", "#fdba74"];

export function ChartPanel() {
  const project = useProjectStore((s) => s.getActiveProject());
  const updateProject = useProjectStore((s) => s.saveToStorage);
  const activeSheetId = useSpreadsheetStore((s) => s.activeSheetId);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const [showForm, setShowForm] = useState(false);

  if (!project || !activeSheetId) return null;

  const charts = project.charts.filter((c) => c.sheetId === activeSheetId);

  const handleAddChart = (config: Omit<ChartConfig, "id">) => {
    const newChart: ChartConfig = {
      ...config,
      id: crypto.randomUUID(),
    };
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              charts: [...p.charts, newChart],
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
    updateProject();
    setShowForm(false);
  };

  const handleRemoveChart = (chartId: string) => {
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              charts: p.charts.filter((c) => c.id !== chartId),
            }
          : p,
      ),
    }));
    updateProject();
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <BarChart3 size={14} />
          <span>统计图</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">({charts.length})</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
          >
            <Plus size={12} />
            新建图表
          </button>
          <button
            onClick={() => setActivePanel("none")}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 dark:text-gray-500"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Chart display area */}
      {charts.length === 0 && !showForm ? (
        <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          暂无图表，选择数据区域后创建图表
        </div>
      ) : (
        <div className="p-4 space-y-6">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative group"
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {chart.title}
                </h4>
                <button
                  onClick={() => handleRemoveChart(chart.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all"
                >
                  <X size={14} />
                </button>
              </div>
              <ChartRenderer config={chart} colors={CHART_COLORS} />
            </div>
          ))}
        </div>
      )}

      {/* Chart creation form */}
      {showForm && (
        <ChartConfigForm
          sheetId={activeSheetId}
          onSubmit={handleAddChart}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

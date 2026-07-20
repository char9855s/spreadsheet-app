import { useState } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { useUIStore } from "../../store/useUIStore";
import { exportToJSON, exportToCSV, exportToXLSX, type ExportFormat } from "../../utils/io";
import { X, FileJson, FileSpreadsheet, Table2 } from "lucide-react";

const FORMATS: { key: ExportFormat; label: string; icon: typeof FileJson; desc: string }[] = [
  {
    key: "json",
    label: "JSON",
    icon: FileJson,
    desc: "完整数据备份，包含所有项目、表格、图表和时间轴",
  },
  {
    key: "csv",
    label: "CSV",
    icon: Table2,
    desc: "当前工作表导出为文本格式，兼容所有电子表格软件",
  },
  {
    key: "xlsx",
    label: "Excel (.xlsx)",
    icon: FileSpreadsheet,
    desc: "导出为 Excel 格式，支持多工作表",
  },
];

export function ExportDialog() {
  const showExportDialog = useUIStore((s) => s.showExportDialog);
  const setShowExportDialog = useUIStore((s) => s.setShowExportDialog);
  const showNotification = useUIStore((s) => s.showNotification);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const getActiveProject = useProjectStore((s) => s.getActiveProject);

  const [format, setFormat] = useState<ExportFormat>("json");
  const [jsonScope, setJsonScope] = useState<"all" | "current">("current");
  const [selectedSheetId, setSelectedSheetId] = useState<string>("");
  const [xlsxSheetScope, setXlsxSheetScope] = useState<"all" | "single">("all");
  const [exporting, setExporting] = useState(false);

  const project = getActiveProject();

  if (!showExportDialog) return null;

  const sheets = project?.sheets ?? [];

  const handleExport = async () => {
    setExporting(true);
    try {
      switch (format) {
        case "json":
          exportToJSON(projects, activeProjectId, jsonScope === "all");
          break;
        case "csv": {
          const sheet = sheets.find((s) => s.id === selectedSheetId) ?? sheets[0];
          if (!sheet) {
            showNotification("没有可导出的工作表", "error");
            return;
          }
          exportToCSV(sheet);
          break;
        }
        case "xlsx": {
          if (!project) {
            showNotification("没有打开的项目", "error");
            return;
          }
          await exportToXLSX(
            project,
            xlsxSheetScope === "single" ? selectedSheetId || undefined : undefined,
          );
          break;
        }
      }
      showNotification("导出成功！", "success");
      setShowExportDialog(false);
    } catch (e) {
      showNotification(`导出失败: ${e instanceof Error ? e.message : "未知错误"}`, "error");
    } finally {
      setExporting(false);
    }
  };

  const handleClose = () => {
    setShowExportDialog(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[480px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            导出数据
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Format Selection */}
        <div className="px-5 py-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            选择导出格式
          </p>
          <div className="space-y-2">
            {FORMATS.map((fmt) => {
              const Icon = fmt.icon;
              return (
                <label
                  key={fmt.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    format === fmt.key
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <input
                    type="radio"
                    name="exportFormat"
                    value={fmt.key}
                    checked={format === fmt.key}
                    onChange={() => setFormat(fmt.key)}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Icon size={18} className="text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-sm text-gray-700 dark:text-gray-200">
                        {fmt.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {fmt.desc}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700">
          {format === "json" && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                导出范围
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="jsonScope"
                    value="current"
                    checked={jsonScope === "current"}
                    onChange={() => setJsonScope("current")}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    仅当前项目
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="jsonScope"
                    value="all"
                    checked={jsonScope === "all"}
                    onChange={() => setJsonScope("all")}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    所有项目 ({projects.length} 个)
                  </span>
                </label>
              </div>
            </div>
          )}

          {format === "csv" && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                选择工作表
              </p>
              {sheets.length > 0 ? (
                <select
                  value={selectedSheetId || sheets[0]?.id}
                  onChange={(e) => setSelectedSheetId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sheets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-400">没有可用的工作表</p>
              )}
            </div>
          )}

          {format === "xlsx" && (
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                工作表范围
              </p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="xlsxScope"
                    value="all"
                    checked={xlsxSheetScope === "all"}
                    onChange={() => setXlsxSheetScope("all")}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    所有工作表 ({sheets.length} 个)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="xlsxScope"
                    value="single"
                    checked={xlsxSheetScope === "single"}
                    onChange={() => setXlsxSheetScope("single")}
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    单个工作表
                  </span>
                </label>
                {xlsxSheetScope === "single" && (
                  <select
                    value={selectedSheetId || sheets[0]?.id}
                    onChange={(e) => setSelectedSheetId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                  >
                    {sheets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || (format !== "json" && sheets.length === 0)}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            {exporting ? "导出中..." : "导出"}
          </button>
        </div>
      </div>
    </div>
  );
}

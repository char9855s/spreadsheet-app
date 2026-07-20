import { useState, useRef } from "react";
import { useProjectStore } from "../../store/useProjectStore";
import { useUIStore } from "../../store/useUIStore";
import {
  detectFormat,
  importFromJSON,
  importFromCSV,
  importFromXLSX,
  type ImportFormat,
  type ImportResult,
  type CSVImportResult,
  type XLSXImportSheet,
} from "../../utils/io";
import { X, Upload, File, FileJson, FileSpreadsheet, Table2, AlertCircle } from "lucide-react";

type ImportStep = "select" | "preview" | "importing";

export function ImportDialog() {
  const showImportDialog = useUIStore((s) => s.showImportDialog);
  const setShowImportDialog = useUIStore((s) => s.setShowImportDialog);
  const showNotification = useUIStore((s) => s.showNotification);
  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const importProject = useProjectStore((s) => s.importProject);
  const replaceAllData = useProjectStore((s) => s.replaceAllData);
  const importSheetToProject = useProjectStore((s) => s.importSheetToProject);
  const addSheetToProject = useProjectStore((s) => s.addSheetToProject);

  const [step, setStep] = useState<ImportStep>("select");
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<ImportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Preview data
  const [jsonData, setJsonData] = useState<ImportResult | null>(null);
  const [csvData, setCsvData] = useState<CSVImportResult | null>(null);
  const [xlsxData, setXlsxData] = useState<XLSXImportSheet[] | null>(null);

  // Import options
  const [jsonMode, setJsonMode] = useState<"replace" | "merge">("merge");
  const [csvTargetSheetId, setCsvTargetSheetId] = useState<string>("");
  const [xlsxMode, setXlsxMode] = useState<"new_project" | "add_sheets">("new_project");

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!showImportDialog) return null;

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const sheets = activeProject?.sheets ?? [];

  const resetState = () => {
    setStep("select");
    setFile(null);
    setFormat(null);
    setError(null);
    setDragOver(false);
    setJsonData(null);
    setCsvData(null);
    setXlsxData(null);
    setJsonMode("merge");
    setCsvTargetSheetId("");
    setXlsxMode("new_project");
  };

  const handleClose = () => {
    resetState();
    setShowImportDialog(false);
  };

  const processFile = async (f: File) => {
    setFile(f);
    setError(null);

    const detected = detectFormat(f.name);
    if (!detected) {
      setError("不支持的文件格式，请选择 .json、.csv 或 .xlsx 文件");
      return;
    }
    setFormat(detected);

    try {
      setStep("importing");
      switch (detected) {
        case "json": {
          const result = await importFromJSON(f);
          setJsonData(result);
          break;
        }
        case "csv": {
          const result = await importFromCSV(f);
          setCsvData(result);
          // Default to first sheet of current project
          if (sheets.length > 0 && !csvTargetSheetId) {
            setCsvTargetSheetId(sheets[0].id);
          }
          break;
        }
        case "xlsx": {
          const result = await importFromXLSX(f);
          setXlsxData(result);
          break;
        }
      }
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "文件解析失败");
      setStep("select");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleImport = () => {
    try {
      if (format === "json" && jsonData) {
        if (jsonMode === "replace") {
          replaceAllData(jsonData.projects, jsonData.activeProjectId);
        } else {
          // Merge: add each imported project
          for (const project of jsonData.projects) {
            importProject(project);
          }
        }
        showNotification(`成功导入 ${jsonData.projects.length} 个项目`, "success");
      } else if (format === "csv" && csvData) {
        const targetId = csvTargetSheetId || sheets[0]?.id;
        if (!targetId) {
          showNotification("没有目标工作表", "error");
          return;
        }
        importSheetToProject(activeProjectId!, targetId, csvData);
        showNotification("CSV 数据导入成功", "success");
      } else if (format === "xlsx" && xlsxData) {
        if (xlsxMode === "new_project") {
          // Create a new project from XLSX sheets
          const projectId = crypto.randomUUID();
          const now = new Date().toISOString();
          const newProject = {
            id: projectId,
            name: file?.name?.replace(/\.xlsx?$/i, "") ?? "导入的 Excel",
            sheets: xlsxData.map((s) => ({
              id: crypto.randomUUID(),
              name: s.name,
              cells: s.cells,
              columnCount: s.columnCount,
              rowCount: s.rowCount,
              columnWidths: {},
              rowHeights: {},
              timeline: null,
              mergedCells: [],
            })),
            charts: [],
            createdAt: now,
            updatedAt: now,
          };
          importProject(newProject);
          showNotification(`成功导入 ${xlsxData.length} 个工作表`, "success");
        } else {
          // Add sheets to current project
          if (!activeProjectId) {
            showNotification("没有打开的项目", "error");
            return;
          }
          for (const sheetData of xlsxData) {
            addSheetToProject(activeProjectId, {
              id: crypto.randomUUID(),
              name: sheetData.name,
              cells: sheetData.cells,
              columnCount: sheetData.columnCount,
              rowCount: sheetData.rowCount,
              columnWidths: {},
              rowHeights: {},
              timeline: null,
              mergedCells: [],
            });
          }
          showNotification(`成功导入 ${xlsxData.length} 个工作表`, "success");
        }
      }

      handleClose();
    } catch (e) {
      showNotification(`导入失败: ${e instanceof Error ? e.message : "未知错误"}`, "error");
    }
  };

  const handleBack = () => {
    setStep("select");
    setFile(null);
    setFormat(null);
    setError(null);
    setJsonData(null);
    setCsvData(null);
    setXlsxData(null);
  };

  const formatIcon = (fmt: ImportFormat | null) => {
    switch (fmt) {
      case "json": return <FileJson size={20} className="text-orange-500" />;
      case "csv": return <Table2 size={20} className="text-green-500" />;
      case "xlsx": return <FileSpreadsheet size={20} className="text-blue-500" />;
      default: return <File size={20} className="text-gray-400" />;
    }
  };

  const formatLabel = (fmt: ImportFormat | null) => {
    switch (fmt) {
      case "json": return "JSON";
      case "csv": return "CSV";
      case "xlsx": return "Excel";
      default: return "未知";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-[520px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            导入数据
          </h2>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 mx-5 mt-4 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle size={16} className="text-red-500 shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Step: File Selection */}
        {step === "select" && (
          <>
            <div className="px-5 py-4">
              {/* File drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`flex flex-col items-center justify-center gap-3 p-10 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                  dragOver
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
              >
                <Upload size={36} className="text-gray-400" />
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    点击选择文件或拖拽文件到此处
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    支持 .json、.csv、.xlsx 格式
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="px-5 pb-4">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                JSON: 完整项目数据备份 | CSV: 纯文本表格数据 | Excel: Office 文档格式
              </p>
            </div>
          </>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <>
            <div className="px-5 py-4">
              {/* File info */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-lg">
                {formatIcon(format)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                    {file?.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatLabel(format)} · {(file?.size ?? 0) > 1024
                      ? `${((file?.size ?? 0) / 1024).toFixed(1)} KB`
                      : `${file?.size ?? 0} B`}
                  </p>
                </div>
                <button
                  onClick={handleBack}
                  className="text-xs text-blue-500 hover:text-blue-600 font-medium"
                >
                  重新选择
                </button>
              </div>

              {/* Preview summary */}
              <div className="mt-4 space-y-2">
                {format === "json" && jsonData && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">项目数</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {jsonData.projects.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">工作表总数</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {jsonData.projects.reduce((sum, p) => sum + p.sheets.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">图表数</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {jsonData.projects.reduce((sum, p) => sum + p.charts.length, 0)}
                      </span>
                    </div>
                  </>
                )}

                {format === "csv" && csvData && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">数据行数</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {csvData.maxRow + 1}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">数据列数</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {csvData.maxCol + 1}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">单元格数</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {Object.keys(csvData.cells).length}
                      </span>
                    </div>
                  </>
                )}

                {format === "xlsx" && xlsxData && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">工作表数</span>
                      <span className="font-medium text-gray-700 dark:text-gray-200">
                        {xlsxData.length}
                      </span>
                    </div>
                    {xlsxData.map((s, i) => (
                      <div key={i} className="flex justify-between text-sm ml-4">
                        <span className="text-gray-400 dark:text-gray-500">{s.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {Object.keys(s.cells).length} 个单元格
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Import Options */}
            <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700">
              {format === "json" && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    导入方式
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jsonMode"
                        value="merge"
                        checked={jsonMode === "merge"}
                        onChange={() => setJsonMode("merge")}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        合并到现有项目
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="jsonMode"
                        value="replace"
                        checked={jsonMode === "replace"}
                        onChange={() => setJsonMode("replace")}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        替换所有数据（将清除现有数据）
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {format === "csv" && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    导入到工作表
                  </p>
                  {sheets.length > 0 ? (
                    <select
                      value={csvTargetSheetId}
                      onChange={(e) => setCsvTargetSheetId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {sheets.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-red-500">
                      请先打开一个项目以导入 CSV 数据
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    CSV 数据将替换目标工作表中的现有内容
                  </p>
                </div>
              )}

              {format === "xlsx" && (
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    导入方式
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="xlsxMode"
                        value="new_project"
                        checked={xlsxMode === "new_project"}
                        onChange={() => setXlsxMode("new_project")}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        创建新项目
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="xlsxMode"
                        value="add_sheets"
                        checked={xlsxMode === "add_sheets"}
                        onChange={() => setXlsxMode("add_sheets")}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        添加到当前项目 ({activeProject?.name ?? "无"})
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                返回
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={format === "csv" && sheets.length === 0}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                导入
              </button>
            </div>
          </>
        )}

        {/* Importing spinner */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">正在解析文件...</p>
          </div>
        )}
      </div>
    </div>
  );
}

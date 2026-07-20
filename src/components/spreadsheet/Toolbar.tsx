import { useUIStore } from "../../store/useUIStore";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { parseCellRef } from "../../utils/cellAddress";
import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Clock,
  BarChart3,
  Plus,
  Trash2,
  Download,
  Upload,
} from "lucide-react";

export function Toolbar() {
  const activePanel = useUIStore((s) => s.activePanel);
  const setActivePanel = useUIStore((s) => s.setActivePanel);
  const setShowExportDialog = useUIStore((s) => s.setShowExportDialog);
  const setShowImportDialog = useUIStore((s) => s.setShowImportDialog);
  const selectedCell = useSpreadsheetStore((s) => s.selectedCell);
  const setCellStyle = useSpreadsheetStore((s) => s.setCellStyle);
  const insertRow = useSpreadsheetStore((s) => s.insertRow);
  const insertColumn = useSpreadsheetStore((s) => s.insertColumn);
  const deleteRow = useSpreadsheetStore((s) => s.deleteRow);
  const deleteColumn = useSpreadsheetStore((s) => s.deleteColumn);

  const handleStyle = (key: "bold" | "italic" | "textAlign", value: unknown) => {
    if (!selectedCell) return;
    const pos = parseCellRef(selectedCell);
    if (key === "bold") setCellStyle(pos.col, pos.row, { bold: value as boolean });
    if (key === "italic") setCellStyle(pos.col, pos.row, { italic: value as boolean });
    if (key === "textAlign") setCellStyle(pos.col, pos.row, { textAlign: value as "left" | "center" | "right" });
  };

  const handleInsertRow = () => {
    if (!selectedCell) return;
    const pos = parseCellRef(selectedCell);
    insertRow(pos.row);
  };

  const handleInsertCol = () => {
    if (!selectedCell) return;
    const pos = parseCellRef(selectedCell);
    insertColumn(pos.col);
  };

  const handleDeleteRow = () => {
    if (!selectedCell) return;
    const pos = parseCellRef(selectedCell);
    deleteRow(pos.row);
  };

  const handleDeleteCol = () => {
    if (!selectedCell) return;
    const pos = parseCellRef(selectedCell);
    deleteColumn(pos.col);
  };

  const btnBase = "p-1.5 rounded hover:bg-gray-100 transition-colors text-gray-500 dark:text-gray-400 dark:hover:bg-gray-700";
  const btnActive = "p-1.5 rounded bg-blue-50 text-blue-500 hover:bg-blue-100 transition-colors dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/40";

  return (
    <div className="flex items-center gap-1 px-4 py-1.5 border-b border-gray-200 bg-white shrink-0 dark:bg-gray-800 dark:border-gray-700">
      {/* Formatting */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1 dark:border-gray-700">
        <button onClick={() => handleStyle("bold", true)} className={btnBase} title="粗体">
          <Bold size={16} />
        </button>
        <button onClick={() => handleStyle("italic", true)} className={btnBase} title="斜体">
          <Italic size={16} />
        </button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1 dark:border-gray-700">
        <button onClick={() => handleStyle("textAlign", "left")} className={btnBase} title="左对齐">
          <AlignLeft size={16} />
        </button>
        <button onClick={() => handleStyle("textAlign", "center")} className={btnBase} title="居中">
          <AlignCenter size={16} />
        </button>
        <button onClick={() => handleStyle("textAlign", "right")} className={btnBase} title="右对齐">
          <AlignRight size={16} />
        </button>
      </div>

      {/* Row/Column operations */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1 dark:border-gray-700">
        <button onClick={handleInsertRow} className={btnBase} title="插入行">
          <Plus size={16} />
          <span className="text-[10px] ml-0.5">行</span>
        </button>
        <button onClick={handleInsertCol} className={btnBase} title="插入列">
          <Plus size={16} />
          <span className="text-[10px] ml-0.5">列</span>
        </button>
        <button onClick={handleDeleteRow} className={btnBase} title="删除行">
          <Trash2 size={14} />
          <span className="text-[10px] ml-0.5">行</span>
        </button>
        <button onClick={handleDeleteCol} className={btnBase} title="删除列">
          <Trash2 size={14} />
          <span className="text-[10px] ml-0.5">列</span>
        </button>
      </div>

      {/* Timeline & Chart toggles */}
      <div className="flex items-center gap-0.5 border-r border-gray-200 pr-2 mr-1 dark:border-gray-700">
        <button
          onClick={() => setActivePanel("timeline")}
          className={activePanel === "timeline" ? btnActive : btnBase}
          title="时间轴"
        >
          <Clock size={16} />
        </button>
        <button
          onClick={() => setActivePanel("chart")}
          className={activePanel === "chart" ? btnActive : btnBase}
          title="统计图"
        >
          <BarChart3 size={16} />
        </button>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Import / Export */}
      <div className="flex items-center gap-0.5">
        <button
          onClick={() => setShowImportDialog(true)}
          className={btnBase}
          title="导入数据"
        >
          <Download size={15} />
          <span className="text-[11px] ml-1">导入</span>
        </button>
        <button
          onClick={() => setShowExportDialog(true)}
          className={btnBase}
          title="导出数据"
        >
          <Upload size={15} />
          <span className="text-[11px] ml-1">导出</span>
        </button>
      </div>
    </div>
  );
}

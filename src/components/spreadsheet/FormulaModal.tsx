import { useState, useEffect } from "react";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { parseCellRef } from "../../utils/cellAddress";
import { X, HelpCircle } from "lucide-react";

interface Props {
  cellRef: string;
  onClose: () => void;
}

const FORMULA_EXAMPLES = [
  { syntax: "SUM(A1:A5)", desc: "求和" },
  { syntax: "AVERAGE(A1:A5)", desc: "平均值" },
  { syntax: "MAX(A1:A5)", desc: "最大值" },
  { syntax: "MIN(A1:A5)", desc: "最小值" },
  { syntax: "COUNT(A1:A5)", desc: "计数" },
  { syntax: "IF(A1>10, \"高\", \"低\")", desc: "条件判断" },
  { syntax: "A1+B1", desc: "加法" },
  { syntax: "A1*B1", desc: "乘法" },
];

export function FormulaModal({ cellRef, onClose }: Props) {
  const setCellFormula = useSpreadsheetStore((s) => s.setCellFormula);
  const getCell = useSpreadsheetStore((s) => s.getCell);
  const setCellRaw = useSpreadsheetStore((s) => s.setCellRaw);
  const [formula, setFormula] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  // Pre-fill with existing formula if any
  useEffect(() => {
    try {
      const pos = parseCellRef(cellRef);
      const cell = getCell(pos.col, pos.row);
      if (cell?.type === "formula") {
        setFormula(cell.raw.startsWith("=") ? cell.raw.slice(1) : cell.raw);
      }
    } catch {}
  }, [cellRef, getCell]);

  const handleSubmit = () => {
    const trimmed = formula.trim();
    if (!trimmed) return;
    try {
      const pos = parseCellRef(cellRef);
      setCellFormula(pos.col, pos.row, trimmed);
    } catch {}
    onClose();
  };

  const handleClear = () => {
    try {
      const pos = parseCellRef(cellRef);
      setCellRaw(pos.col, pos.row, "");
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-[420px] p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            插入公式 — {cellRef}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
            <X size={18} className="text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
              输入公式（无需输入 =）
            </label>
            <div className="flex gap-2">
              <span className="flex items-center justify-center w-7 h-9 bg-gray-100 dark:bg-gray-700 rounded text-sm font-bold text-gray-500 dark:text-gray-400 shrink-0">
                =
              </span>
              <input
                autoFocus
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                  if (e.key === "Escape") onClose();
                }}
                placeholder="例如: SUM(A1:A5)"
                className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
                spellCheck={false}
              />
            </div>
          </div>

          <button
            onClick={() => setShowHelp(!showHelp)}
            className="flex items-center gap-1 text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 transition-colors"
          >
            <HelpCircle size={12} />
            {showHelp ? "隐藏" : "查看"}公式帮助
          </button>

          {showHelp && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1.5 max-h-40 overflow-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                使用 A1 表示法引用单元格。公式不区分大小写。
              </p>
              {FORMULA_EXAMPLES.map((ex) => (
                <button
                  key={ex.syntax}
                  onClick={() => setFormula(ex.syntax)}
                  className="w-full flex items-center justify-between px-2 py-1 rounded text-xs hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors group"
                >
                  <code className="text-blue-600 dark:text-blue-400 font-mono">
                    ={ex.syntax}
                  </code>
                  <span className="text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ex.desc}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-2 mt-5">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
          >
            清除公式
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!formula.trim()}
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              确定
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

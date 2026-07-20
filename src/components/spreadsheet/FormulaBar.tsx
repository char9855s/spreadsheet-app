import { useState, useCallback, useRef, useEffect } from "react";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { parseCellRef } from "../../utils/cellAddress";
import { FormulaModal } from "./FormulaModal";
import { FunctionSquare } from "lucide-react";

export function FormulaBar() {
  const selectedCell = useSpreadsheetStore((s) => s.selectedCell);
  const editingCell = useSpreadsheetStore((s) => s.editingCell);
  const editValue = useSpreadsheetStore((s) => s.editValue);
  const startEditing = useSpreadsheetStore((s) => s.startEditing);
  const setEditValue = useSpreadsheetStore((s) => s.setEditValue);
  const commitEditing = useSpreadsheetStore((s) => s.commitEditing);
  const cancelEditing = useSpreadsheetStore((s) => s.cancelEditing);
  const getCell = useSpreadsheetStore((s) => s.getCell);

  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const cellRef = selectedCell ?? "";
  const isEditing = editingCell === selectedCell;

  // Calculate display value for the selected cell (not editing)
  const displayValue = (() => {
    if (!selectedCell) return "";
    try {
      const pos = parseCellRef(selectedCell);
      const cell = getCell(pos.col, pos.row);
      if (!cell || cell.raw === "") return "";
      if (cell.type === "formula" && cell.computed !== null && cell.computed !== undefined) {
        return String(cell.computed);
      }
      return cell.raw;
    } catch {
      return "";
    }
  })();

  // Sync editValue when a new cell is selected (and not already editing it)
  const prevSelectedRef = useRef(selectedCell);
  useEffect(() => {
    if (selectedCell && selectedCell !== prevSelectedRef.current && !isEditing) {
      prevSelectedRef.current = selectedCell;
      setEditValue(displayValue);
    } else if (selectedCell) {
      prevSelectedRef.current = selectedCell;
    }
  }, [selectedCell]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitEditing();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        cancelEditing();
      }
    },
    [commitEditing, cancelEditing],
  );

  const handleFocus = () => {
    if (selectedCell && !isEditing) {
      startEditing(selectedCell);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-1.5 border-b border-gray-200 bg-white shrink-0 dark:bg-gray-800 dark:border-gray-700 transition-colors duration-150">
        {/* Cell reference */}
        <div className="w-16 h-7 flex items-center justify-center bg-gray-50 border border-gray-200 rounded text-xs font-mono text-gray-600 shrink-0 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300">
          {cellRef}
        </div>

        {/* Formula button */}
        <button
          onClick={() => {
            if (selectedCell) setShowFormulaModal(true);
          }}
          disabled={!selectedCell}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="插入公式"
        >
          <FunctionSquare size={16} className="text-gray-500 dark:text-gray-400" />
        </button>

        {/* Input - always uses editValue (synced above) */}
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => {
            if (!isEditing && selectedCell) {
              startEditing(selectedCell);
            }
            setEditValue(e.target.value);
          }}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (isEditing) commitEditing();
          }}
          placeholder="输入值"
          className="flex-1 h-7 px-2 text-sm font-mono text-gray-700 border border-gray-200 rounded outline-none focus:border-blue-400 bg-white dark:text-gray-200 dark:border-gray-600 dark:bg-gray-700 transition-colors duration-150"
          spellCheck={false}
        />
      </div>

      {/* Formula modal */}
      {showFormulaModal && selectedCell && (
        <FormulaModal
          cellRef={selectedCell}
          onClose={() => setShowFormulaModal(false)}
        />
      )}
    </>
  );
}

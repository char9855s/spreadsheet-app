import { useRef, useCallback, useEffect, useState } from "react";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useUIStore } from "../../store/useUIStore";
import { colToLetter, toCellRef, parseCellRef } from "../../utils/cellAddress";
import type { CellStyle, CellPosition, MergedCell } from "../../types";
import {
  Pencil,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Plus,
  Eraser,
  Combine,
  Ungroup,
} from "lucide-react";

const DEFAULT_COL_WIDTH = 100;
const DEFAULT_ROW_HEIGHT = 28;

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  col: number;
  row: number;
}

export function Grid() {
  const project = useProjectStore((s) => s.getActiveProject());
  const getSheet = useSpreadsheetStore((s) => s.getSheet);
  const getCell = useSpreadsheetStore((s) => s.getCell);
  const setCellRaw = useSpreadsheetStore((s) => s.setCellRaw);
  const clearCells = useSpreadsheetStore((s) => s.clearCells);
  const selectedCell = useSpreadsheetStore((s) => s.selectedCell);
  const setSelectedCell = useSpreadsheetStore((s) => s.setSelectedCell);
  const editingCell = useSpreadsheetStore((s) => s.editingCell);
  const editValue = useSpreadsheetStore((s) => s.editValue);
  const setEditValue = useSpreadsheetStore((s) => s.setEditValue);
  const startEditing = useSpreadsheetStore((s) => s.startEditing);
  const commitEditing = useSpreadsheetStore((s) => s.commitEditing);
  const cancelEditing = useSpreadsheetStore((s) => s.cancelEditing);
  const resizeColumn = useSpreadsheetStore((s) => s.resizeColumn);
  const insertRow = useSpreadsheetStore((s) => s.insertRow);
  const insertColumn = useSpreadsheetStore((s) => s.insertColumn);
  const deleteRow = useSpreadsheetStore((s) => s.deleteRow);
  const deleteColumn = useSpreadsheetStore((s) => s.deleteColumn);
  const mergeCells = useSpreadsheetStore((s) => s.mergeCells);
  const unmergeCells = useSpreadsheetStore((s) => s.unmergeCells);

  // Column resize state
  const [resizing, setResizing] = useState<{ col: number; startX: number; startWidth: number } | null>(null);

  // Drag selection state
  const [dragStart, setDragStart] = useState<CellPosition | null>(null);
  const [dragEnd, setDragEnd] = useState<CellPosition | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    col: 0,
    row: 0,
  });

  // Clipboard
  const [clipboard, setClipboard] = useState<{ col: number; row: number; raw: string } | null>(null);

  // Ctrl+click multi-select
  const [multiSelected, setMultiSelected] = useState<Set<string>>(new Set());

  const isDark = useUIStore((s) => s.theme) === "dark";

  const gridRef = useRef<HTMLDivElement>(null);

  const sheet = getSheet();
  if (!sheet || !project) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm">
        未找到工作表
      </div>
    );
  }

  // Handle column resize
  useEffect(() => {
    if (!resizing) return;
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizing.startX;
      const newWidth = Math.max(40, resizing.startWidth + delta);
      resizeColumn(resizing.col, newWidth);
    };
    const handleMouseUp = () => setResizing(null);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [resizing, resizeColumn]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    if (contextMenu.visible) {
      window.addEventListener("click", handleClick);
      return () => window.removeEventListener("click", handleClick);
    }
  }, [contextMenu.visible]);

  // ---- Mouse handlers ----

  // Ensure grid div is focused whenever a cell is selected (for keyboard support)
  useEffect(() => {
    if (selectedCell && gridRef.current) {
      gridRef.current.focus();
    }
  }, [selectedCell]);

  const handleMouseDown = useCallback(
    (col: number, row: number, e: React.MouseEvent) => {
      if (e.button === 0) {
        const ref = toCellRef({ col, row });

        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd+click: toggle cell in multi-select
          setMultiSelected((prev) => {
            const next = new Set(prev);
            if (next.has(ref)) {
              next.delete(ref);
            } else {
              next.add(ref);
            }
            return next;
          });
          setSelectedCell(ref);
          // Don't start drag when Ctrl is held
          setIsDragging(false);
          return;
        }

        // Normal left click: clear multi-select
        setMultiSelected(new Set());
        setDragStart({ col, row });
        setDragEnd({ col, row });
        setIsDragging(true);
        setSelectedCell(ref);
      }
    },
    [setSelectedCell],
  );

  const handleMouseEnter = useCallback(
    (col: number, row: number) => {
      if (isDragging) {
        setDragEnd({ col, row });
      }
    },
    [isDragging],
  );

  // Global mouse up handler
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        // Commit range selection
        if (dragStart && dragEnd) {
          const startRef = toCellRef({
            col: Math.min(dragStart.col, dragEnd.col),
            row: Math.min(dragStart.row, dragEnd.row),
          });
          const endRef = toCellRef({
            col: Math.max(dragStart.col, dragEnd.col),
            row: Math.max(dragStart.row, dragEnd.row),
          });
          if (startRef !== endRef) {
            useSpreadsheetStore.setState({
              selectedRange: { start: startRef, end: endRef },
            });
          }
        }
      }
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [isDragging, dragStart, dragEnd]);

  // ---- Right-click handler ----

  const handleContextMenu = useCallback(
    (col: number, row: number, e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedCell(toCellRef({ col, row }));
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        col,
        row,
      });
    },
    [setSelectedCell],
  );

  // ---- Cell helpers ----

  const getDisplay = (col: number, row: number): string => {
    const cell = getCell(col, row);
    if (!cell || cell.raw === "") return "";
    if (cell.type === "formula") {
      if (cell.computed !== null && cell.computed !== undefined) {
        return String(cell.computed);
      }
      return cell.raw;
    }
    return cell.raw;
  };

  const getCellStyle = (col: number, row: number): CellStyle => {
    const cell = getCell(col, row);
    return cell?.style ?? {
      bold: false,
      italic: false,
      fontSize: 13,
      color: "#1f2937",
      backgroundColor: "transparent",
      textAlign: "left",
    };
  };

  const isSingleSelected = (col: number, row: number): boolean => {
    if (!selectedCell) return false;
    try {
      return selectedCell === toCellRef({ col, row });
    } catch {
      return false;
    }
  };

  const isInDragRange = (col: number, row: number): boolean => {
    if (!dragStart || !dragEnd) return false;
    const minCol = Math.min(dragStart.col, dragEnd.col);
    const maxCol = Math.max(dragStart.col, dragEnd.col);
    const minRow = Math.min(dragStart.row, dragEnd.row);
    const maxRow = Math.max(dragStart.row, dragEnd.row);
    return col >= minCol && col <= maxCol && row >= minRow && row <= maxRow;
  };

  const isMultiSelected = (col: number, row: number): boolean => {
    return multiSelected.has(toCellRef({ col, row }));
  };

  const isCellEditing = (col: number, row: number): boolean => {
    if (!editingCell) return false;
    try {
      return editingCell === toCellRef({ col, row });
    } catch {
      return false;
    }
  };

  // ---- Merge cell helpers ----

  const getMergedRegion = (col: number, row: number): MergedCell | undefined => {
    if (!sheet.mergedCells) return undefined;
    return sheet.mergedCells.find(
      (m) => col >= m.startCol && col <= m.endCol && row >= m.startRow && row <= m.endRow,
    );
  };

  const isMergeChild = (col: number, row: number): boolean => {
    const region = getMergedRegion(col, row);
    if (!region) return false;
    return col !== region.startCol || row !== region.startRow;
  };

  // ---- Context menu actions ----

  const handleContextEdit = () => {
    startEditing(toCellRef({ col: contextMenu.col, row: contextMenu.row }));
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextCopy = () => {
    const cell = getCell(contextMenu.col, contextMenu.row);
    if (cell) {
      setClipboard({ col: contextMenu.col, row: contextMenu.row, raw: cell.raw });
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextCut = () => {
    const cell = getCell(contextMenu.col, contextMenu.row);
    if (cell) {
      setClipboard({ col: contextMenu.col, row: contextMenu.row, raw: cell.raw });
      setCellRaw(contextMenu.col, contextMenu.row, "");
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextPaste = () => {
    if (clipboard) {
      setCellRaw(contextMenu.col, contextMenu.row, clipboard.raw);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextClear = () => {
    setCellRaw(contextMenu.col, contextMenu.row, "");
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextInsertRow = () => {
    insertRow(contextMenu.row);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextInsertCol = () => {
    insertColumn(contextMenu.col);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextDeleteRow = () => {
    deleteRow(contextMenu.row);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextDeleteCol = () => {
    deleteColumn(contextMenu.col);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextMerge = () => {
    // Merge using the drag selection range, or single cell (no-op)
    if (dragStart && dragEnd && (dragStart.col !== dragEnd.col || dragStart.row !== dragEnd.row)) {
      const sc = Math.min(dragStart.col, dragEnd.col);
      const sr = Math.min(dragStart.row, dragEnd.row);
      const ec = Math.max(dragStart.col, dragEnd.col);
      const er = Math.max(dragStart.row, dragEnd.row);
      mergeCells(sc, sr, ec, er);
    }
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleContextUnmerge = () => {
    unmergeCells(contextMenu.col, contextMenu.row);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  // ---- Keyboard navigation ----

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedCell) return;
      try {
        const pos = parseCellRef(selectedCell);
        let { col, row } = pos;

        switch (e.key) {
          case "ArrowUp": row = Math.max(0, row - 1); break;
          case "ArrowDown": row = Math.min(sheet.rowCount - 1, row + 1); break;
          case "ArrowLeft": col = Math.max(0, col - 1); break;
          case "ArrowRight": col = Math.min(sheet.columnCount - 1, col + 1); break;
          case "Tab":
            e.preventDefault();
            col = Math.min(sheet.columnCount - 1, col + (e.shiftKey ? -1 : 1));
            break;
          case "Enter":
            e.preventDefault();
            if (!editingCell) {
              startEditing(toCellRef(pos));
            }
            return;
          case "F2":
            e.preventDefault();
            startEditing(toCellRef(pos));
            return;
          case "Delete":
          case "Backspace":
            e.preventDefault();
            setCellRaw(col, row, "");
            return;
          case "Escape":
            if (editingCell) {
              e.preventDefault();
              cancelEditing();
            }
            return;
          default:
            if (e.ctrlKey && e.key === "c") {
              e.preventDefault();
              const cell = getCell(col, row);
              if (cell) setClipboard({ col, row, raw: cell.raw });
              return;
            }
            if (e.ctrlKey && e.key === "v") {
              e.preventDefault();
              if (clipboard) setCellRaw(col, row, clipboard.raw);
              return;
            }
            if (e.ctrlKey && e.key === "x") {
              e.preventDefault();
              const cell = getCell(col, row);
              if (cell) {
                setClipboard({ col, row, raw: cell.raw });
                setCellRaw(col, row, "");
              }
              return;
            }
            // Start editing on any character key
            if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !editingCell) {
              e.preventDefault();
              setSelectedCell(toCellRef(pos));
              startEditing(toCellRef(pos));
              setTimeout(() => setEditValue(e.key), 0);
            }
            return;
        }

        setSelectedCell(toCellRef({ col, row }));
        // Clear drag and multi-select when using keyboard
        setDragStart(null);
        setDragEnd(null);
        setMultiSelected(new Set());
        if (editingCell) {
          commitEditing();
        }
      } catch {
        // Invalid cell ref
      }
    },
    [
      selectedCell,
      editingCell,
      clipboard,
      sheet,
      setSelectedCell,
      startEditing,
      setEditValue,
      commitEditing,
      cancelEditing,
      setCellRaw,
      getCell,
    ],
  );

  const colCount = sheet.columnCount;
  const rowCount = sheet.rowCount;

  // Build visible rows
  const rows: JSX.Element[] = [];

  // Column headers row
  const headerCells: JSX.Element[] = [];
  for (let c = 0; c < colCount; c++) {
    const width = sheet.columnWidths[c] ?? DEFAULT_COL_WIDTH;
    headerCells.push(
      <div
        key={`h-${c}`}
        className="flex items-center justify-center bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 font-medium relative shrink-0 select-none"
        style={{ width, height: DEFAULT_ROW_HEIGHT, minWidth: width }}
      >
        {colToLetter(c)}
        <div
          className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-10"
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setResizing({ col: c, startX: e.clientX, startWidth: width });
          }}
        />
      </div>,
    );
  }
  rows.push(
    <div key="header" className="flex sticky top-0 z-20 bg-gray-50 dark:bg-gray-800">
      <div
        className="shrink-0 bg-gray-100 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 flex items-center justify-center sticky left-0 z-30"
        style={{ width: 46, minWidth: 46, height: DEFAULT_ROW_HEIGHT }}
      />
      {headerCells}
    </div>,
  );

  // Data rows
  for (let r = 0; r < rowCount; r++) {
    const dataCells: JSX.Element[] = [];
    for (let c = 0; c < colCount; c++) {
      // Skip cells that are children of a merged region
      if (isMergeChild(c, r)) continue;

      const baseWidth = sheet.columnWidths[c] ?? DEFAULT_COL_WIDTH;
      const style = getCellStyle(c, r);
      const display = getDisplay(c, r);
      const single = isSingleSelected(c, r);
      const inRange = isInDragRange(c, r);
      const multiSel = isMultiSelected(c, r);
      const editing = isCellEditing(c, r);

      // Calculate merged cell dimensions
      const mergeRegion = getMergedRegion(c, r);
      let mergedWidth = baseWidth;
      let mergedHeight = DEFAULT_ROW_HEIGHT;
      if (mergeRegion && mergeRegion.startCol === c && mergeRegion.startRow === r) {
        for (let mc = mergeRegion.startCol; mc <= mergeRegion.endCol; mc++) {
          if (mc !== c) mergedWidth += (sheet.columnWidths[mc] ?? DEFAULT_COL_WIDTH);
        }
        mergedHeight = DEFAULT_ROW_HEIGHT * (mergeRegion.endRow - mergeRegion.startRow + 1);
      }

      const cell = getCell(c, r);
      const isErrorVal = typeof cell?.computed === "string" && (cell.computed as string).startsWith("#");
      const isSelected = single || inRange || multiSel;

      const isMergeMaster = mergeRegion && mergeRegion.startCol === c && mergeRegion.startRow === r;

      dataCells.push(
        <div
          key={`${c}:${r}`}
          className={`flex items-center px-1.5 border-b border-r border-gray-100 dark:border-gray-700 text-sm select-none ${
            editing ? "z-20" : ""
          } ${isMergeMaster ? "z-10 relative" : "shrink-0"}`}
          title={cell?.type === "formula" ? cell.raw : isErrorVal ? `错误: ${cell!.computed}` : undefined}
          style={{
            width: mergedWidth,
            minWidth: mergedWidth,
            flexShrink: 0,
            height: mergedHeight,
            fontWeight: style.bold ? 600 : 400,
            fontStyle: style.italic ? "italic" : "normal",
            fontSize: style.fontSize,
            color: isErrorVal ? "#ef4444"
              : isSelected && isDark ? "#e5e7eb"
              : isDark ? "#d1d5db"
              : style.color,
            backgroundColor: isSelected
              ? isDark ? "#1e3a5f" : "#eff6ff"
              : style.backgroundColor !== "transparent"
                ? style.backgroundColor
                : isDark ? "#1f2937" : "#ffffff",
            textAlign: style.textAlign,
            outline: single && !editing && !isDragging
              ? "2px solid #3b82f6"
              : inRange && !single
                ? "1px solid #93c5fd"
                : "none",
            outlineOffset: single ? "-2px" : "-1px",
            cursor: "cell",
          }}
          onMouseDown={(e) => handleMouseDown(c, r, e)}
          onMouseEnter={() => handleMouseEnter(c, r)}
          onContextMenu={(e) => handleContextMenu(c, r, e)}
          onDoubleClick={() => {
            const ref = toCellRef({ col: c, row: r });
            setSelectedCell(ref);
            startEditing(ref);
          }}
        >
          {editing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitEditing();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelEditing();
                } else if (e.key === "Tab") {
                  e.preventDefault();
                  commitEditing();
                  setSelectedCell(toCellRef({ col: c + 1, row: r }));
                }
                e.stopPropagation();
              }}
              onBlur={() => commitEditing()}
              className="w-full h-full outline-none bg-transparent"
              style={{
                fontWeight: style.bold ? 600 : 400,
                fontStyle: style.italic ? "italic" : "normal",
                fontSize: style.fontSize,
                color: (single || inRange) && isDark ? "#e5e7eb" : style.color,
              }}
              spellCheck={false}
            />
          ) : (
            <span
              className={`truncate w-full block ${isErrorVal ? "text-red-500 dark:text-red-400 font-medium" : ""}`}
              style={{ textAlign: style.textAlign }}
            >
              {display}
            </span>
          )}
        </div>,
      );
    }

    // Check if this row contains a merged master cell that spans multiple rows
    const hasMergeMaster = dataCells.some(
      (cell) => (cell as any)?.key && sheet.mergedCells?.some(
        (m) => `${m.startCol}:${m.startRow}` === (cell as any).key && m.endRow > m.startRow
      )
    );

    rows.push(
      <div key={`row-${r}`} className="flex" style={{ minHeight: DEFAULT_ROW_HEIGHT }}>
        <div
          className="shrink-0 bg-gray-50 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400 sticky left-0 z-10 select-none"
          style={{ width: 46, minWidth: 46, minHeight: DEFAULT_ROW_HEIGHT }}
        >
          {r + 1}
        </div>
        {dataCells}
      </div>,
    );
  }

  return (
    <>
      <div
        ref={gridRef}
        className="h-full w-full overflow-auto outline-none"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        onClick={() => gridRef.current?.focus()}
      >
        <div className="inline-block min-w-full">
          {rows}
        </div>

        {/* Resize overlay */}
        {resizing && (
          <div className="fixed inset-0 z-50 cursor-col-resize" />
        )}
      </div>

      {/* Right-click context menu */}
      {contextMenu.visible && (
        <div
          className="fixed z-[100] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 w-44"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-gray-500 font-medium border-b border-gray-100 dark:border-gray-800">
            {toCellRef({ col: contextMenu.col, row: contextMenu.row })}
          </div>

          <button
            onClick={handleContextEdit}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Pencil size={13} className="text-gray-400 dark:text-gray-500" />
            编辑单元格
          </button>

          <div className="border-t border-gray-100 dark:border-gray-700 my-0.5" />

          <button
            onClick={handleContextCopy}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Copy size={13} className="text-gray-400 dark:text-gray-500" />
            复制 <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Ctrl+C</span>
          </button>

          <button
            onClick={handleContextCut}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Scissors size={13} className="text-gray-400 dark:text-gray-500" />
            剪切 <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Ctrl+X</span>
          </button>

          <button
            onClick={handleContextPaste}
            disabled={!clipboard}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ClipboardPaste size={13} className="text-gray-400 dark:text-gray-500" />
            粘贴 <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500">Ctrl+V</span>
          </button>

          <button
            onClick={handleContextClear}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Eraser size={13} className="text-gray-400 dark:text-gray-500" />
            清除内容
          </button>

          <div className="border-t border-gray-100 dark:border-gray-700 my-0.5" />

          {/* Merge cells — show when a range is selected */}
          {(() => {
            const hasRange = dragStart && dragEnd && (dragStart.col !== dragEnd.col || dragStart.row !== dragEnd.row);
            if (hasRange) {
              return (
                <button
                  onClick={handleContextMerge}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Combine size={13} className="text-gray-400 dark:text-gray-500" />
                  合并单元格
                </button>
              );
            }
            return null;
          })()}

          {/* Unmerge — show when cell is in a merged region */}
          {(() => {
            const region = getMergedRegion(contextMenu.col, contextMenu.row);
            if (region) {
              return (
                <button
                  onClick={handleContextUnmerge}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <Ungroup size={13} className="text-gray-400 dark:text-gray-500" />
                  拆分单元格
                </button>
              );
            }
            return null;
          })()}

          <div className="border-t border-gray-100 dark:border-gray-700 my-0.5" />

          <button
            onClick={handleContextInsertRow}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus size={13} className="text-gray-400 dark:text-gray-500" />
            在上方插入行
          </button>

          <button
            onClick={handleContextInsertCol}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <Plus size={13} className="text-gray-400 dark:text-gray-500" />
            在左侧插入列
          </button>

          <button
            onClick={handleContextDeleteRow}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={13} className="text-red-400" />
            删除当前行
          </button>

          <button
            onClick={handleContextDeleteCol}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={13} className="text-red-400" />
            删除当前列
          </button>
        </div>
      )}
    </>
  );
}

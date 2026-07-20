import { create } from "zustand";
import type {
  CellPosition,
  CellRange,
  CellData,
  CellStyle,
  Sheet,
  TimelineConfig,
  TimelineEvent,
} from "../types";
import {
  toCellKey,
  createDefaultCell,
  parseCellRef,
  colToLetter,
  letterToCol,
} from "../utils/cellAddress";
import { useProjectStore } from "./useProjectStore";
import { evaluateFormula } from "../engine/evaluator";

interface SpreadsheetState {
  activeSheetId: string | null;
  selectedCell: string | null; // "A1" notation
  selectedRange: { start: string; end: string } | null;
  editingCell: string | null;
  editValue: string;

  // Sheet data helpers
  getSheet: () => Sheet | undefined;
  getCell: (col: number, row: number) => CellData | undefined;
  getCellDisplay: (col: number, row: number) => string;

  // Cell operations
  setCellRaw: (col: number, row: number, raw: string) => void;
  setCellFormula: (col: number, row: number, formula: string) => void;
  setCellStyle: (col: number, row: number, style: Partial<CellStyle>) => void;
  clearCells: (positions: CellPosition[]) => void;

  // Selection
  setSelectedCell: (ref: string | null) => void;
  setSelectedRange: (
    range: { start: string; end: string } | null,
  ) => void;
  moveSelection: (dCol: number, dRow: number) => void;
  setActiveSheet: (sheetId: string) => void;

  // Editing
  startEditing: (ref: string) => void;
  setEditValue: (value: string) => void;
  commitEditing: () => void;
  cancelEditing: () => void;

  // Column/Row operations
  resizeColumn: (col: number, width: number) => void;
  resizeRow: (row: number, height: number) => void;
  insertRow: (afterRow: number) => void;
  insertColumn: (afterCol: number) => void;
  deleteRow: (row: number) => void;
  deleteColumn: (col: number) => void;

  // Timeline
  setTimeline: (sheetId: string, timeline: TimelineConfig | null) => void;
  addTimelineEvent: (sheetId: string, event: TimelineEvent) => void;
  updateTimelineEvent: (
    sheetId: string,
    eventId: string,
    updates: Partial<TimelineEvent>,
  ) => void;
  removeTimelineEvent: (sheetId: string, eventId: string) => void;

  // Merge cells
  mergeCells: (startCol: number, startRow: number, endCol: number, endRow: number) => void;
  unmergeCells: (col: number, row: number) => void;
}

export const useSpreadsheetStore = create<SpreadsheetState>((set, get) => ({
  activeSheetId: null,
  selectedCell: null,
  selectedRange: null,
  editingCell: null,
  editValue: "",

  getSheet: () => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return undefined;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    return project.sheets.find((s) => s.id === sheetId);
  },

  getCell: (col: number, row: number) => {
    const sheet = get().getSheet();
    if (!sheet) return undefined;
    return sheet.cells[toCellKey(col, row)];
  },

  getCellDisplay: (col: number, row: number) => {
    const cell = get().getCell(col, row);
    if (!cell || cell.raw === "") return "";
    if (cell.type === "formula") {
      if (cell.computed === null || cell.computed === undefined) return "";
      return String(cell.computed);
    }
    return cell.raw;
  },

  setCellRaw: (col: number, row: number, raw: string) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;

    const key = toCellKey(col, row);
    const existing = project.sheets.find((s) => s.id === sheetId)?.cells[key];

    const isFormula = raw.startsWith("=");
    const cellData: CellData = {
      raw,
      computed: null,
      type: isFormula ? "formula" : isNaN(Number(raw)) || raw === "" ? "text" : "number",
      style: existing?.style ?? {
        bold: false,
        italic: false,
        fontSize: 13,
        color: "#1f2937",
        backgroundColor: "transparent",
        textAlign: "left" as const,
      },
    };

    // Pre-compute
    if (raw === "") {
      cellData.computed = null;
    } else if (isFormula) {
      // Evaluate formula
      try {
        const sheet = get().getSheet();
        if (sheet) {
          const cells = sheet.cells;
          const result = evaluateFormula(raw,
            (c: number, r: number) => {
              const cell = cells[toCellKey(c, r)];
              if (!cell || cell.raw === "") return null;
              if (cell.type === "formula" && cell.computed !== null) return cell.computed;
              if (cell.type === "number") return Number(cell.raw);
              return cell.raw;
            },
            (sc: number, sr: number, ec: number, er: number) => {
              const values: (string | number | boolean | null)[][] = [];
              for (let rr = sr; rr <= er; rr++) {
                const row: (string | number | boolean | null)[] = [];
                for (let cc = sc; cc <= ec; cc++) {
                  const cell = cells[toCellKey(cc, rr)];
                  if (!cell || cell.raw === "") row.push(null);
                  else if (cell.type === "formula" && cell.computed !== null) row.push(cell.computed as string | number | boolean | null);
                  else if (cell.type === "number") row.push(Number(cell.raw));
                  else row.push(cell.raw);
                }
                values.push(row);
              }
              return values;
            },
          );
          if (result === null || result === undefined) cellData.computed = null;
          else if (typeof result === "boolean") cellData.computed = result ? "TRUE" : "FALSE";
          else cellData.computed = result as string | number;
        }
      } catch { cellData.computed = "#ERROR"; }
    } else if (!isNaN(Number(raw))) {
      cellData.computed = Number(raw);
    } else {
      cellData.computed = raw;
    }

    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      cells: { ...s.cells, [key]: cellData },
                    }
                  : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  setCellFormula: (col: number, row: number, formula: string) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    const key = toCellKey(col, row);
    const existing = project.sheets.find((s) => s.id === sheetId)?.cells[key];

    const cellData: CellData = {
      raw: "=" + formula,
      computed: null,
      type: "formula",
      style: existing?.style ?? {
        bold: false,
        italic: false,
        fontSize: 13,
        color: "#1f2937",
        backgroundColor: "transparent",
        textAlign: "left" as const,
      },
    };

    // Evaluate formula
    try {
      const sheet = get().getSheet();
      if (sheet) {
        const cells = sheet.cells;
        const result = evaluateFormula(
          "=" + formula,
          (c: number, r: number) => {
            const cell = cells[toCellKey(c, r)];
            if (!cell || cell.raw === "") return null;
            if (cell.type === "formula" && cell.computed !== null) return cell.computed;
            if (cell.type === "number") return Number(cell.raw);
            return cell.raw;
          },
          (sc: number, sr: number, ec: number, er: number) => {
            const values = [];
            for (let r = sr; r <= er; r++) {
              const row = [];
              for (let c = sc; c <= ec; c++) {
                const cell = cells[toCellKey(c, r)];
                if (!cell || cell.raw === "") {
                  row.push(null);
                } else if (cell.type === "formula" && cell.computed !== null) {
                  row.push(cell.computed);
                } else if (cell.type === "number") {
                  row.push(Number(cell.raw));
                } else {
                  row.push(cell.raw);
                }
              }
              values.push(row);
            }
            return values;
          },
        );
        if (result === null || result === undefined) {
          cellData.computed = null;
        } else if (typeof result === "boolean") {
          cellData.computed = result ? "TRUE" : "FALSE";
        } else if (typeof result === "string" || typeof result === "number") {
          cellData.computed = result;
        } else {
          cellData.computed = String(result);
        }
      }
    } catch {
      cellData.computed = "#ERROR";
    }

    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? { ...s, cells: { ...s.cells, [key]: cellData } }
                  : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  setCellStyle: (col: number, row: number, style: Partial<CellStyle>) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    const key = toCellKey(col, row);

    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      cells: {
                        ...s.cells,
                        [key]: {
                          ...(s.cells[key] ?? createDefaultCell()),
                          style: {
                            ...(s.cells[key]?.style ?? createDefaultCell().style),
                            ...style,
                          },
                        },
                      },
                    }
                  : s,
              ),
            }
          : p,
      ),
    }));
  },

  clearCells: (positions: CellPosition[]) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;

    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells = { ...s.cells };
                for (const pos of positions) {
                  delete newCells[toCellKey(pos.col, pos.row)];
                }
                return { ...s, cells: newCells };
              }),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  setSelectedCell: (ref: string | null) => {
    set({
      selectedCell: ref,
      selectedRange: null,
    });
  },

  setSelectedRange: (range: { start: string; end: string } | null) => {
    set({ selectedRange: range, selectedCell: range?.start ?? null });
  },

  moveSelection: (dCol: number, dRow: number) => {
    const { selectedCell } = get();
    if (!selectedCell) return;
    const match = selectedCell.match(/^([A-Z]+)(\d+)$/);
    if (!match) return;
    const col = Math.max(0, letterToCol(match[1]) + dCol);
    const row = Math.max(0, parseInt(match[2], 10) - 1 + dRow);
    set({ selectedCell: `${colToLetter(col)}${row + 1}` });
  },

  setActiveSheet: (sheetId: string) => {
    set({ activeSheetId: sheetId, selectedCell: null, editingCell: null });
  },

  startEditing: (ref: string) => {
    const sheet = get().getSheet();
    if (!sheet) return;
    // Find cell by A1 ref
    const pos = parseCellRef(ref);
    const cell = sheet.cells[toCellKey(pos.col, pos.row)];
    set({
      editingCell: ref,
      editValue: cell?.raw ?? "",
    });
  },

  setEditValue: (value: string) => {
    set({ editValue: value });
  },

  commitEditing: () => {
    const { editingCell, editValue } = get();
    if (!editingCell) return;
    const pos = parseCellRef(editingCell);
    get().setCellRaw(pos.col, pos.row, editValue);
    set({ editingCell: null, editValue: "" });

    // Trigger formula evaluation for the project
    useProjectStore.getState().saveToStorage();
  },

  cancelEditing: () => {
    set({ editingCell: null, editValue: "" });
  },

  resizeRow: (row: number, height: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      rowHeights: { ...s.rowHeights, [row]: height },
                    }
                  : s,
              ),
            }
          : p,
      ),
    }));
  },

  resizeColumn: (col: number, width: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      columnWidths: { ...s.columnWidths, [col]: width },
                    }
                  : s,
              ),
            }
          : p,
      ),
    }));
  },

  insertRow: (afterRow: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, CellData> = {};
                for (const [key, cell] of Object.entries(s.cells)) {
                  const [c, r] = key.split(":").map(Number);
                  newCells[toCellKey(c, r > afterRow ? r + 1 : r)] = cell;
                }
                return {
                  ...s,
                  cells: newCells,
                  rowCount: s.rowCount + 1,
                };
              }),
            }
          : p,
      ),
    }));
  },

  insertColumn: (afterCol: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, CellData> = {};
                for (const [key, cell] of Object.entries(s.cells)) {
                  const [c, r] = key.split(":").map(Number);
                  newCells[toCellKey(c > afterCol ? c + 1 : c, r)] = cell;
                }
                return {
                  ...s,
                  cells: newCells,
                  columnCount: s.columnCount + 1,
                };
              }),
            }
          : p,
      ),
    }));
  },

  deleteRow: (row: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, CellData> = {};
                for (const [key, cell] of Object.entries(s.cells)) {
                  const [c, r] = key.split(":").map(Number);
                  if (r === row) continue; // Delete cells in this row
                  newCells[toCellKey(c, r > row ? r - 1 : r)] = cell;
                }
                return {
                  ...s,
                  cells: newCells,
                  rowCount: Math.max(1, s.rowCount - 1),
                };
              }),
            }
          : p,
      ),
    }));
  },

  deleteColumn: (col: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) => {
                if (s.id !== sheetId) return s;
                const newCells: Record<string, CellData> = {};
                for (const [key, cell] of Object.entries(s.cells)) {
                  const [c, r] = key.split(":").map(Number);
                  if (c === col) continue; // Delete cells in this column
                  newCells[toCellKey(c > col ? c - 1 : c, r)] = cell;
                }
                return {
                  ...s,
                  cells: newCells,
                  columnCount: Math.max(1, s.columnCount - 1),
                };
              }),
            }
          : p,
      ),
    }));
  },

  // Timeline actions
  setTimeline: (sheetId: string, timeline: TimelineConfig | null) => {
    const project = useProjectStore.getState().getActiveProject();
    if (!project) return;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId ? { ...s, timeline } : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  addTimelineEvent: (sheetId: string, event: TimelineEvent) => {
    const project = useProjectStore.getState().getActiveProject();
    if (!project) return;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId && s.timeline
                  ? {
                      ...s,
                      timeline: {
                        ...s.timeline,
                        events: [...s.timeline.events, event],
                      },
                    }
                  : s,
              ),
            }
          : p,
      ),
    }));
  },

  updateTimelineEvent: (
    sheetId: string,
    eventId: string,
    updates: Partial<TimelineEvent>,
  ) => {
    const project = useProjectStore.getState().getActiveProject();
    if (!project) return;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId && s.timeline
                  ? {
                      ...s,
                      timeline: {
                        ...s.timeline,
                        events: s.timeline.events.map((e) =>
                          e.id === eventId ? { ...e, ...updates } : e,
                        ),
                      },
                    }
                  : s,
              ),
            }
          : p,
      ),
    }));
  },

  removeTimelineEvent: (sheetId: string, eventId: string) => {
    const project = useProjectStore.getState().getActiveProject();
    if (!project) return;
    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId && s.timeline
                  ? {
                      ...s,
                      timeline: {
                        ...s.timeline,
                        events: s.timeline.events.filter(
                          (e) => e.id !== eventId,
                        ),
                      },
                    }
                  : s,
              ),
            }
          : p,
      ),
    }));
  },

  mergeCells: (startCol: number, startRow: number, endCol: number, endRow: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    if (!sheetId) return;

    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      mergedCells: [
                        ...s.mergedCells,
                        { startCol, startRow, endCol, endRow },
                      ],
                    }
                  : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  unmergeCells: (col: number, row: number) => {
    const project = useProjectStore.getState().getActiveProject();
    const { activeSheetId } = get();
    if (!project) return;
    const sheetId = activeSheetId ?? project.sheets[0]?.id;
    if (!sheetId) return;

    useProjectStore.setState((state) => ({
      projects: state.projects.map((p) =>
        p.id === project.id
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      mergedCells: s.mergedCells.filter(
                        (m) => !(col >= m.startCol && col <= m.endCol && row >= m.startRow && row <= m.endRow),
                      ),
                    }
                  : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },
}));

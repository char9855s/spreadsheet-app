// ============================================================
// Core Types
// ============================================================

export interface Project {
  id: string;
  name: string;
  sheets: Sheet[];
  charts: ChartConfig[];
  createdAt: string;
  updatedAt: string;
}

export interface MergedCell {
  startCol: number;
  startRow: number;
  endCol: number;
  endRow: number;
}

export interface Sheet {
  id: string;
  name: string;
  cells: Record<string, CellData>; // key: "0:0" = col:row
  columnCount: number; // default 26
  rowCount: number; // default 100
  columnWidths: Record<number, number>; // colIndex → px
  rowHeights: Record<number, number>; // rowIndex → px
  timeline: TimelineConfig | null;
  mergedCells: MergedCell[];
}

export interface CellData {
  raw: string; // User's raw input (text, number, or "=SUM(A1:A5)")
  computed: string | number | null; // Evaluated result
  type: "text" | "number" | "formula";
  style: CellStyle;
}

export interface CellStyle {
  bold: boolean;
  italic: boolean;
  fontSize: number;
  color: string;
  backgroundColor: string;
  textAlign: "left" | "center" | "right";
}

export interface CellPosition {
  col: number;
  row: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

// ============================================================
// Timeline Types
// ============================================================

export interface TimelineConfig {
  startDate: string; // ISO date "2026-01-01"
  endDate: string; // ISO date "2026-12-31"
  headerRowIndex: number; // Which row the timeline is displayed on
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  name: string;
  startDate: string;
  endDate: string; // Same as startDate for point events
  color: string;
  type: "point" | "range";
  description: string;
}

// ============================================================
// Chart Types
// ============================================================

export type ChartType = "bar" | "line" | "pie" | "area";

export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  sheetId: string;
  categoryRange: {
    colStart: number;
    colEnd: number;
    rowStart: number;
    rowEnd: number;
  };
  dataRanges: DataRange[];
}

export interface DataRange {
  label: string;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
}

// ============================================================
// Formula AST Types
// ============================================================

export type FormulaNodeType =
  | "number"
  | "string"
  | "boolean"
  | "cellRef"
  | "rangeRef"
  | "binaryOp"
  | "unaryOp"
  | "functionCall"
  | "error";

export interface FormulaAstNode {
  type: FormulaNodeType;
  value?: string | number | boolean;
  operator?: string;
  left?: FormulaAstNode;
  right?: FormulaAstNode;
  argument?: FormulaAstNode;
  functionName?: string;
  arguments?: FormulaAstNode[];
  reference?: string;
  col?: number;
  row?: number;
  startCol?: number;
  startRow?: number;
  endCol?: number;
  endRow?: number;
}

// ============================================================
// Formula Error Types
// ============================================================

export type CellError =
  | "#DIV/0!"
  | "#VALUE!"
  | "#REF!"
  | "#NAME?"
  | "#N/A"
  | "#NUM!"
  | "#ERROR";

export type DisplayValue = string | number | boolean | null | CellError;

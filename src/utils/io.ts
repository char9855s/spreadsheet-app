// ============================================================
// Import / Export Service
// ============================================================
import type { Project, Sheet, CellData, CellStyle } from "../types";
import { colToLetter, toCellKey } from "./cellAddress";
import { downloadFile, pickFile, readFileAsText, readFileAsArrayBuffer } from "./storage";

// We import xlsx dynamically to avoid bloating the initial bundle
// for users who never use XLSX features.

/**
 * Lazily load the xlsx library. Throws a user-friendly error if not installed.
 */
async function loadXLSX(): Promise<typeof import("xlsx")> {
  try {
    // @vite-ignore — xlsx is an optional dependency for Excel features
    return await import("xlsx");
  } catch {
    throw new Error(
      "Excel 导入/导出需要 xlsx 库。请在项目目录运行: npm install xlsx",
    );
  }
}

// ============================================================
// Format Detection
// ============================================================

export type ImportFormat = "json" | "csv" | "xlsx";
export type ExportFormat = ImportFormat;

export function detectFormat(filename: string): ImportFormat | null {
  const ext = filename.toLowerCase().split(".").pop();
  switch (ext) {
    case "json":
      return "json";
    case "csv":
      return "csv";
    case "xlsx":
    case "xls":
      return "xlsx";
    default:
      return null;
  }
}

// ============================================================
// JSON Export
// ============================================================

export function exportToJSON(
  projects: Project[],
  activeProjectId: string | null,
  allProjects: boolean = false,
): void {
  const exportData = allProjects
    ? { projects, activeProjectId, exportedAt: new Date().toISOString() }
    : {
        projects: projects.filter((p) => p.id === activeProjectId),
        activeProjectId,
        exportedAt: new Date().toISOString(),
      };

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: "application/json" });

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const projectName = activeProject?.name ?? "spreadsheet";
  const safeName = projectName.replace(/[^a-zA-Z0-9一-鿿_-]/g, "_");
  const suffix = allProjects ? "_all" : "";

  downloadFile(blob, `${safeName}${suffix}_backup.json`);
}

// ============================================================
// CSV Export
// ============================================================

function escapeCSV(value: string): string {
  // If the value contains commas, quotes, or newlines, wrap in quotes
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

export function exportToCSV(sheet: Sheet): void {
  const lines: string[] = [];

  // Determine the actual data bounds
  let maxCol = 0;
  let maxRow = 0;

  for (const key of Object.keys(sheet.cells)) {
    const [c, r] = key.split(":").map(Number);
    const cell = sheet.cells[key];
    if (cell && cell.raw !== "") {
      maxCol = Math.max(maxCol, c);
      maxRow = Math.max(maxRow, r);
    }
  }

  // If no data, export empty file with just headers
  if (maxCol === 0 && maxRow === 0 && Object.keys(sheet.cells).length === 0) {
    const blob = new Blob([""], { type: "text/csv;charset=utf-8" });
    downloadFile(blob, `${sheet.name}.csv`);
    return;
  }

  // Build CSV rows
  for (let row = 0; row <= maxRow; row++) {
    const values: string[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const cell = sheet.cells[toCellKey(col, row)];
      if (cell) {
        // For formulas, export the computed value if available, otherwise the raw formula
        if (cell.type === "formula" && cell.computed !== null && cell.computed !== undefined) {
          values.push(String(cell.computed));
        } else {
          values.push(cell.raw);
        }
      } else {
        values.push("");
      }
    }
    lines.push(values.map(escapeCSV).join(","));
  }

  const csv = lines.join("\n");
  // Add BOM for Excel UTF-8 compatibility
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });

  downloadFile(blob, `${sheet.name}.csv`);
}

// ============================================================
// XLSX Export
// ============================================================

export async function exportToXLSX(project: Project, sheetId?: string): Promise<void> {
  const XLSX = await loadXLSX();

  const wb = XLSX.utils.book_new();

  const sheets = sheetId
    ? project.sheets.filter((s) => s.id === sheetId)
    : project.sheets;

  for (const sheet of sheets) {
    const data = sheetToAOA(sheet);
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31)); // Excel sheet name limit
  }

  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbout as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const safeName = project.name.replace(/[^a-zA-Z0-9一-鿿_-]/g, "_");
  downloadFile(blob, `${safeName}.xlsx`);
}

/**
 * Convert a Sheet to Array-of-Arrays for XLSX export.
 */
function sheetToAOA(sheet: Sheet): (string | number | null)[][] {
  let maxCol = -1;
  let maxRow = -1;

  for (const key of Object.keys(sheet.cells)) {
    const [c, r] = key.split(":").map(Number);
    if (sheet.cells[key]?.raw !== "") {
      maxCol = Math.max(maxCol, c);
      maxRow = Math.max(maxRow, r);
    }
  }

  // Empty sheet
  if (maxCol < 0 || maxRow < 0) {
    return [[""]];
  }

  const rows: (string | number | null)[][] = [];
  for (let row = 0; row <= maxRow; row++) {
    const rowData: (string | number | null)[] = [];
    for (let col = 0; col <= maxCol; col++) {
      const cell = sheet.cells[toCellKey(col, row)];
      if (!cell || cell.raw === "") {
        rowData.push(null);
      } else if (cell.type === "number") {
        rowData.push(Number(cell.raw));
      } else if (cell.type === "formula" && cell.computed !== null && cell.computed !== undefined) {
        const v = cell.computed;
        rowData.push(typeof v === "number" ? v : String(v));
      } else {
        rowData.push(cell.raw);
      }
    }
    rows.push(rowData);
  }

  return rows;
}

// ============================================================
// JSON Import
// ============================================================

export interface ImportResult {
  projects: Project[];
  activeProjectId: string | null;
}

export async function importFromJSON(file: File): Promise<ImportResult> {
  const text = await readFileAsText(file);
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("无效的 JSON 文件格式");
  }

  // Check if it's our export format (wrapper with projects array)
  if (data && typeof data === "object" && "projects" in data) {
    const wrapper = data as { projects: Project[]; activeProjectId?: string | null };
    if (!Array.isArray(wrapper.projects)) {
      throw new Error("JSON 文件中未找到有效的项目数据");
    }
    return {
      projects: validateProjects(wrapper.projects),
      activeProjectId: wrapper.activeProjectId ?? null,
    };
  }

  // Check if it's a bare project
  if (data && typeof data === "object" && "sheets" in data) {
    const project = validateProject(data as Project);
    return {
      projects: [project],
      activeProjectId: project.id,
    };
  }

  // Check if it's an array of projects
  if (Array.isArray(data)) {
    return {
      projects: validateProjects(data),
      activeProjectId: null,
    };
  }

  throw new Error("无法识别的 JSON 数据格式");
}

function validateProjects(projects: unknown[]): Project[] {
  return projects.map((p, i) => {
    if (!p || typeof p !== "object") {
      throw new Error(`项目 #${i + 1} 数据无效`);
    }
    return validateProject(p as Project);
  });
}

function validateProject(p: Project): Project {
  return {
    id: p.id ?? crypto.randomUUID(),
    name: p.name ?? "导入的项目",
    sheets: Array.isArray(p.sheets) ? p.sheets.map(validateSheet) : [],
    charts: Array.isArray(p.charts) ? p.charts : [],
    createdAt: p.createdAt ?? new Date().toISOString(),
    updatedAt: p.updatedAt ?? new Date().toISOString(),
  };
}

function validateSheet(s: Sheet): Sheet {
  return {
    id: s.id ?? crypto.randomUUID(),
    name: s.name ?? "Sheet",
    cells: s.cells ?? {},
    columnCount: s.columnCount ?? 26,
    rowCount: s.rowCount ?? 100,
    columnWidths: s.columnWidths ?? {},
    rowHeights: s.rowHeights ?? {},
    timeline: s.timeline ?? null,
    mergedCells: Array.isArray(s.mergedCells) ? s.mergedCells : [],
  };
}

// ============================================================
// CSV Import
// ============================================================

export interface CSVImportResult {
  cells: Record<string, CellData>;
  maxCol: number;
  maxRow: number;
}

const defaultStyle: CellStyle = {
  bold: false,
  italic: false,
  fontSize: 13,
  color: "#1f2937",
  backgroundColor: "transparent",
  textAlign: "left",
};

export async function importFromCSV(file: File): Promise<CSVImportResult> {
  const text = await readFileAsText(file);

  // Strip BOM if present
  const content = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  const rows = parseCSVLines(content);
  const cells: Record<string, CellData> = {};
  let maxCol = 0;
  let maxRow = 0;

  for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    maxRow = Math.max(maxRow, rowIdx);

    for (let colIdx = 0; colIdx < row.length; colIdx++) {
      const value = row[colIdx];
      maxCol = Math.max(maxCol, colIdx);

      if (value === "") continue; // Skip empty cells

      const isFormula = value.startsWith("=");
      const isNumber = !isFormula && !isNaN(Number(value)) && value !== "";

      cells[toCellKey(colIdx, rowIdx)] = {
        raw: value,
        computed: isNumber ? Number(value) : value,
        type: isFormula ? "formula" : isNumber ? "number" : "text",
        style: { ...defaultStyle },
      };
    }
  }

  return { cells, maxCol, maxRow };
}

/**
 * Parse CSV content into a 2D array of strings.
 * Handles quoted fields, escaped quotes, and embedded newlines.
 */
function parseCSVLines(content: string): string[][] {
  const result: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          // Escaped quote
          currentField += '"';
          i++; // Skip next char
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentField += ch;
      }
    } else {
      if (ch === '"') {
        if (currentField === "") {
          // Start of quoted field
          inQuotes = true;
        } else {
          // Quote in the middle of an unquoted field — treat as literal
          currentField += ch;
        }
      } else if (ch === ",") {
        currentRow.push(currentField);
        currentField = "";
      } else if (ch === "\n") {
        currentRow.push(currentField);
        currentField = "";
        result.push(currentRow);
        currentRow = [];
      } else if (ch === "\r") {
        // Skip CR; handle CRLF
        if (next === "\n") continue;
        currentRow.push(currentField);
        currentField = "";
        result.push(currentRow);
        currentRow = [];
      } else {
        currentField += ch;
      }
    }
  }

  // Don't forget the last field and row
  currentRow.push(currentField);
  if (currentRow.length > 1 || currentRow[0] !== "") {
    result.push(currentRow);
  }

  return result;
}

// ============================================================
// XLSX Import
// ============================================================

export interface XLSXImportSheet {
  name: string;
  cells: Record<string, CellData>;
  columnCount: number;
  rowCount: number;
}

export async function importFromXLSX(file: File): Promise<XLSXImportSheet[]> {
  const XLSX = await loadXLSX();
  const buffer = await readFileAsArrayBuffer(file);
  const data = new Uint8Array(buffer);

  const wb = XLSX.read(data, { type: "array" });
  const sheets: XLSXImportSheet[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const aoa: (string | number | boolean | null)[][] = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    const cells: Record<string, CellData> = {};
    let maxCol = 0;
    let maxRow = 0;

    for (let rowIdx = 0; rowIdx < aoa.length; rowIdx++) {
      const row = aoa[rowIdx];
      maxRow = Math.max(maxRow, rowIdx);

      for (let colIdx = 0; colIdx < row.length; colIdx++) {
        const value = row[colIdx];
        maxCol = Math.max(maxCol, colIdx);

        if (value === null || value === undefined || value === "") continue;

        const strValue = String(value);
        const isNumber = typeof value === "number";
        const isFormula = typeof strValue === "string" && strValue.startsWith("=");

        cells[toCellKey(colIdx, rowIdx)] = {
          raw: strValue,
          computed: typeof value === "boolean" ? (value ? "TRUE" : "FALSE") : (value as string | number | null),
          type: isFormula ? "formula" : isNumber ? "number" : "text",
          style: { ...defaultStyle },
        };
      }
    }

    sheets.push({
      name: sheetName,
      cells,
      columnCount: Math.max(26, maxCol + 1),
      rowCount: Math.max(100, maxRow + 1),
    });
  }

  return sheets;
}

// ============================================================
// Quick Export/Import via File Picker (used by UI)
// ============================================================

export async function pickAndImportJSON(): Promise<ImportResult | null> {
  const file = await pickFile(".json");
  if (!file) return null;
  return importFromJSON(file);
}

export async function pickAndImportCSV(): Promise<CSVImportResult | null> {
  const file = await pickFile(".csv");
  if (!file) return null;
  return importFromCSV(file);
}

export async function pickAndImportXLSX(): Promise<XLSXImportSheet[] | null> {
  const file = await pickFile(".xlsx,.xls");
  if (!file) return null;
  return importFromXLSX(file);
}

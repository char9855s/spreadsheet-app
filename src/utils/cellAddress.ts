import type { CellPosition } from "../types";

/**
 * Convert column index (0-based) to column letter(s).
 * 0 → "A", 1 → "B", 25 → "Z", 26 → "AA", 27 → "AB"
 */
export function colToLetter(col: number): string {
  let result = "";
  let n = col;
  while (n >= 0) {
    result = String.fromCharCode(65 + (n % 26)) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

/**
 * Convert column letter(s) to 0-based index.
 * "A" → 0, "Z" → 25, "AA" → 26
 */
export function letterToCol(letter: string): number {
  let result = 0;
  for (let i = 0; i < letter.length; i++) {
    result = result * 26 + (letter.charCodeAt(i) - 65 + 1);
  }
  return result - 1;
}

/**
 * Convert A1-notation to CellPosition.
 * "A1" → {col: 0, row: 0}, "B10" → {col: 1, row: 9}
 */
export function parseCellRef(ref: string): CellPosition {
  const match = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) throw new Error(`Invalid cell reference: ${ref}`);
  return {
    col: letterToCol(match[1]),
    row: parseInt(match[2], 10) - 1,
  };
}

/**
 * Convert CellPosition to A1-notation.
 * {col: 0, row: 0} → "A1"
 */
export function toCellRef(pos: CellPosition): string {
  return `${colToLetter(pos.col)}${pos.row + 1}`;
}

/**
 * Convert {col, row} to internal cell key "col:row"
 */
export function toCellKey(col: number, row: number): string {
  return `${col}:${row}`;
}

/**
 * Parse internal cell key to {col, row}
 */
export function fromCellKey(key: string): CellPosition {
  const [col, row] = key.split(":").map(Number);
  return { col, row };
}

/**
 * Parse an A1:B10 style range reference.
 * Returns {start, end} CellPositions (normalized so start ≤ end).
 */
export function parseRangeRef(
  ref: string,
): { start: CellPosition; end: CellPosition } | null {
  const match = ref.toUpperCase().match(/^([A-Z]+\d+):([A-Z]+\d+)$/);
  if (!match) return null;
  const start = parseCellRef(match[1]);
  const end = parseCellRef(match[2]);
  return {
    start: {
      col: Math.min(start.col, end.col),
      row: Math.min(start.row, end.row),
    },
    end: {
      col: Math.max(start.col, end.col),
      row: Math.max(start.row, end.row),
    },
  };
}

/**
 * Get all cell positions within a range (inclusive).
 */
export function* iterateRange(
  start: CellPosition,
  end: CellPosition,
): Generator<CellPosition> {
  for (let row = start.row; row <= end.row; row++) {
    for (let col = start.col; col <= end.col; col++) {
      yield { col, row };
    }
  }
}

/**
 * Create a default empty cell.
 */
export function createDefaultCell(): import("../types").CellData {
  return {
    raw: "",
    computed: null,
    type: "text",
    style: {
      bold: false,
      italic: false,
      fontSize: 13,
      color: "#1f2937",
      backgroundColor: "transparent",
      textAlign: "left",
    },
  };
}

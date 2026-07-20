import type { DisplayValue, CellError } from "../types";

export type FunctionImpl = (...args: DisplayValue[]) => DisplayValue;

function toNum(v: DisplayValue): number {
  if (typeof v === "number") return v;
  if (typeof v === "string" && v !== "" && !isNaN(Number(v))) return Number(v);
  return NaN;
}

function isErr(v: DisplayValue): v is CellError {
  return typeof v === "string" && v.startsWith("#");
}

function flat(arr: DisplayValue[]): DisplayValue[] {
  const out: DisplayValue[] = [];
  for (const item of arr) {
    if (Array.isArray(item)) {
      out.push(...flat(item));
    } else {
      out.push(item);
    }
  }
  return out;
}

function nums(args: DisplayValue[]): number[] {
  return flat(args)
    .filter((v) => !isErr(v) && v !== null && v !== false && v !== true && v !== "")
    .map(toNum)
    .filter((n) => !isNaN(n));
}

// Math
export const SUM: FunctionImpl = (...args) => nums(args).reduce((a, b) => a + b, 0);
export const AVERAGE: FunctionImpl = (...args) => {
  const n = nums(args);
  return n.length === 0 ? ("#DIV/0!" as CellError) : n.reduce((a, b) => a + b, 0) / n.length;
};
export const COUNT: FunctionImpl = (...args) => nums(args).length;
export const COUNTA: FunctionImpl = (...args) => flat(args).filter((v) => v !== null && v !== "" && !isErr(v)).length;
export const MAX: FunctionImpl = (...args) => { const n = nums(args); return n.length === 0 ? 0 : Math.max(...n); };
export const MIN: FunctionImpl = (...args) => { const n = nums(args); return n.length === 0 ? 0 : Math.min(...n); };
export const ROUND: FunctionImpl = (num: DisplayValue, digits: DisplayValue = 0) => {
  const n = toNum(num);
  if (isNaN(n)) return "#VALUE!" as CellError;
  const d = typeof digits === "number" ? Math.round(digits) : 0;
  return Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
};
export const ABS: FunctionImpl = (num: DisplayValue) => {
  const n = toNum(num);
  return isNaN(n) ? ("#VALUE!" as CellError) : Math.abs(n);
};

// Logical
export const IF: FunctionImpl = (cond: DisplayValue, tv: DisplayValue = 0, fv: DisplayValue = 0) => {
  const isTrue = cond === true || (typeof cond === "number" && cond !== 0) || (typeof cond === "string" && cond !== "" && !isErr(cond));
  return isTrue ? tv : fv;
};
export const AND: FunctionImpl = (...args) => {
  for (const v of flat(args)) {
    if (v === false || v === 0 || v === "" || v === null) return false;
  }
  return true;
};
export const OR: FunctionImpl = (...args) => {
  for (const v of flat(args)) {
    if (v === true || (typeof v === "number" && v !== 0) || (typeof v === "string" && v !== "")) return true;
  }
  return false;
};
export const NOT: FunctionImpl = (v: DisplayValue) => {
  return !(v === true || (typeof v === "number" && v !== 0) || (typeof v === "string" && v !== ""));
};
export const IFERROR: FunctionImpl = (v: DisplayValue, fb: DisplayValue) => (isErr(v) ? fb : v);

// Text
export const CONCATENATE: FunctionImpl = (...args) => flat(args).filter((v) => !isErr(v)).map((v) => v === null ? "" : String(v)).join("");
export const UPPER: FunctionImpl = (v: DisplayValue) => v === null || v === undefined ? "" : String(v).toUpperCase();
export const LOWER: FunctionImpl = (v: DisplayValue) => v === null || v === undefined ? "" : String(v).toLowerCase();
export const TRIM: FunctionImpl = (v: DisplayValue) => v === null || v === undefined ? "" : String(v).trim().replace(/\s+/g, " ");
export const LEFT: FunctionImpl = (v: DisplayValue, n: DisplayValue = 1) => {
  const s = v === null ? "" : String(v);
  const c = typeof n === "number" ? n : 1;
  return s.slice(0, c);
};
export const RIGHT: FunctionImpl = (v: DisplayValue, n: DisplayValue = 1) => {
  const s = v === null ? "" : String(v);
  const c = typeof n === "number" ? n : 1;
  return s.slice(-c);
};
export const MID: FunctionImpl = (v: DisplayValue, s: DisplayValue = 1, n: DisplayValue = 0) => {
  const str = v === null ? "" : String(v);
  const st = (typeof s === "number" ? s : 1) - 1;
  const ct = typeof n === "number" ? n : 0;
  return str.slice(st, st + ct);
};
export const LEN: FunctionImpl = (v: DisplayValue) => v === null || v === undefined ? 0 : String(v).length;

// Date
export const TODAY: FunctionImpl = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const NOW: FunctionImpl = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

// Registry
export const functionRegistry: Record<string, FunctionImpl> = {
  SUM, AVERAGE, AVG: AVERAGE, COUNT, COUNTA, MAX, MIN, ROUND, ABS,
  IF, AND, OR, NOT, IFERROR,
  CONCATENATE, CONCAT: CONCATENATE, UPPER, LOWER, TRIM, LEFT, RIGHT, MID, LEN,
  TODAY, NOW,
};

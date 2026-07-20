import type { FormulaAstNode, DisplayValue, CellError } from "../types";
import { functionRegistry } from "./functions";
import { toCellKey } from "../utils/cellAddress";
import { parseFormula } from "./parser";

export type GetCellValue = (col: number, row: number) => DisplayValue;
export type GetRangeValues = (
  startCol: number,
  startRow: number,
  endCol: number,
  endRow: number,
) => DisplayValue[][];

/**
 * Evaluate a formula AST node and return the computed value.
 */
export function evaluate(
  node: FormulaAstNode,
  getCellValue: GetCellValue,
  getRangeValues: GetRangeValues,
  depth: number = 0,
): DisplayValue {
  // Guard against infinite recursion (circular references)
  if (depth > 100) return "#REF!" as CellError;

  switch (node.type) {
    case "number":
      return node.value as number;

    case "string":
      return node.value as string;

    case "boolean":
      return node.value as boolean;

    case "error":
      return (node.value as CellError) ?? "#ERROR";

    case "cellRef":
      if (node.col === undefined || node.row === undefined) return "#REF!";
      return getCellValue(node.col, node.row);

    case "rangeRef":
      if (
        node.startCol === undefined ||
        node.startRow === undefined ||
        node.endCol === undefined ||
        node.endRow === undefined
      )
        return "#REF!";
      return getRangeValues(
        node.startCol,
        node.startRow,
        node.endCol,
        node.endRow,
      ) as unknown as DisplayValue;

    case "unaryOp":
      {
        const arg = evaluate(
          node.argument!,
          getCellValue,
          getRangeValues,
          depth + 1,
        );
        if (typeof arg === "string" && (arg as string).startsWith("#"))
          return arg;

        const num = typeof arg === "number" ? arg : Number(arg);
        if (isNaN(num)) return "#VALUE!";

        if (node.operator === "-") return -num;
        return num;
      }
      break;

    case "binaryOp":
      {
        const left = evaluate(
          node.left!,
          getCellValue,
          getRangeValues,
          depth + 1,
        );
        const right = evaluate(
          node.right!,
          getCellValue,
          getRangeValues,
          depth + 1,
        );

        // Error propagation
        if (typeof left === "string" && (left as string).startsWith("#"))
          return left;
        if (typeof right === "string" && (right as string).startsWith("#"))
          return right;

        switch (node.operator) {
          case "+": {
            const l = typeof left === "number" ? left : Number(left);
            const r = typeof right === "number" ? right : Number(right);
            if (isNaN(l) || isNaN(r)) {
              // String concatenation fallback
              return String(left ?? "") + String(right ?? "");
            }
            return l + r;
          }
          case "-": {
            const l = typeof left === "number" ? left : Number(left);
            const r = typeof right === "number" ? right : Number(right);
            if (isNaN(l) || isNaN(r)) return "#VALUE!";
            return l - r;
          }
          case "*": {
            const l = typeof left === "number" ? left : Number(left);
            const r = typeof right === "number" ? right : Number(right);
            if (isNaN(l) || isNaN(r)) return "#VALUE!";
            return l * r;
          }
          case "/": {
            const l = typeof left === "number" ? left : Number(left);
            const r = typeof right === "number" ? right : Number(right);
            if (isNaN(l) || isNaN(r)) return "#VALUE!";
            if (r === 0) return "#DIV/0!";
            return l / r;
          }
          case "^": {
            const l = typeof left === "number" ? left : Number(left);
            const r = typeof right === "number" ? right : Number(right);
            if (isNaN(l) || isNaN(r)) return "#VALUE!";
            return Math.pow(l, r);
          }
          case "&":
            return String(left ?? "") + String(right ?? "");
          case "=":
            return left === right;
          case "<>":
            return left !== right;
          case "<": {
            const l = typeof left === "number" ? left : String(left ?? "");
            const r = typeof right === "number" ? right : String(right ?? "");
            return l < r;
          }
          case ">": {
            const l = typeof left === "number" ? left : String(left ?? "");
            const r = typeof right === "number" ? right : String(right ?? "");
            return l > r;
          }
          case "<=": {
            const l = typeof left === "number" ? left : String(left ?? "");
            const r = typeof right === "number" ? right : String(right ?? "");
            return l <= r;
          }
          case ">=": {
            const l = typeof left === "number" ? left : String(left ?? "");
            const r = typeof right === "number" ? right : String(right ?? "");
            return l >= r;
          }
          default:
            return "#ERROR";
        }
      }
      break;

    case "functionCall":
      {
        const fn = functionRegistry[node.functionName ?? ""];
        if (!fn) return "#NAME?";

        // Evaluate arguments
        const evaluatedArgs: DisplayValue[] = [];
        for (const arg of node.arguments ?? []) {
          const val = evaluate(
            arg,
            getCellValue,
            getRangeValues,
            depth + 1,
          );
          evaluatedArgs.push(val);
        }

        try {
          return fn.apply(null, evaluatedArgs);
        } catch {
          return "#ERROR";
        }
      }
      break;

    default:
      return "#ERROR";
  }
}

/**
 * Parse and evaluate a formula string against a sheet's cells.
 */
export function evaluateFormula(
  formula: string,
  getCellValue: GetCellValue,
  getRangeValues: GetRangeValues,
): DisplayValue {
  // Remove leading "="
  const input = formula.startsWith("=") ? formula.slice(1) : formula;

  // Parse inline (avoid circular import)
  let ast: FormulaAstNode;
  try {
    ast = parseFormula(input);
  } catch {
    return "#ERROR";
  }

  // Evaluate
  return evaluate(ast, getCellValue, getRangeValues);
}

/**
 * Collect all cell/range references from an AST (for dependency tracking).
 */
export function collectReferences(
  node: FormulaAstNode,
): { col: number; row: number }[] {
  const refs: { col: number; row: number }[] = [];

  function walk(n: FormulaAstNode) {
    if (n.type === "cellRef" && n.col !== undefined && n.row !== undefined) {
      refs.push({ col: n.col, row: n.row });
    } else if (n.type === "rangeRef") {
      if (
        n.startCol !== undefined &&
        n.startRow !== undefined &&
        n.endCol !== undefined &&
        n.endRow !== undefined
      ) {
        for (let r = n.startRow; r <= n.endRow; r++) {
          for (let c = n.startCol; c <= n.endCol; c++) {
            refs.push({ col: c, row: r });
          }
        }
      }
    }
    if (n.left) walk(n.left);
    if (n.right) walk(n.right);
    if (n.argument) walk(n.argument);
    if (n.arguments) {
      for (const arg of n.arguments) walk(arg);
    }
  }

  walk(node);
  return refs;
}

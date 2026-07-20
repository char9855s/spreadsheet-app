import type { FormulaAstNode } from "../types";
import { parseCellRef, parseRangeRef } from "../utils/cellAddress";

// ============================================================
// Tokenizer
// ============================================================

export type TokenType =
  | "NUMBER"
  | "STRING"
  | "BOOLEAN"
  | "CELL_REF"
  | "RANGE_REF"
  | "FUNC"
  | "OPERATOR"
  | "LPAREN"
  | "RPAREN"
  | "COMMA"
  | "COLON"
  | "ERROR";

export interface Token {
  type: TokenType;
  value: string;
}

/**
 * Tokenize a formula string (without the leading "=").
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < input.length) {
    // Skip whitespace
    if (input[i] === " ") {
      i++;
      continue;
    }

    // Numbers
    if (/[0-9]/.test(input[i]) || (input[i] === "." && /[0-9]/.test(input[i + 1] ?? ""))) {
      let num = "";
      while (i < input.length && /[0-9.]/.test(input[i])) {
        num += input[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: num });
      continue;
    }

    // Strings (double-quoted)
    if (input[i] === '"') {
      let str = '"';
      i++;
      while (i < input.length && input[i] !== '"') {
        str += input[i];
        i++;
      }
      str += '"';
      i++; // Skip closing quote
      tokens.push({ type: "STRING", value: str });
      continue;
    }

    // Error literals
    if (input[i] === "#") {
      let err = "";
      while (i < input.length && input[i] !== " " && input[i] !== "," && input[i] !== ")") {
        err += input[i];
        i++;
      }
      tokens.push({ type: "ERROR", value: err });
      continue;
    }

    // Operators
    if ("+-*/^&=<>".includes(input[i])) {
      // Multi-char operators: <=, >=, <>
      if (
        (input[i] === "<" || input[i] === ">") &&
        input[i + 1] === "="
      ) {
        tokens.push({ type: "OPERATOR", value: input[i] + "=" });
        i += 2;
      } else if (input[i] === "<" && input[i + 1] === ">") {
        tokens.push({ type: "OPERATOR", value: "<>" });
        i += 2;
      } else {
        tokens.push({ type: "OPERATOR", value: input[i] });
        i++;
      }
      continue;
    }

    // Parentheses and comma
    if (input[i] === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }
    if (input[i] === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }
    if (input[i] === ",") {
      tokens.push({ type: "COMMA", value: "," });
      i++;
      continue;
    }
    if (input[i] === ":") {
      tokens.push({ type: "COLON", value: ":" });
      i++;
      continue;
    }

    // Cell references, range references, and function names
    if (/[A-Za-z]/.test(input[i])) {
      let ident = "";
      while (i < input.length && /[A-Za-z0-9]/.test(input[i])) {
        ident += input[i];
        i++;
      }

      // Check if it's a function call (identifier followed by '(')
      if (i < input.length && input[i] === "(") {
        tokens.push({ type: "FUNC", value: ident.toUpperCase() });
        continue;
      }

      // Check if it's a cell reference or range reference
      if (/^[A-Z]+\d+$/.test(ident.toUpperCase())) {
        // Peek ahead: if next is ":" then it's a range start
        if (i < input.length && input[i] === ":") {
          i++; // Skip colon
          let endRef = "";
          while (i < input.length && /[A-Za-z0-9]/.test(input[i])) {
            endRef += input[i];
            i++;
          }
          tokens.push({
            type: "RANGE_REF",
            value: `${ident.toUpperCase()}:${endRef.toUpperCase()}`,
          });
        } else {
          tokens.push({ type: "CELL_REF", value: ident.toUpperCase() });
        }
        continue;
      }

      // Boolean literals
      if (ident.toUpperCase() === "TRUE") {
        tokens.push({ type: "BOOLEAN", value: "TRUE" });
        continue;
      }
      if (ident.toUpperCase() === "FALSE") {
        tokens.push({ type: "BOOLEAN", value: "FALSE" });
        continue;
      }

      // Unknown identifier - treat as potential named range or error
      tokens.push({ type: "ERROR", value: `#NAME?` });
      continue;
    }

    // Unknown character, skip
    i++;
  }

  return tokens;
}

// ============================================================
// Parser (Recursive Descent)
// ============================================================

export class FormulaParser {
  private tokens: Token[];
  private pos: number;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
    this.pos = 0;
  }

  parse(): FormulaAstNode {
    const result = this.parseComparison();
    if (this.pos < this.tokens.length) {
      // There are leftover tokens, which shouldn't happen normally
      return { type: "error", value: "#ERROR" };
    }
    return result;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: TokenType): Token {
    const token = this.consume();
    if (!token || token.type !== type) {
      throw new Error(`Expected ${type} but got ${token?.type}`);
    }
    return token;
  }

  // Comparison: =, <>, <, >, <=, >=
  private parseComparison(): FormulaAstNode {
    let left = this.parseConcat();
    while (
      this.peek()?.type === "OPERATOR" &&
      ["=", "<>", "<", ">", "<=", ">="].includes(this.peek()!.value)
    ) {
      const op = this.consume().value;
      const right = this.parseConcat();
      left = { type: "binaryOp", operator: op, left, right };
    }
    return left;
  }

  // String concatenation: &
  private parseConcat(): FormulaAstNode {
    let left = this.parseAddSub();
    while (this.peek()?.value === "&") {
      const op = this.consume().value;
      const right = this.parseAddSub();
      left = { type: "binaryOp", operator: op, left, right };
    }
    return left;
  }

  // Addition / Subtraction: +, -
  private parseAddSub(): FormulaAstNode {
    let left = this.parseMulDiv();
    while (
      this.peek()?.type === "OPERATOR" &&
      ["+", "-"].includes(this.peek()!.value)
    ) {
      const op = this.consume().value;
      const right = this.parseMulDiv();
      left = { type: "binaryOp", operator: op, left, right };
    }
    return left;
  }

  // Multiplication / Division: *, /
  private parseMulDiv(): FormulaAstNode {
    let left = this.parsePower();
    while (
      this.peek()?.type === "OPERATOR" &&
      ["*", "/"].includes(this.peek()!.value)
    ) {
      const op = this.consume().value;
      const right = this.parsePower();
      left = { type: "binaryOp", operator: op, left, right };
    }
    return left;
  }

  // Power: ^
  private parsePower(): FormulaAstNode {
    let left = this.parseUnary();
    while (this.peek()?.value === "^") {
      const op = this.consume().value;
      const right = this.parseUnary();
      left = { type: "binaryOp", operator: op, left, right };
    }
    return left;
  }

  // Unary: +, -
  private parseUnary(): FormulaAstNode {
    if (
      this.peek()?.type === "OPERATOR" &&
      ["+", "-"].includes(this.peek()!.value)
    ) {
      const op = this.consume().value;
      const arg = this.parseUnary();
      return { type: "unaryOp", operator: op, argument: arg };
    }
    return this.parsePrimary();
  }

  // Primary: literals, cell refs, range refs, function calls, parenthesized expressions
  private parsePrimary(): FormulaAstNode {
    const token = this.peek();
    if (!token) {
      return { type: "error", value: "#ERROR" };
    }

    switch (token.type) {
      case "NUMBER":
        this.consume();
        return {
          type: "number",
          value: parseFloat(token.value),
        };

      case "STRING":
        this.consume();
        return {
          type: "string",
          value: token.value.slice(1, -1), // Remove quotes
        };

      case "BOOLEAN":
        this.consume();
        return {
          type: "boolean",
          value: token.value === "TRUE",
        };

      case "CELL_REF":
        this.consume();
        try {
          const pos = parseCellRef(token.value);
          return {
            type: "cellRef",
            col: pos.col,
            row: pos.row,
            reference: token.value,
          };
        } catch {
          return { type: "error", value: "#REF!" };
        }

      case "RANGE_REF":
        this.consume();
        const range = parseRangeRef(token.value);
        if (!range) return { type: "error", value: "#REF!" };
        return {
          type: "rangeRef",
          startCol: range.start.col,
          startRow: range.start.row,
          endCol: range.end.col,
          endRow: range.end.row,
          reference: token.value,
        };

      case "ERROR":
        this.consume();
        return { type: "error", value: token.value };

      case "FUNC":
        return this.parseFunctionCall();

      case "LPAREN":
        this.consume();
        const expr = this.parseComparison();
        this.expect("RPAREN");
        return expr;

      default:
        this.consume();
        return { type: "error", value: "#ERROR" };
    }
  }

  private parseFunctionCall(): FormulaAstNode {
    const funcToken = this.consume(); // FUNC
    this.expect("LPAREN");

    const args: FormulaAstNode[] = [];

    // Handle empty arguments
    if (this.peek()?.type === "RPAREN") {
      this.consume();
      return {
        type: "functionCall",
        functionName: funcToken.value,
        arguments: args,
      };
    }

    // Parse arguments
    args.push(this.parseComparison());
    while (this.peek()?.type === "COMMA") {
      this.consume(); // Skip comma
      // Handle empty argument (two commas in a row)
      if (this.peek()?.type === "COMMA" || this.peek()?.type === "RPAREN") {
        args.push({ type: "error", value: "#VALUE!" });
      } else {
        args.push(this.parseComparison());
      }
    }

    this.expect("RPAREN");

    return {
      type: "functionCall",
      functionName: funcToken.value,
      arguments: args,
    };
  }
}

/**
 * Parse a formula string and return the AST.
 */
export function parseFormula(input: string): FormulaAstNode {
  const tokens = tokenize(input);
  const parser = new FormulaParser(tokens);
  return parser.parse();
}

// Type declarations for the xlsx library (SheetJS)
// Install: npm install xlsx
declare module "xlsx" {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: Record<string, WorkSheet>;
  }

  export interface WorkSheet {
    [key: string]: unknown;
  }

  export interface XLSXUtils {
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void;
    aoa_to_sheet(data: (string | number | null)[][], opts?: Record<string, unknown>): WorkSheet;
    sheet_to_json<T = unknown[]>(ws: WorkSheet, opts?: {
      header?: 1 | string[];
      defval?: string;
      blankrows?: boolean;
    }): T[];
  }

  export function read(data: Uint8Array | ArrayBuffer, opts: { type: string }): WorkBook;
  export function write(wb: WorkBook, opts: { bookType: string; type: string }): Uint8Array;
  export const utils: XLSXUtils;
}

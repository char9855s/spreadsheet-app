# Spreadsheet App / 电子表格应用

[English](#english) | [简体中文](#简体中文)

---

## English

A full-featured web spreadsheet application built with React, TypeScript, and Vite. Create, edit, and manage spreadsheets entirely in the browser with local storage persistence and multi-format import/export support.

### Features

- **Spreadsheet Editing** — Full cell editing with text, numbers, and formulas (20+ built-in functions)
- **Multiple Sheets** — Create, rename, and manage multiple sheets per project
- **Cell Formatting** — Bold, italic, text alignment, font size, text color, and background color
- **Row & Column Operations** — Insert and delete rows/columns, resize columns
- **Merge Cells** — Merge and unmerge cell ranges
- **Formula Engine** — Recursive-descent parser with functions: SUM, AVERAGE, IF, COUNT, MAX, MIN, CONCATENATE, and more
- **Timeline View** — Create Gantt-style timelines with events on any sheet
- **Charts** — Bar, line, pie, and area charts powered by Recharts
- **Dark Mode** — Toggle between light and dark themes
- **Local Storage** — Data persists automatically in the browser with versioned storage
- **Import & Export** — Full project import/export in JSON, CSV, and Excel (.xlsx) formats
- **No Backend Required** — Runs entirely in the browser

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| State | Zustand |
| Styling | Tailwind CSS 3 |
| Charts | Recharts |
| Icons | Lucide React |
| Storage | Browser localStorage |
| Excel | SheetJS (xlsx) — optional, for XLSX import/export |

### Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Import / Export Formats

| Format | Export | Import | Description |
|--------|--------|--------|-------------|
| **JSON** | ✅ | ✅ | Full project backup including all sheets, cells, charts, and timelines |
| **CSV** | ✅ | ✅ | Per-sheet plain text, compatible with all spreadsheet software |
| **Excel (.xlsx)** | ✅ | ✅ | Multi-sheet Excel format (requires `xlsx` dependency) |

> **Note:** JSON and CSV import/export work out of the box. For Excel support, run `npm install` to install the `xlsx` library.

### Project Structure

```
src/
├── main.tsx                 # React root mount
├── App.tsx                  # Root component, routing, auto-save
├── index.css                # Tailwind + custom styles
├── types/
│   ├── index.ts             # All TypeScript types
│   └── xlsx.d.ts            # SheetJS type declarations
├── utils/
│   ├── cellAddress.ts       # Cell reference utilities (A1 notation)
│   ├── storage.ts           # Enhanced localStorage service
│   └── io.ts                # Import/Export service
├── engine/
│   ├── parser.ts            # Formula tokenizer & parser
│   ├── evaluator.ts         # Formula AST evaluator
│   └── functions.ts         # Built-in function implementations
├── store/
│   ├── useProjectStore.ts   # Projects & sheets state
│   ├── useSpreadsheetStore.ts # Active sheet & editing state
│   └── useUIStore.ts        # UI panels, theme, dialogs
└── components/
    ├── layout/              # Notification toast
    ├── dashboard/           # Project listing, create dialog
    ├── spreadsheet/         # Grid, toolbar, formula bar, sheet tabs, dialogs
    ├── charts/              # Chart panel, renderer, config form
    └── timeline/            # Timeline panel, bar visualization, event form
```

### Built-in Formulas

`SUM` · `AVERAGE` / `AVG` · `COUNT` · `COUNTA` · `MAX` · `MIN` · `ROUND` · `ABS` · `IF` · `AND` · `OR` · `NOT` · `IFERROR` · `CONCATENATE` / `CONCAT` · `UPPER` · `LOWER` · `TRIM` · `LEFT` · `RIGHT` · `MID` · `LEN` · `TODAY` · `NOW`

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Arrow Keys | Navigate cells |
| Tab / Shift+Tab | Next / Previous cell |
| Enter | Commit edit |
| Escape | Cancel edit |
| F2 | Edit current cell |
| Ctrl+C | Copy |
| Ctrl+X | Cut |
| Ctrl+V | Paste |

---

## 简体中文

一个全功能的 Web 电子表格应用，使用 React、TypeScript 和 Vite 构建。在浏览器中创建、编辑和管理电子表格，支持本地存储持久化和多格式导入/导出。

### 功能特性

- **表格编辑** — 完整的单元格编辑，支持文本、数字和公式（20+ 内置函数）
- **多工作表** — 每个项目可创建、重命名和管理多个工作表
- **单元格格式化** — 粗体、斜体、文本对齐、字体大小、文字颜色、背景颜色
- **行列操作** — 插入和删除行/列，调整列宽
- **合并单元格** — 合并和取消合并单元格区域
- **公式引擎** — 递归下降解析器，支持函数：SUM、AVERAGE、IF、COUNT、MAX、MIN、CONCATENATE 等
- **时间轴视图** — 在任意工作表上创建甘特图式的时间轴
- **图表** — 使用 Recharts 驱动，支持柱状图、折线图、饼图和面积图
- **深色模式** — 浅色/深色主题切换
- **本地存储** — 数据通过版本化存储在浏览器中自动保存
- **导入导出** — 支持 JSON、CSV 和 Excel (.xlsx) 格式的完整项目导入/导出
- **无需后端** — 完全在浏览器中运行

### 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 状态管理 | Zustand |
| 样式 | Tailwind CSS 3 |
| 图表 | Recharts |
| 图标 | Lucide React |
| 存储 | 浏览器 localStorage |
| Excel | SheetJS (xlsx) — 可选，用于 XLSX 导入/导出 |

### 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

### 导入/导出格式

| 格式 | 导出 | 导入 | 说明 |
|------|------|------|------|
| **JSON** | ✅ | ✅ | 完整项目备份，包含所有工作表、单元格、图表和时间轴 |
| **CSV** | ✅ | ✅ | 单工作表纯文本格式，兼容所有电子表格软件 |
| **Excel (.xlsx)** | ✅ | ✅ | 多工作表 Excel 格式（需要 `xlsx` 依赖） |

> **注意：** JSON 和 CSV 导入/导出开箱即用。如需 Excel 支持，请运行 `npm install` 安装 `xlsx` 库。

### 内置公式

`SUM` · `AVERAGE` / `AVG` · `COUNT` · `COUNTA` · `MAX` · `MIN` · `ROUND` · `ABS` · `IF` · `AND` · `OR` · `NOT` · `IFERROR` · `CONCATENATE` / `CONCAT` · `UPPER` · `LOWER` · `TRIM` · `LEFT` · `RIGHT` · `MID` · `LEN` · `TODAY` · `NOW`

### 快捷键

| 按键 | 操作 |
|------|------|
| 方向键 | 导航单元格 |
| Tab / Shift+Tab | 下一个 / 上一个单元格 |
| Enter | 确认编辑 |
| Escape | 取消编辑 |
| F2 | 编辑当前单元格 |
| Ctrl+C | 复制 |
| Ctrl+X | 剪切 |
| Ctrl+V | 粘贴 |

---

## License

MIT

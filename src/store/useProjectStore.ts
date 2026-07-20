import { create } from "zustand";
import type { Project, Sheet, CellData } from "../types";
import { saveData, loadData } from "../utils/storage";

interface ProjectState {
  projects: Project[];
  activeProjectId: string | null;

  // Project CRUD
  createProject: (name: string) => string;
  deleteProject: (id: string) => void;
  renameProject: (id: string, name: string) => void;
  setActiveProject: (id: string | null) => void;
  getActiveProject: () => Project | undefined;

  // Sheet management
  addSheet: (projectId: string, name?: string) => string;
  removeSheet: (projectId: string, sheetId: string) => void;
  renameSheet: (projectId: string, sheetId: string, name: string) => void;
  getActiveSheet: () => Sheet | undefined;

  // Import actions
  importProject: (project: Project) => void;
  replaceAllData: (projects: Project[], activeProjectId: string | null) => void;
  importSheetToProject: (
    projectId: string,
    sheetId: string,
    data: { cells: Record<string, CellData>; maxCol: number; maxRow: number },
  ) => void;
  addSheetToProject: (projectId: string, sheet: Sheet) => void;

  // Persistence
  saveToStorage: () => void;
  loadFromStorage: () => void;
}

function createDefaultSheet(name: string): Sheet {
  return {
    id: crypto.randomUUID(),
    name,
    cells: {},
    columnCount: 26,
    rowCount: 100,
    columnWidths: {},
    rowHeights: {},
    timeline: null,
    mergedCells: [],
  };
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,

  createProject: (name: string) => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const defaultSheet = createDefaultSheet("Sheet1");
    const project: Project = {
      id,
      name,
      sheets: [defaultSheet],
      charts: [],
      createdAt: now,
      updatedAt: now,
    };
    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: id,
    }));
    return id;
  },

  deleteProject: (id: string) => {
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      activeProjectId:
        state.activeProjectId === id ? null : state.activeProjectId,
    }));
  },

  renameProject: (id: string, name: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p,
      ),
    }));
  },

  setActiveProject: (id: string | null) => {
    set({ activeProjectId: id });
  },

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId);
  },

  addSheet: (projectId: string, name?: string) => {
    const sheetNum =
      get().projects.find((p) => p.id === projectId)?.sheets.length ?? 0;
    const sheet = createDefaultSheet(name ?? `Sheet${sheetNum + 1}`);
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? { ...p, sheets: [...p.sheets, sheet], updatedAt: new Date().toISOString() }
          : p,
      ),
    }));
    return sheet.id;
  },

  removeSheet: (projectId: string, sheetId: string) => {
    set((state) => ({
      projects: state.projects.map((p) => {
        if (p.id !== projectId) return p;
        if (p.sheets.length <= 1) return p; // Keep at least one sheet
        return {
          ...p,
          sheets: p.sheets.filter((s) => s.id !== sheetId),
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  },

  renameSheet: (projectId: string, sheetId: string, name: string) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId ? { ...s, name } : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  getActiveSheet: () => {
    const project = get().getActiveProject();
    if (!project) return undefined;
    // Return first sheet by default
    return project.sheets[0];
  },

  importProject: (project: Project) => {
    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: project.id,
    }));
  },

  replaceAllData: (projects: Project[], activeProjectId: string | null) => {
    set({ projects, activeProjectId });
  },

  importSheetToProject: (
    projectId: string,
    sheetId: string,
    data: { cells: Record<string, CellData>; maxCol: number; maxRow: number },
  ) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: p.sheets.map((s) =>
                s.id === sheetId
                  ? {
                      ...s,
                      cells: data.cells,
                      columnCount: Math.max(s.columnCount, data.maxCol + 1),
                      rowCount: Math.max(s.rowCount, data.maxRow + 1),
                    }
                  : s,
              ),
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  addSheetToProject: (projectId: string, sheet: Sheet) => {
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === projectId
          ? {
              ...p,
              sheets: [...p.sheets, sheet],
              updatedAt: new Date().toISOString(),
            }
          : p,
      ),
    }));
  },

  saveToStorage: () => {
    const { projects, activeProjectId } = get();
    saveData(projects, activeProjectId);
  },

  loadFromStorage: () => {
    const data = loadData();
    if (data) {
      set({
        projects: data.projects,
        activeProjectId: data.activeProjectId,
      });
    }
  },
}));

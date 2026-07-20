import { create } from "zustand";

type PanelType = "none" | "timeline" | "chart";
type ThemeMode = "light" | "dark";

const savedTheme = (typeof window !== "undefined"
  ? localStorage.getItem("spreadsheet-theme")
  : null) as ThemeMode | null;

interface UIState {
  activePanel: PanelType;
  chartConfigId: string | null;
  showCreateProjectDialog: boolean;
  showTimelineSettings: boolean;
  showExportDialog: boolean;
  showImportDialog: boolean;
  notification: { message: string; type: "info" | "error" | "success" } | null;
  theme: ThemeMode;

  setActivePanel: (panel: PanelType) => void;
  setChartConfigId: (id: string | null) => void;
  setShowCreateProjectDialog: (show: boolean) => void;
  setShowTimelineSettings: (show: boolean) => void;
  setShowExportDialog: (show: boolean) => void;
  setShowImportDialog: (show: boolean) => void;
  showNotification: (
    message: string,
    type: "info" | "error" | "success",
  ) => void;
  clearNotification: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activePanel: "none",
  chartConfigId: null,
  showCreateProjectDialog: false,
  showTimelineSettings: false,
  showExportDialog: false,
  showImportDialog: false,
  notification: null,
  theme: savedTheme === "dark" ? "dark" : "light",

  setActivePanel: (panel) =>
    set((state) => ({
      activePanel: state.activePanel === panel ? "none" : panel,
    })),

  setChartConfigId: (id) => set({ chartConfigId: id }),

  setShowCreateProjectDialog: (show) =>
    set({ showCreateProjectDialog: show }),

  setShowTimelineSettings: (show) =>
    set({ showTimelineSettings: show }),

  setShowExportDialog: (show) =>
    set({ showExportDialog: show }),

  setShowImportDialog: (show) =>
    set({ showImportDialog: show }),

  showNotification: (message, type) => {
    set({ notification: { message, type } });
    setTimeout(() => {
      set({ notification: null });
    }, 3000);
  },

  clearNotification: () => set({ notification: null }),

  toggleTheme: () =>
    set((state) => {
      const next = state.theme === "light" ? "dark" : "light";
      localStorage.setItem("spreadsheet-theme", next);
      if (next === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
      return { theme: next };
    }),
}));

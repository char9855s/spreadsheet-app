import { useProjectStore } from "../../store/useProjectStore";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { Plus } from "lucide-react";
import { useState } from "react";

export function SheetTabs() {
  const project = useProjectStore((s) => s.getActiveProject());
  const addSheet = useProjectStore((s) => s.addSheet);
  const removeSheet = useProjectStore((s) => s.removeSheet);
  const renameSheet = useProjectStore((s) => s.renameSheet);
  const activeSheetId = useSpreadsheetStore((s) => s.activeSheetId);
  const setActiveSheet = useSpreadsheetStore((s) => s.setActiveSheet);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  if (!project) return null;

  const handleAdd = () => {
    const id = addSheet(project.id);
    setActiveSheet(id);
  };

  const handleRename = (sheetId: string) => {
    if (renameValue.trim()) {
      renameSheet(project.id, sheetId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleRemove = (sheetId: string) => {
    if (project.sheets.length <= 1) return;
    removeSheet(project.id, sheetId);
    // Switch to another sheet
    const remaining = project.sheets.find((s) => s.id !== sheetId);
    if (remaining) {
      setActiveSheet(remaining.id);
    }
  };

  return (
    <div className="flex items-center bg-gray-50 border-t border-gray-200 px-2 py-0 shrink-0 dark:bg-gray-900 dark:border-gray-700">
      <div className="flex items-center gap-0.5 overflow-x-auto">
        {project.sheets.map((sheet) => {
          const isActive = activeSheetId === sheet.id;
          return (
            <div
              key={sheet.id}
              onClick={() => setActiveSheet(sheet.id)}
              onDoubleClick={() => {
                setRenamingId(sheet.id);
                setRenameValue(sheet.name);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (project.sheets.length > 1) {
                  handleRemove(sheet.id);
                }
              }}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs cursor-pointer rounded-t transition-colors shrink-0 ${
                isActive
                  ? "bg-white text-gray-800 border-t border-l border-r border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800"
              }`}
            >
              {renamingId === sheet.id ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleRename(sheet.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRename(sheet.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 px-1 py-0 text-xs border border-blue-300 rounded outline-none focus:border-blue-500 dark:bg-gray-700 dark:text-gray-200"
                />
              ) : (
                sheet.name
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleAdd}
        className="p-1 ml-1 hover:bg-gray-200 rounded transition-colors text-gray-400 hover:text-gray-600 dark:hover:bg-gray-700 dark:text-gray-500 dark:hover:text-gray-300"
        title="添加工作表"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

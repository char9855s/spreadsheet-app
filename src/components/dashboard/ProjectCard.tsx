import type { Project } from "../../types";
import { useProjectStore } from "../../store/useProjectStore";
import { FileSpreadsheet, Trash2, MoreHorizontal } from "lucide-react";
import { useState } from "react";

interface Props {
  project: Project;
  onOpen: () => void;
}

export function ProjectCard({ project, onOpen }: Props) {
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [name, setName] = useState(project.name);

  const sheetCount = project.sheets.length;
  const chartCount = project.charts.length;
  const updated = new Date(project.updatedAt).toLocaleDateString("zh-CN");

  const handleRename = () => {
    if (name.trim() && name !== project.name) {
      renameProject(project.id, name.trim());
    }
    setIsRenaming(false);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm(`确定要删除项目"${project.name}"吗？此操作不可撤销。`)) {
      deleteProject(project.id);
    }
    setShowMenu(false);
  };

  return (
    <div
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-5 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all cursor-pointer group relative"
      onClick={onOpen}
    >
      {/* Menu button */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          <MoreHorizontal size={16} className="text-gray-400 dark:text-gray-500" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-md py-1 w-32 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsRenaming(true);
                setShowMenu(false);
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              重命名
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              删除
            </button>
          </div>
        )}
      </div>

      {/* Icon */}
      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
        <FileSpreadsheet size={20} className="text-blue-500" />
      </div>

      {/* Name */}
      {isRenaming ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") setIsRenaming(false);
          }}
          onClick={(e) => e.stopPropagation()}
          className="text-sm font-medium text-gray-800 dark:text-gray-100 dark:bg-gray-700 border border-blue-300 rounded px-1 py-0.5 w-full outline-none focus:border-blue-500"
        />
      ) : (
        <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 mb-1 truncate">
          {project.name}
        </h3>
      )}

      {/* Meta */}
      <div className="text-xs text-gray-400 dark:text-gray-500 space-y-0.5">
        <p>{sheetCount} 个工作表</p>
        {chartCount > 0 && <p>{chartCount} 个图表</p>}
        <p>更新于 {updated}</p>
      </div>
    </div>
  );
}

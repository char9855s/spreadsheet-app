import { useProjectStore } from "../../store/useProjectStore";
import { useUIStore } from "../../store/useUIStore";
import { ProjectCard } from "./ProjectCard";
import { CreateProjectDialog } from "./CreateProjectDialog";
import { FileSpreadsheet, Plus, Download, Upload } from "lucide-react";

export function Dashboard() {
  const projects = useProjectStore((s) => s.projects);
  const createProject = useProjectStore((s) => s.createProject);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const showDialog = useUIStore((s) => s.showCreateProjectDialog);
  const setShowDialog = useUIStore((s) => s.setShowCreateProjectDialog);
  const setShowImportDialog = useUIStore((s) => s.setShowImportDialog);
  const setShowExportDialog = useUIStore((s) => s.setShowExportDialog);

  const handleCreate = (name: string) => {
    const id = createProject(name);
    setActiveProject(id);
    setShowDialog(false);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-5">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={28} className="text-blue-500" />
            <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              Spreadsheet
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="导入数据"
            >
              <Download size={15} />
              导入
            </button>
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="导出数据"
            >
              <Upload size={15} />
              导出
            </button>
            <button
              onClick={() => setShowDialog(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus size={16} />
              新建项目
            </button>
          </div>
        </div>
      </header>

      {/* Project Grid */}
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-5xl mx-auto">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400 dark:text-gray-500">
              <FileSpreadsheet size={48} className="mb-4 opacity-30" />
              <p className="text-lg mb-2">暂无项目</p>
              <p className="text-sm">点击"新建项目"开始创建你的第一个电子表格</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={() => setActiveProject(project.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {showDialog && (
        <CreateProjectDialog
          onConfirm={handleCreate}
          onCancel={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}

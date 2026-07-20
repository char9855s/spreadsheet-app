import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

export function CreateProjectDialog({ onConfirm, onCancel }: Props) {
  const [name, setName] = useState("");

  const handleSubmit = () => {
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-96 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">新建项目</h2>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <X size={18} className="text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1.5">项目名称</label>
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
            if (e.key === "Escape") onCancel();
          }}
          placeholder="输入项目名称..."
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 dark:bg-gray-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition-all"
        />

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  );
}

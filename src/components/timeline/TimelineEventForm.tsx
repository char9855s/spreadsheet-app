import { useState, useEffect } from "react";
import type { TimelineEvent } from "../../types";
import { X, ArrowRightToLine } from "lucide-react";

interface Props {
  timelineStart: string;
  timelineEnd: string;
  colors: string[];
  editingEvent?: TimelineEvent | null;
  onSubmit: (event: Omit<TimelineEvent, "id">) => void;
  onCancel: () => void;
}

export function TimelineEventForm({
  timelineStart,
  timelineEnd,
  colors,
  editingEvent,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(editingEvent?.name ?? "");
  const [type, setType] = useState<"point" | "range">(editingEvent?.type ?? "range");
  const [startDate, setStartDate] = useState(editingEvent?.startDate ?? timelineStart);
  const [endDate, setEndDate] = useState(editingEvent?.endDate ?? timelineStart);
  const [color, setColor] = useState(editingEvent?.color ?? colors[0]);
  const [description, setDescription] = useState(editingEvent?.description ?? "");

  const isEditing = !!editingEvent;

  // Reset form when editingEvent changes
  useEffect(() => {
    if (editingEvent) {
      setName(editingEvent.name);
      setType(editingEvent.type);
      setStartDate(editingEvent.startDate);
      setEndDate(editingEvent.endDate);
      setColor(editingEvent.color);
      setDescription(editingEvent.description);
    }
  }, [editingEvent]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      startDate,
      endDate: type === "point" ? startDate : endDate,
      color,
      type,
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-96 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">
            {isEditing ? "编辑时间轴事件" : "添加时间轴事件"}
          </h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X size={18} className="text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">事件名称</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：需求分析"
              className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">类型</label>
            <div className="flex gap-2">
              <button
                onClick={() => setType("point")}
                className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                  type === "point"
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                时间点
              </button>
              <button
                onClick={() => setType("range")}
                className={`flex-1 px-3 py-1.5 text-xs rounded border transition-colors ${
                  type === "range"
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
              >
                时间区间
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                {type === "point" ? "日期" : "开始日期"}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
              />
            </div>
            {type === "range" && (
              <div className="flex-1">
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">结束日期</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="flex-1 px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={() => setEndDate(timelineEnd)}
                    className="px-1.5 py-1.5 border border-gray-200 dark:border-gray-600 rounded text-blue-400 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    title="设为时间轴结束日期"
                  >
                    <ArrowRightToLine size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">颜色</label>
            <div className="flex gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    color === c ? "border-gray-600 dark:border-gray-300 scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">描述（可选）</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="简要描述..."
              className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
            />
          </div>
        </div>

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
            {isEditing ? "保存" : "添加"}
          </button>
        </div>
      </div>
    </div>
  );
}

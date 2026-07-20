import { useState, useMemo } from "react";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useUIStore } from "../../store/useUIStore";
import { TimelineBar } from "./TimelineBar";
import { TimelineEventForm } from "./TimelineEventForm";
import type { TimelineConfig, TimelineEvent } from "../../types";
import { Settings, Plus, X, ArrowLeftRight, ArrowUpDown, Pencil } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

const EVENT_COLORS = ["#93c5fd", "#86efac", "#fde68a", "#fca5a5", "#c4b5fd", "#a5f3fc"];

type TimelineOrientation = "horizontal" | "vertical";

export function TimelinePanel() {
  const project = useProjectStore((s) => s.getActiveProject());
  const activeSheetId = useSpreadsheetStore((s) => s.activeSheetId);
  const getSheet = useSpreadsheetStore((s) => s.getSheet);
  const setTimeline = useSpreadsheetStore((s) => s.setTimeline);
  const addTimelineEvent = useSpreadsheetStore((s) => s.addTimelineEvent);
  const updateTimelineEvent = useSpreadsheetStore((s) => s.updateTimelineEvent);
  const removeTimelineEvent = useSpreadsheetStore((s) => s.removeTimelineEvent);
  const setActivePanel = useUIStore((s) => s.setActivePanel);

  const [showSettings, setShowSettings] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [startDate, setStartDate] = useState("2026-01-01");
  const [endDate, setEndDate] = useState("2026-12-31");
  const [orientation, setOrientation] = useState<TimelineOrientation>("horizontal");
  const [editingEvent, setEditingEvent] = useState<TimelineEvent | null>(null);

  const sheet = getSheet();
  if (!sheet || !project) return null;

  const timeline = sheet.timeline;

  const totalDays = useMemo(() => {
    if (!timeline) return 0;
    return differenceInDays(parseISO(timeline.endDate), parseISO(timeline.startDate));
  }, [timeline]);

  const handleCreateTimeline = () => {
    if (!activeSheetId) return;
    const config: TimelineConfig = {
      startDate,
      endDate,
      headerRowIndex: 0,
      events: [],
    };
    setTimeline(activeSheetId, config);
    setShowSettings(false);
  };

  const handleAddEvent = (event: Omit<TimelineEvent, "id">) => {
    if (!activeSheetId) return;
    const newEvent: TimelineEvent = {
      ...event,
      id: crypto.randomUUID(),
    };
    addTimelineEvent(activeSheetId, newEvent);
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleUpdateEvent = (event: Omit<TimelineEvent, "id">) => {
    if (!activeSheetId || !editingEvent) return;
    updateTimelineEvent(activeSheetId, editingEvent.id, event);
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleRemoveTimeline = () => {
    if (!activeSheetId) return;
    setTimeline(activeSheetId, null);
  };

  const openEditForm = (event: TimelineEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const openAddForm = () => {
    setEditingEvent(null);
    setShowEventForm(true);
  };

  const closeForm = () => {
    setShowEventForm(false);
    setEditingEvent(null);
  };

  // No timeline yet - show config
  if (!timeline) {
    return (
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
            >
              <Settings size={14} />
              配置时间轴
            </button>
          </div>
          <button
            onClick={() => setActivePanel("none")}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 dark:text-gray-500"
          >
            <X size={14} />
          </button>
        </div>

        {showSettings && (
          <div className="mt-3 flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">方向</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setOrientation("horizontal")}
                  className={`p-1.5 rounded border transition-colors ${
                    orientation === "horizontal"
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  title="横向时间轴"
                >
                  <ArrowLeftRight size={14} />
                </button>
                <button
                  onClick={() => setOrientation("vertical")}
                  className={`p-1.5 rounded border transition-colors ${
                    orientation === "vertical"
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                  title="纵向时间轴"
                >
                  <ArrowUpDown size={14} />
                </button>
              </div>
            </div>
            <button
              onClick={handleCreateTimeline}
              className="px-3 py-1.5 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            >
              创建时间轴
            </button>
          </div>
        )}
      </div>
    );
  }

  // Timeline exists - show events
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {timeline.startDate} — {timeline.endDate} · {totalDays}天
          </span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {timeline.events.length} 个事件
          </span>
          {/* Orientation toggle */}
          <div className="flex gap-0.5 border-l border-gray-200 dark:border-gray-600 pl-2">
            <button
              onClick={() => setOrientation("horizontal")}
              className={`p-1 rounded transition-colors ${
                orientation === "horizontal"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="横向"
            >
              <ArrowLeftRight size={13} />
            </button>
            <button
              onClick={() => setOrientation("vertical")}
              className={`p-1 rounded transition-colors ${
                orientation === "vertical"
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400"
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
              title="纵向"
            >
              <ArrowUpDown size={13} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={openAddForm}
            className="flex items-center gap-1 px-2 py-1 text-xs text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
          >
            <Plus size={12} />
            添加事件
          </button>
          <button
            onClick={handleRemoveTimeline}
            className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          >
            删除时间轴
          </button>
          <button
            onClick={() => setActivePanel("none")}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-gray-400 dark:text-gray-500"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Timeline bar visualization */}
      <TimelineBar
        timeline={timeline}
        orientation={orientation}
        onRemoveEvent={(eventId) => {
          if (activeSheetId) removeTimelineEvent(activeSheetId, eventId);
        }}
        onEditEvent={openEditForm}
      />

      {/* Event list */}
      {timeline.events.length > 0 && (
        <div className="px-4 py-2 space-y-1">
          {timeline.events.map((event) => {
            const dur = differenceInDays(parseISO(event.endDate), parseISO(event.startDate));
            return (
              <div
                key={event.id}
                className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 group"
              >
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: event.color }}
                />
                <span className="font-medium">{event.name}</span>
                <span className="text-gray-400 dark:text-gray-500">
                  {event.type === "point"
                    ? event.startDate
                    : `${event.startDate} → ${event.endDate}`}
                  {event.type === "range" && ` · ${dur}天`}
                </span>
                {event.description && (
                  <span className="text-gray-300 dark:text-gray-600 truncate max-w-32">
                    — {event.description}
                  </span>
                )}
                <button
                  onClick={() => openEditForm(event)}
                  className="ml-auto text-gray-300 dark:text-gray-600 hover:text-blue-400 dark:hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="编辑事件"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => {
                    if (activeSheetId) removeTimelineEvent(activeSheetId, event.id);
                  }}
                  className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除事件"
                >
                  <X size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Event form dialog */}
      {showEventForm && (
        <TimelineEventForm
          timelineStart={timeline.startDate}
          timelineEnd={timeline.endDate}
          colors={EVENT_COLORS}
          editingEvent={editingEvent}
          onSubmit={editingEvent ? handleUpdateEvent : handleAddEvent}
          onCancel={closeForm}
        />
      )}
    </div>
  );
}

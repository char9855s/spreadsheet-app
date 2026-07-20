import { useUIStore } from "../../store/useUIStore";
import { X } from "lucide-react";

export function Notification() {
  const notification = useUIStore((s) => s.notification);
  const clearNotification = useUIStore((s) => s.clearNotification);

  if (!notification) return null;

  const colors = {
    info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300",
    error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/40 dark:border-emerald-700 dark:text-emerald-300",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-sm ${colors[notification.type]}`}
      >
        <span className="text-sm">{notification.message}</span>
        <button
          onClick={clearNotification}
          className="opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

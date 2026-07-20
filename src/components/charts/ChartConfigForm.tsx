import { useState } from "react";
import type { ChartConfig, ChartType } from "../../types";
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  X,
} from "lucide-react";

interface Props {
  sheetId: string;
  onSubmit: (config: Omit<ChartConfig, "id">) => void;
  onCancel: () => void;
}

const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode }[] = [
  { type: "bar", label: "柱状图", icon: <BarChart3 size={20} /> },
  { type: "line", label: "折线图", icon: <LineChart size={20} /> },
  { type: "pie", label: "饼图", icon: <PieChart size={20} /> },
  { type: "area", label: "面积图", icon: <AreaChart size={20} /> },
];

export function ChartConfigForm({ sheetId, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [catColStart, setCatColStart] = useState(0);
  const [catColEnd, setCatColEnd] = useState(0);
  const [catRowStart, setCatRowStart] = useState(0);
  const [catRowEnd, setCatRowEnd] = useState(0);
  const [dataSeries, setDataSeries] = useState([
    { label: "系列1", colStart: 1, colEnd: 1, rowStart: 0, rowEnd: 9 },
  ]);

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({
      type: chartType,
      title: title.trim(),
      sheetId,
      categoryRange: {
        colStart: catColStart,
        colEnd: catColEnd,
        rowStart: catRowStart,
        rowEnd: catRowEnd,
      },
      dataRanges: dataSeries.map((s) => ({
        label: s.label,
        colStart: s.colStart,
        colEnd: s.colEnd,
        rowStart: s.rowStart,
        rowEnd: s.rowEnd,
      })),
    });
  };

  const addSeries = () => {
    setDataSeries([
      ...dataSeries,
      { label: `系列${dataSeries.length + 1}`, colStart: 0, colEnd: 0, rowStart: 0, rowEnd: 9 },
    ]);
  };

  const updateSeries = (index: number, field: string, value: string | number) => {
    setDataSeries(
      dataSeries.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    );
  };

  const removeSeries = (index: number) => {
    if (dataSeries.length <= 1) return;
    setDataSeries(dataSeries.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black/20 dark:bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-[500px] max-h-[80vh] overflow-auto p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">创建统计图</h3>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X size={18} className="text-gray-400 dark:text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">图表标题</label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入图表标题..."
              className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm outline-none focus:border-blue-400"
            />
          </div>

          {/* Chart Type */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">图表类型</label>
            <div className="grid grid-cols-4 gap-2">
              {CHART_TYPES.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => setChartType(type)}
                  className={`flex flex-col items-center gap-1 py-3 px-2 rounded-lg border transition-all ${
                    chartType === type
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  {icon}
                  <span className="text-xs">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Category range */}
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
              分类标签范围（列: 0=A, 1=B... / 行: 0=第1行）
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">列范围</span>
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    min={0}
                    value={catColStart}
                    onChange={(e) => setCatColStart(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                  />
                  <span className="text-gray-400 dark:text-gray-500">-</span>
                  <input
                    type="number"
                    min={0}
                    value={catColEnd}
                    onChange={(e) => setCatColEnd(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                  />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">行范围</span>
                <div className="flex gap-1 items-center">
                  <input
                    type="number"
                    min={0}
                    value={catRowStart}
                    onChange={(e) => setCatRowStart(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                  />
                  <span className="text-gray-400 dark:text-gray-500">-</span>
                  <input
                    type="number"
                    min={0}
                    value={catRowEnd}
                    onChange={(e) => setCatRowEnd(Number(e.target.value))}
                    className="w-16 px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Data series */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">数据系列</label>
              <button
                onClick={addSeries}
                className="text-xs text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300"
              >
                + 添加系列
              </button>
            </div>
            <div className="space-y-2">
              {dataSeries.map((series, index) => (
                <div
                  key={index}
                  className="flex items-end gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex-1">
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">名称</span>
                    <input
                      value={series.label}
                      onChange={(e) =>
                        updateSeries(index, "label", e.target.value)
                      }
                      className="w-full px-2 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">列范围</span>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        min={0}
                        value={series.colStart}
                        onChange={(e) =>
                          updateSeries(index, "colStart", Number(e.target.value))
                        }
                        className="w-14 px-1 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        min={0}
                        value={series.colEnd}
                        onChange={(e) =>
                          updateSeries(index, "colEnd", Number(e.target.value))
                        }
                        className="w-14 px-1 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">行范围</span>
                    <div className="flex gap-1 items-center">
                      <input
                        type="number"
                        min={0}
                        value={series.rowStart}
                        onChange={(e) =>
                          updateSeries(index, "rowStart", Number(e.target.value))
                        }
                        className="w-14 px-1 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        min={0}
                        value={series.rowEnd}
                        onChange={(e) =>
                          updateSeries(index, "rowEnd", Number(e.target.value))
                        }
                        className="w-14 px-1 py-1 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded text-sm"
                      />
                    </div>
                  </div>
                  {dataSeries.length > 1 && (
                    <button
                      onClick={() => removeSeries(index)}
                      className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
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
            disabled={!title.trim()}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            创建图表
          </button>
        </div>
      </div>
    </div>
  );
}

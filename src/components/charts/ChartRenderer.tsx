import { useMemo } from "react";
import { useSpreadsheetStore } from "../../store/useSpreadsheetStore";
import { useProjectStore } from "../../store/useProjectStore";
import { useUIStore } from "../../store/useUIStore";
import type { ChartConfig } from "../../types";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from "recharts";

interface Props {
  config: ChartConfig;
  colors: string[];
}

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

export function ChartRenderer({ config, colors }: Props) {
  const getSheet = useSpreadsheetStore((s) => s.getSheet);
  const getCell = useSpreadsheetStore((s) => s.getCell);
  const isDark = useUIStore((s) => s.theme) === "dark";

  const data = useMemo(() => {
    const sheet = getSheet();
    if (!sheet) return [];

    const { categoryRange, dataRanges } = config;

    // Extract category labels from categoryRange
    const categoryLabels: string[] = [];
    for (let r = categoryRange.rowStart; r <= categoryRange.rowEnd; r++) {
      for (let c = categoryRange.colStart; c <= categoryRange.colEnd; c++) {
        const cell = getCell(c, r);
        const val = cell?.raw ?? "";
        categoryLabels.push(val || `${String.fromCharCode(65 + c)}${r + 1}`);
      }
    }

    // Find the max row count across all ranges
    let maxRows = 0;
    for (const range of dataRanges) {
      const rows = range.rowEnd - range.rowStart + 1;
      if (rows > maxRows) maxRows = rows;
    }

    // Build data points
    const points: DataPoint[] = [];
    for (let i = 0; i < maxRows; i++) {
      const point: DataPoint = {
        name: categoryLabels[i] ?? `行${i + 1}`,
      };
      for (const range of dataRanges) {
        const row = range.rowStart + i;
        let val = 0;
        if (row <= range.rowEnd) {
          for (let c = range.colStart; c <= range.colEnd; c++) {
            const cell = getCell(c, row);
            if (cell) {
              const num = Number(cell.raw);
              if (!isNaN(num)) val += num;
            }
          }
        }
        point[range.label] = val;
      }
      points.push(point);
    }

    return points;
  }, [config, getSheet, getCell]);

  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500">
        无数据或数据范围无效
      </div>
    );
  }

  const seriesNames = config.dataRanges.map((r) => r.label);
  const gridStroke = isDark ? "#374151" : "#f3f4f6";
  const tickFill = isDark ? "#9ca3af" : "#9ca3af";
  const tooltipBg = isDark ? "#1f2937" : "#ffffff";
  const tooltipBorder = isDark ? "#374151" : "#e5e7eb";

  const renderChart = () => {
    switch (config.type) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickFill }} />
            <YAxis tick={{ fontSize: 11, fill: tickFill }} />
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {seriesNames.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                fill={colors[i % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickFill }} />
            <YAxis tick={{ fontSize: 11, fill: tickFill }} />
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {seriesNames.map((name, i) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={colors[i % colors.length]}
                strokeWidth={2}
                dot={{ r: 3, fill: colors[i % colors.length] }}
              />
            ))}
          </LineChart>
        );

      case "pie":
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={seriesNames[0] ?? "value"}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: isDark ? "#6b7280" : "#d1d5db" }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        );

      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: tickFill }} />
            <YAxis tick={{ fontSize: 11, fill: tickFill }} />
            <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {seriesNames.map((name, i) => (
              <Area
                key={name}
                type="monotone"
                dataKey={name}
                fill={colors[i % colors.length]}
                stroke={colors[i % colors.length]}
                fillOpacity={0.2}
              />
            ))}
          </AreaChart>
        );

      default:
        return <div />;
    }
  };

  return (
    <div style={{ width: "100%", height: 280 }}>
      <ResponsiveContainer>{renderChart()}</ResponsiveContainer>
    </div>
  );
}

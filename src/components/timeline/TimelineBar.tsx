import { useMemo } from "react";
import type { TimelineConfig, TimelineEvent } from "../../types";
import { differenceInDays, parseISO } from "date-fns";

interface Props {
  timeline: TimelineConfig;
  orientation: "horizontal" | "vertical";
  onRemoveEvent: (eventId: string) => void;
  onEditEvent?: (event: TimelineEvent) => void;
}

const LANE_HEIGHT = 20;

export function TimelineBar({ timeline, orientation, onRemoveEvent, onEditEvent }: Props) {
  const startDate = parseISO(timeline.startDate);
  const endDate = parseISO(timeline.endDate);
  const totalDays = differenceInDays(endDate, startDate);

  if (totalDays <= 0) {
    return (
      <div className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
        时间范围无效，请检查开始和结束日期
      </div>
    );
  }

  // Generate month markers
  const monthMarkers: { label: string; position: number }[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const offset = differenceInDays(current, startDate);
    const pct = (offset / totalDays) * 100;
    monthMarkers.push({
      label: `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`,
      position: pct,
    });
    current.setMonth(current.getMonth() + 1);
  }

  // Today marker
  const today = new Date();
  const hasToday = today >= startDate && today <= endDate;
  const todayPct = hasToday ? (differenceInDays(today, startDate) / totalDays) * 100 : 0;

  // ---- Compute lanes for overlapping range events ----
  const { eventLanes, numLanes } = useMemo(() => {
    const sorted = [...timeline.events]
      .map((e) => ({
        ...e,
        startOff: differenceInDays(parseISO(e.startDate), startDate),
        endOff: differenceInDays(parseISO(e.endDate), startDate),
      }))
      .sort((a, b) => a.startOff - b.startOff);

    const lanes: number[] = [];
    const el: Record<string, number> = {};

    for (const evt of sorted) {
      if (evt.type === "point") {
        el[evt.id] = 0;
        continue;
      }
      let lane = 0;
      while (lane < lanes.length && lanes[lane] > evt.startOff) {
        lane++;
      }
      lanes[lane] = Math.max(evt.endOff, evt.startOff + 1);
      el[evt.id] = lane;
    }
    return { eventLanes: el, numLanes: Math.max(1, lanes.length) };
  }, [timeline.events, startDate]);

  // ---- VERTICAL LAYOUT ----
  if (orientation === "vertical") {
    const trackWidth = Math.max(220, 60 + numLanes * 80);
    return (
      <div className="px-4 py-3">
        <div
          className="relative bg-gray-50 dark:bg-gray-800/50 rounded-lg"
          style={{ width: "100%", maxWidth: trackWidth + 80, height: 400 }}
        >
          {/* Month label column */}
          <div className="absolute left-0 top-0 bottom-0 w-16">
            {monthMarkers.map((m, i) => (
              <div
                key={i}
                className="absolute right-2 text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap"
                style={{ top: `${m.position}%`, transform: "translateY(-50%)" }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="absolute left-16 right-0 top-0 bottom-0 border-l border-gray-300 dark:border-gray-600">
            {monthMarkers.map((m, i) => {
              if (i % 2 === 1) return null;
              const nextPos = monthMarkers[i + 1]?.position ?? 100;
              return (
                <div
                  key={`bg-${i}`}
                  className="absolute left-0 right-0"
                  style={{ top: `${m.position}%`, height: `${nextPos - m.position}%`, backgroundColor: "rgba(0,0,0,0.02)" }}
                />
              );
            })}
            {monthMarkers.map((m, i) => (
              <div
                key={`g-${i}`}
                className="absolute left-0 right-0 border-t border-gray-200 dark:border-gray-700"
                style={{ top: `${m.position}%` }}
              />
            ))}

            {/* Events */}
            {timeline.events.map((event) => {
              const evStart = parseISO(event.startDate);
              const evEnd = parseISO(event.endDate);
              const startOff = differenceInDays(evStart, startDate);
              const dur = differenceInDays(evEnd, evStart);
              const top = Math.max(0, (startOff / totalDays) * 100);
              const h = event.type === "point" ? 1 : Math.max(1.5, (dur / totalDays) * 100);
              const lane = eventLanes[event.id] ?? 0;
              const leftOffset = 8 + lane * 70;

              if (event.type === "point") {
                return (
                  <div
                    key={event.id}
                    className="absolute left-0 right-0 flex items-center group cursor-pointer z-10"
                    style={{ top: `${top}%` }}
                    title={`${event.name}: ${event.startDate}`}
                    onDoubleClick={() => onEditEvent?.(event)}
                  >
                    <div className="h-px shrink-0" style={{ width: 12, backgroundColor: event.color, opacity: 0.6 }} />
                    <div className="w-4 h-4 rounded-full border-2 border-white shadow-md shrink-0" style={{ backgroundColor: event.color }} />
                    <span className="ml-1.5 text-[10px] text-gray-600 dark:text-gray-300 whitespace-nowrap bg-white/80 dark:bg-gray-800/80 px-1.5 py-0.5 rounded shadow-sm z-10">
                      {event.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); onRemoveEvent(event.id); }}
                      className="w-3.5 h-3.5 bg-red-400 text-white rounded-full text-[9px] flex items-center justify-center opacity-0 group-hover:opacity-100 ml-0.5 shrink-0"
                    >×</button>
                  </div>
                );
              }

              return (
                <div
                  key={event.id}
                  className="absolute rounded group cursor-pointer border border-white/30 z-10"
                  style={{
                    top: `${top}%`,
                    left: leftOffset,
                    width: trackWidth - leftOffset - 8,
                    height: `${h}%`,
                    backgroundColor: event.color,
                    minHeight: 8,
                  }}
                  title={`${event.name}: ${event.startDate} → ${event.endDate} · ${dur}天`}
                  onDoubleClick={() => onEditEvent?.(event)}
                >
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-800 font-medium truncate px-1">
                    {event.name} · {dur}天
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveEvent(event.id); }}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                  >×</button>
                </div>
              );
            })}

            {hasToday && (
              <div className="absolute left-0 right-0 z-20" style={{ top: `${todayPct}%` }}>
                <div className="absolute left-0 right-0 border-t border-red-400 border-dashed" />
                <span className="absolute left-1 -top-1 text-[9px] text-red-400 whitespace-nowrap bg-white dark:bg-gray-800 px-1">今天</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ---- HORIZONTAL LAYOUT ----
  const containerHeight = Math.max(64, 8 + numLanes * LANE_HEIGHT + 8);

  return (
    <div className="px-4 py-3">
      <div
        className="relative bg-gray-50 dark:bg-gray-800/50 rounded-lg"
        style={{ height: containerHeight }}
      >
        {/* Month markers */}
        <div className="absolute top-0 left-0 right-0 flex h-5">
          {monthMarkers.map((m, i) => (
            <div
              key={i}
              className="absolute text-[10px] text-gray-400 dark:text-gray-500"
              style={{ left: `${m.position}%`, transform: "translateX(-50%)" }}
            >
              {m.label}
            </div>
          ))}
        </div>

        {/* Event bars area */}
        <div className="absolute top-5 left-0 right-0 bottom-2">
          {/* Alternating month backgrounds */}
          {monthMarkers.map((m, i) => {
            if (i % 2 === 1) return null;
            const nextPos = monthMarkers[i + 1]?.position ?? 100;
            return (
              <div
                key={`bg-${i}`}
                className="absolute top-0 bottom-0"
                style={{ left: `${m.position}%`, width: `${nextPos - m.position}%`, backgroundColor: "rgba(0,0,0,0.02)" }}
              />
            );
          })}

          {/* Month tick marks */}
          {monthMarkers.map((m, i) => (
            <div
              key={`tick-${i}`}
              className="absolute top-0 bottom-0 border-l border-gray-200 dark:border-gray-700"
              style={{ left: `${m.position}%` }}
            />
          ))}

          {/* Events per lane — render lane strips */}
          {Array.from({ length: numLanes }, (_, li) => (
            <div
              key={`lane-${li}`}
              className="absolute left-0 right-0"
              style={{ top: 2 + li * LANE_HEIGHT, height: LANE_HEIGHT - 2 }}
            />
          ))}

          {/* Horizontal track line */}
          <div
            className="absolute left-0 right-0 bg-gray-300 dark:bg-gray-600"
            style={{ top: "50%", height: 1, transform: "translateY(-50%)" }}
          />

          {/* Events */}
          {timeline.events.map((event) => {
            const evStart = parseISO(event.startDate);
            const evEnd = parseISO(event.endDate);
            const startOff = differenceInDays(evStart, startDate);
            const dur = differenceInDays(evEnd, evStart);
            const left = Math.max(0, (startOff / totalDays) * 100);
            const width = event.type === "point" ? 2 : Math.max(2, (dur / totalDays) * 100);
            const lane = eventLanes[event.id] ?? 0;

            if (event.type === "point") {
              return (
                <div
                  key={event.id}
                  className="absolute group cursor-pointer z-10"
                  style={{ left: `${left}%`, top: "50%", transform: "translate(-50%, -50%)" }}
                  title={`${event.name}: ${event.startDate}`}
                  onDoubleClick={() => onEditEvent?.(event)}
                >
                  <div
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ bottom: 6, width: 1, height: 14, backgroundColor: event.color, opacity: 0.5 }}
                  />
                  <div className="w-4 h-4 rounded-full border-2 border-white shadow-md" style={{ backgroundColor: event.color }} />
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] text-gray-600 dark:text-gray-300 whitespace-nowrap bg-white/80 dark:bg-gray-800/80 px-1 rounded shadow-sm">
                    {event.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemoveEvent(event.id); }}
                    className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-400 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100"
                  >×</button>
                </div>
              );
            }

            return (
              <div
                key={event.id}
                className="absolute rounded group cursor-pointer border border-white/40 z-10"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  top: 2 + lane * LANE_HEIGHT,
                  height: LANE_HEIGHT - 4,
                  backgroundColor: event.color,
                  minWidth: 8,
                }}
                title={`${event.name}: ${event.startDate} → ${event.endDate} · ${dur}天`}
                onDoubleClick={() => onEditEvent?.(event)}
              >
                <span className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-800 font-medium truncate px-1">
                  {event.name} · {dur}天
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveEvent(event.id); }}
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-400 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-sm"
                >×</button>
              </div>
            );
          })}

          {/* Today marker */}
          {hasToday && (
            <div className="absolute top-0 bottom-0 z-20" style={{ left: `${todayPct}%` }}>
              <div className="absolute top-0 bottom-0 border-l border-red-400 border-dashed" />
              <span className="absolute -top-1 left-1 text-[9px] text-red-400 whitespace-nowrap bg-white dark:bg-gray-800 px-1">今天</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

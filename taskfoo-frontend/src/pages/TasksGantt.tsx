/* src/pages/TasksGantt.tsx */
import React, { useMemo, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Space, Select, DatePicker, Tag, Typography, Avatar, Tooltip, Empty, message } from "antd";
import PageHeader from "../components/PageHeader";
import api from "../api/client";
import type { Epic, Project } from "../types";
import type { TaskListItemResponse, UserBrief } from "../api/tasks";
import { listEpics } from "../api/epics";
import dayjs, { Dayjs } from "dayjs";
import { SyncOutlined } from "@ant-design/icons";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// Helper functions
function getDisplayName(u: UserBrief | any) {
  const full = (u as any)?.fullName;
  if (typeof full === "string" && full.trim()) return full.trim();
  const name = (u as any)?.name ?? "";
  const surname = (u as any)?.surname ?? "";
  const joined = `${(name || "").trim()}${surname ? " " + String(surname).trim() : ""}`.trim();
  return joined || "-";
}

function initialsFromBrief(u: UserBrief | any) {
  const full = (u as any)?.fullName;
  let name = "", surname = "";
  if (typeof full === "string" && full.trim()) {
    const p = full.trim().split(/\s+/);
    name = p[0] || "";
    surname = p.length > 1 ? p[p.length - 1] : "";
  } else {
    name = (u as any)?.name ?? "";
    surname = (u as any)?.surname ?? "";
  }
  const i1 = name ? String(name)[0] : "";
  const i2 = surname ? String(surname)[0] : "";
  return (i1 + i2 || String(name).slice(0, 2) || "?").toUpperCase();
}

function colorFromId(id: number) {
  return `hsl(${(id * 137.508) % 360}deg, 65%, 45%)`;
}

const statusColors = {
  "Done": "#10B981",
  "In Progress": "#FB923C", 
  "Archive": "#94A3B8",
  "To Do": "#3092B9"
};

function getStatusColor(status?: string) {
  return statusColors[status as keyof typeof statusColors] || statusColors["To Do"];
}

// Custom Gantt Chart Component
interface GanttTaskData {
  id: number;
  title: string;
  startDate: string;
  dueDate: string;
  status: string;
  assignees: UserBrief[];
  epicName: string;
  // version: number; // optimistic concurrency disabled temporarily
}

interface GanttChartProps {
  tasks: GanttTaskData[];
  onTaskUpdate: (taskId: number, startDate: string, dueDate: string) => Promise<void>;
}

function GanttChart({ tasks, onTaskUpdate }: GanttChartProps) {
  const [dragState, setDragState] = useState<{
    taskId: number;
    mode: 'move' | 'resize-left' | 'resize-right';
    startX: number;
    originalStart: Dayjs;
    originalEnd: Dayjs;
  } | null>(null);

  const [updatingTasks, setUpdatingTasks] = useState<Set<number>>(new Set());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const ganttRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastMove = useRef<{ x: number } | null>(null);

  // Calculate date range for the chart
  const dateRange = useMemo(() => {
    if (tasks.length === 0) {
      const today = dayjs();
      return {
        start: today.subtract(1, 'month').startOf('day'),
        end: today.add(2, 'months').endOf('day')
      };
    }

    const allDates = tasks.flatMap(t => [dayjs(t.startDate), dayjs(t.dueDate)]);
    const minDate = allDates.reduce((min, current) => current.isBefore(min) ? current : min).subtract(1, 'week').startOf('day');
    const maxDate = allDates.reduce((max, current) => current.isAfter(max) ? current : max).add(1, 'week').endOf('day');

    return { start: minDate, end: maxDate };
  }, [tasks]);

  const totalDays = Math.max(1, dateRange.end.diff(dateRange.start, 'day'));
  const dayWidth = 40; // pixels per day
  const chartWidth = Math.max(800, totalDays * dayWidth);

  // Group tasks by epic
  const groupedTasks = useMemo(() => {
    const groups: Record<string, GanttTaskData[]> = {};
    tasks.forEach(task => {
      const epicName = task.epicName || 'No Epic';
      if (!groups[epicName]) groups[epicName] = [];
      groups[epicName].push(task);
    });
    return Object.entries(groups);
  }, [tasks]);

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);

  const getDatePosition = useCallback((date: Dayjs) => {
    const diff = date.diff(dateRange.start, 'day', true);
    return diff * dayWidth;
  }, [dateRange.start, dayWidth]);

  const getDateFromPosition = useCallback((x: number) => {
    // snap to whole day and clamp inside chart
    const clamped = clamp(x, 0, chartWidth);
    const daysFloat = clamped / dayWidth;
    const days = Math.round(daysFloat);
    return dateRange.start.add(days, 'day').startOf('day');
  }, [dateRange.start, chartWidth, dayWidth]);

  const paintDuringDrag = useCallback((taskId: number, newStart: Dayjs, newEnd: Dayjs) => {
    if (!ganttRef.current) return;
    const taskElement = ganttRef.current.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement | null;
    if (!taskElement) return;

    const startPos = getDatePosition(newStart);
    const endPos = getDatePosition(newEnd);
    taskElement.style.left = `${startPos}px`;
    taskElement.style.width = `${Math.max(20, endPos - startPos)}px`;

    const tooltip = taskElement.querySelector('.task-tooltip') as HTMLElement | null;
    if (tooltip) {
      tooltip.textContent = `${newStart.format('DD MMM')} → ${newEnd.format('DD MMM')}`;
    }
  }, [getDatePosition]);

  const beginDrag = useCallback((e: React.MouseEvent, task: GanttTaskData, mode: 'move' | 'resize-left' | 'resize-right') => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedId(task.id);
    setDragState({
      taskId: task.id,
      mode,
      startX: e.clientX,
      originalStart: dayjs(task.startDate),
      originalEnd: dayjs(task.dueDate)
    });
  }, []);

  const onGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!dragState) return;
    lastMove.current = { x: e.clientX };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (!dragState || !lastMove.current) return;

      const deltaX = lastMove.current.x - dragState.startX;
      const deltaDays = deltaX / dayWidth;

      let newStart = dragState.originalStart;
      let newEnd = dragState.originalEnd;

      if (dragState.mode === 'move') {
        newStart = dragState.originalStart.add(deltaDays, 'day');
        newEnd = dragState.originalEnd.add(deltaDays, 'day');
      } else if (dragState.mode === 'resize-left') {
        newStart = dragState.originalStart.add(deltaDays, 'day');
        if (newStart.isAfter(newEnd)) newStart = newEnd.subtract(1, 'day');
      } else if (dragState.mode === 'resize-right') {
        newEnd = dragState.originalEnd.add(deltaDays, 'day');
        if (newEnd.isBefore(newStart)) newEnd = newStart.add(1, 'day');
      }

      // clamp to chart bounds
      const minDate = dateRange.start;
      const maxDate = dateRange.end;

      if (newStart.isBefore(minDate)) {
        const shift = minDate.diff(newStart, 'day');
        newStart = newStart.add(shift, 'day');
        newEnd = newEnd.add(shift, 'day');
      }
      if (newEnd.isAfter(maxDate)) {
        const shift = newEnd.diff(maxDate, 'day');
        newStart = newStart.subtract(shift, 'day');
        newEnd = newEnd.subtract(shift, 'day');
      }

      paintDuringDrag(dragState.taskId, newStart, newEnd);
    });
  }, [dragState, dayWidth, dateRange.start, dateRange.end, paintDuringDrag]);

  const onGlobalMouseUp = useCallback(async () => {
    if (!dragState || !ganttRef.current) {
      setDragState(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }

    const task = tasks.find(t => t.id === dragState.taskId);
    if (!task) {
      setDragState(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }

    const taskElement = ganttRef.current.querySelector(`[data-task-id="${task.id}"]`) as HTMLElement | null;
    if (!taskElement) {
      setDragState(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      return;
    }

    // Final positions
    const startPos = parseFloat(taskElement.style.left || '0');
    const width = parseFloat(taskElement.style.width || '0');
    const endPos = startPos + width;
    const safeEndPos = Math.max(startPos + 1, endPos);

    let newStart = getDateFromPosition(startPos);
    let newEnd = getDateFromPosition(safeEndPos);

    // ensure min 1 day
    if (!newEnd.isAfter(newStart)) {
      newEnd = newStart.add(1, 'day');
    }

    // save to backend
    setUpdatingTasks(prev => new Set(prev).add(task.id));
    try {
      await onTaskUpdate(
        task.id,
        newStart.format('YYYY-MM-DD'),
        newEnd.format('YYYY-MM-DD')
      );
      message.success('Task dates updated', 1);
    } catch (error: any) {
      // revert to original dates
      paintDuringDrag(task.id, dragState.originalStart, dragState.originalEnd);
      message.error(error?.response?.data?.message || 'Failed to update task dates');
    } finally {
      setUpdatingTasks(prev => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      setDragState(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [dragState, tasks, getDateFromPosition, onTaskUpdate, paintDuringDrag]);

  // Global listeners and drag UX tweaks
  React.useEffect(() => {
    if (!dragState) return;
    const cursor = dragState.mode === 'move' ? 'grabbing' : 'col-resize';
    document.addEventListener('mousemove', onGlobalMouseMove);
    document.addEventListener('mouseup', onGlobalMouseUp);
    document.body.style.cursor = cursor;
    document.body.style.userSelect = 'none'; // prevent text selection while dragging

    return () => {
      document.removeEventListener('mousemove', onGlobalMouseMove);
      document.removeEventListener('mouseup', onGlobalMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastMove.current = null;
    };
  }, [dragState, onGlobalMouseMove, onGlobalMouseUp]);

  // Generate time grid
  const timeGrid = useMemo(() => {
    const months: { label: string; x: number; width: number }[] = [];
    const days: { date: Dayjs; x: number; isWeekend: boolean }[] = [];

    let current = dateRange.start.startOf('month');

    while (current.isBefore(dateRange.end)) {
      const monthStart = Math.max(0, getDatePosition(current));
      const monthEnd = Math.min(chartWidth, getDatePosition(current.endOf('month')));
      if (monthEnd > monthStart) {
        months.push({
          label: current.format('MMM YYYY'),
          x: monthStart,
          width: monthEnd - monthStart
        });
      }
      current = current.add(1, 'month').startOf('month');
    }

    current = dateRange.start.startOf('day');
    while (current.isBefore(dateRange.end)) {
      days.push({
        date: current,
        x: getDatePosition(current),
        isWeekend: [0, 6].includes(current.day())
      });
      current = current.add(1, 'day');
    }

    return { months, days };
  }, [dateRange, chartWidth, getDatePosition]);

  const rowHeight = 48;
  const headerHeight = 80;
  const totalHeight = headerHeight + groupedTasks.reduce((acc, [_, tks]) => acc + tks.length * rowHeight + 32, 0);

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: 8,
      overflow: 'hidden',
      background: '#fff'
    }}>
      {/* Scrollable container */}
      <div style={{
        overflowX: 'auto',
        overflowY: 'auto',
        maxHeight: '70vh',
        position: 'relative'
      }}>
        <div
          ref={ganttRef}
          style={{
            width: Math.max(chartWidth + 300, 1200),
            height: totalHeight,
            position: 'relative'
          }}
        >
          {/* Task labels column (fixed) */}
          <div style={{
            position: 'sticky',
            left: 0,
            top: 0,
            width: 300,
            height: '100%',
            background: '#fafbfc',
            borderRight: '2px solid #e5e7eb',
            zIndex: 10
          }}>
            {/* Header */}
            <div style={{
              height: headerHeight,
              padding: '12px 16px',
              borderBottom: '1px solid #e5e7eb',
              background: '#f8fafc',
              display: 'flex',
              alignItems: 'center'
            }}>
              <Text strong style={{ color: '#374151' }}>Tasks</Text>
            </div>

            {/* Task rows */}
            {groupedTasks.map(([epicName, epicTasks]) => (
              <div key={epicName}>
                {/* Epic header */}
                <div style={{
                  padding: '8px 16px',
                  background: '#f1f5f9',
                  borderBottom: '1px solid #e5e7eb',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#64748b'
                }}>
                  {epicName}
                </div>

                {/* Tasks in epic */}
                {epicTasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      height: rowHeight,
                      padding: '8px 16px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      background: updatingTasks.has(task.id) ? '#fef3c7' : '#fff'
                    }}
                    onClick={() => setSelectedId(task.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: '#374151',
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {task.title}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Tag
                          color={getStatusColor(task.status)}
                          style={{ margin: 0, fontSize: 10 }}
                        >
                          {task.status}
                        </Tag>
                        {task.assignees.length > 0 && (
                          <Avatar.Group size="small" max={{ count: 2 }}>
                            {task.assignees.map(user => (
                              <Tooltip key={user.id} title={getDisplayName(user)}>
                                <Avatar
                                  size="small"
                                  style={{
                                    background: colorFromId(user.id),
                                    fontSize: 9,
                                    width: 20,
                                    height: 20,
                                    lineHeight: '20px'
                                  }}
                                >
                                  {initialsFromBrief(user)}
                                </Avatar>
                              </Tooltip>
                            ))}
                          </Avatar.Group>
                        )}
                        {updatingTasks.has(task.id) && (
                          <SyncOutlined spin style={{ color: '#f59e0b', fontSize: 12 }} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Timeline header */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 300,
            width: chartWidth,
            height: headerHeight,
            background: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            zIndex: 5
          }}>
            {/* Month headers */}
            <div style={{ height: 40, position: 'relative', borderBottom: '1px solid #e5e7eb' }}>
              {timeGrid.months.map((month, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: month.x,
                    width: month.width,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#4b5563',
                    borderRight: i < timeGrid.months.length - 1 ? '1px solid #e5e7eb' : 'none'
                  }}
                >
                  {month.label}
                </div>
              ))}
            </div>

            {/* Week/day markers */}
            <div style={{ height: 40, position: 'relative' }}>
              {timeGrid.days.map((day, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: day.x,
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    paddingLeft: 8,
                    fontSize: 11,
                    color: '#6b7280',
                    borderRight: '1px solid #f3f4f6'
                  }}
                >
                  {day.date.format('DD')}
                </div>
              ))}
            </div>
          </div>

          {/* Chart area */}
          <div style={{
            position: 'absolute',
            top: headerHeight,
            left: 300,
            width: chartWidth,
            height: totalHeight - headerHeight
          }}>
            {/* Background grid with weekend shading */}
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none'
              }}
            >
              {timeGrid.days.map((day, i) => (
                <g key={i}>
                  {day.isWeekend && (
                    <rect
                      x={day.x}
                      y={0}
                      width={dayWidth}
                      height="100%"
                      fill="#f9fafb"
                    />
                  )}
                  <line
                    x1={day.x}
                    y1={0}
                    x2={day.x}
                    y2="100%"
                    stroke="#f3f4f6"
                    strokeWidth={1}
                  />
                </g>
              ))}

              {/* Today line */}
              {(() => {
                const todayX = getDatePosition(dayjs());
                if (todayX >= 0 && todayX <= chartWidth) {
                  return (
                    <line
                      x1={todayX}
                      y1={0}
                      x2={todayX}
                      y2="100%"
                      stroke="#ef4444"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                    />
                  );
                }
                return null;
              })()}
            </svg>

            {/* Task bars */}
            {groupedTasks.map(([, epicTasks], groupIndex) => {
              let currentY = groupIndex > 0 ?
                groupedTasks.slice(0, groupIndex).reduce((acc, [, tks]) => acc + tks.length * rowHeight + 32, 0) + 32 : 32;

              return epicTasks.map((task, taskIndex) => {
                const taskY = currentY + taskIndex * rowHeight;
                const startPos = getDatePosition(dayjs(task.startDate));
                const endPos = getDatePosition(dayjs(task.dueDate));
                const width = Math.max(20, endPos - startPos);

                const isUpdating = updatingTasks.has(task.id);
                const isDragging = dragState?.taskId === task.id;
                const isSelected = selectedId === task.id;

                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    style={{
                      position: 'absolute',
                      left: startPos,
                      top: taskY + 8,
                      width: width,
                      height: 32,
                      background: `linear-gradient(135deg, ${getStatusColor(task.status)}, ${getStatusColor(task.status)}dd)`,
                      borderRadius: 6,
                      cursor: isDragging ? 'grabbing' : 'grab',
                      border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255,255,255,0.2)',
                      boxShadow: isDragging ? '0 4px 12px rgba(59, 130, 246, 0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 8px',
                      transition: isDragging ? 'none' : 'all 0.2s ease',
                      transform: isDragging ? 'scale(1.02)' : 'scale(1)',
                      zIndex: isDragging ? 100 : 1,
                      opacity: isUpdating ? 0.7 : 1
                    }}
                    onMouseDown={(e) => beginDrag(e, task, 'move')}
                    onClick={(e) => { e.stopPropagation(); setSelectedId(task.id); }}
                  >
                    {/* Resize handles (visible on hover/selection) */}
                    <div
                      style={{
                        position: 'absolute',
                        left: -4,
                        top: 0,
                        width: 8,
                        height: '100%',
                        cursor: 'col-resize',
                        background: 'transparent'
                      }}
                      onMouseDown={(e) => beginDrag(e, task, 'resize-left')}
                      className="resize-left"
                    />
                    <div
                      style={{
                        position: 'absolute',
                        right: -4,
                        top: 0,
                        width: 8,
                        height: '100%',
                        cursor: 'col-resize',
                        background: 'transparent'
                      }}
                      onMouseDown={(e) => beginDrag(e, task, 'resize-right')}
                      className="resize-right"
                    />

                    {/* Duration chip */}
                    <div style={{
                      position: 'absolute',
                      top: -22,
                      left: 8,
                      padding: '2px 6px',
                      fontSize: 10,
                      background: 'rgba(0,0,0,0.55)',
                      color: '#fff',
                      borderRadius: 4,
                      opacity: isDragging || isSelected ? 1 : 0,
                      transition: 'opacity .2s ease'
                    }}>
                      {dayjs(task.startDate).format('DD MMM')} → {dayjs(task.dueDate).format('DD MMM')}
                    </div>

                    {/* Task content */}
                    <div style={{
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1,
                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                    }}>
                      {task.title}
                    </div>

                    {/* Tooltip (follows old behaviour during drag) */}
                    <div
                      className="task-tooltip"
                      style={{
                        position: 'absolute',
                        bottom: -28,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'rgba(0,0,0,0.8)',
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 10,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        opacity: isDragging ? 1 : 0,
                        transition: 'opacity 0.2s ease',
                        zIndex: 1000
                      }}
                    >
                      {dayjs(task.startDate).format('DD MMM')} → {dayjs(task.dueDate).format('DD MMM')}
                    </div>
                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: '12px 16px',
        background: '#f8fafc',
        borderTop: '1px solid #e5e7eb',
        fontSize: 12,
        color: '#6b7280'
      }}>
        <Space size={16}>
          <span>💡 <strong>Drag</strong> task bars to move dates</span>
          <span>↔️ <strong>Drag edges</strong> to resize duration</span>
          <span>🔴 <strong>Red dashed line</strong> shows today</span>
          <span>🗓️ <strong>Weekend</strong> columns are shaded</span>
        </Space>
      </div>
    </div>
  );
}

export default function TasksGantt() {
  const qc = useQueryClient();

  const { data: tasks = [] } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<TaskListItemResponse[]>("/api/tasks")).data,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<Project[]>("/api/projects")).data,
  });

  const { data: epics = [] } = useQuery<Epic[]>({ 
    queryKey: ["epics"], 
    queryFn: listEpics 
  });

  const [projectId, setProjectId] = useState<number | undefined>();
  const [epicId, setEpicId] = useState<number | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | undefined>();

  // Epic to project mapping
  const epicToProjectId = useMemo(() => {
    const map: Record<number, number | undefined> = {};
    for (const e of epics as Epic[]) {
      if (e?.id != null) map[e.id] = e.project?.id;
    }
    return map;
  }, [epics]);

  // Filtered tasks
  const filtered = useMemo(() => {
    return (tasks as TaskListItemResponse[]).filter((t) => {
      if (projectId != null) {
        const pid = t.epic?.id != null ? epicToProjectId[t.epic.id] : undefined;
        if (pid !== projectId) return false;
      }
      if (epicId != null && t.epic?.id !== epicId) return false;
      if (range) {
        const s = dayjs(t.startDate);
        const d = dayjs(t.dueDate);
        if (d.isBefore(range[0], "day") || s.isAfter(range[1], "day")) return false;
      }
      return true;
    });
  }, [tasks, projectId, epicId, range, epicToProjectId]);

  // Assignees summary
  const assignees = useMemo(() => {
    const uniq = new Map<number, UserBrief>();
    for (const t of filtered) {
      for (const u of t.assignees || []) {
        if (!uniq.has(u.id)) uniq.set(u.id, u);
      }
    }
    return Array.from(uniq.values());
  }, [filtered]);

  // Transform data for Gantt chart
  const ganttTasks: GanttTaskData[] = useMemo(() => {
    return filtered.map(task => ({
      id: task.id,
      title: task.title,
      startDate: task.startDate,
      dueDate: task.dueDate,
      status: task.status?.name || 'To Do',
      assignees: task.assignees || [],
      epicName: task.epic?.name || ''
    }));
  }, [filtered]);

  // Handle task date updates
  const handleTaskUpdate = useCallback(async (taskId: number, startDate: string, dueDate: string) => {
    // Ensure dates are sent as YYYY-MM-DD
    const s = dayjs(startDate).format("YYYY-MM-DD");
    const d = dayjs(dueDate).format("YYYY-MM-DD");

    try {
      await api.patch(`/api/tasks/${taskId}/dates`, { startDate: s, dueDate: d });
      // Refresh tasks to reflect latest server state
      qc.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Task dates updated", 1);
    } catch (err: any) {
      const msg: string = err?.response?.data?.message || err?.message || "Failed to update task dates";
      message.error(msg);
      throw err;
    }
  }, [qc]);

  const datasetEmpty = ganttTasks.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeader title="Tasks Gantt" actionText="Back to Tasks" to="/tasks" />
      
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12 }}>
        {/* Filters */}
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space wrap>
            <div>
              <Text strong>Project</Text>
              <Select
                allowClear
                placeholder="All projects"
                style={{ width: 240, marginLeft: 8 }}
                value={projectId}
                onChange={(v) => {
                  setProjectId(v);
                  setEpicId(undefined);
                }}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            
            <div>
              <Text strong>Epic</Text>
              <Select
                allowClear
                placeholder="All epics"
                style={{ width: 240, marginLeft: 8 }}
                value={epicId}
                onChange={setEpicId}
                options={(epics as Epic[])
                  .filter((e) => (projectId ? e.project?.id === projectId : true))
                  .map((e) => ({ value: e.id, label: e.name }))}
              />
            </div>
            
            <div>
              <Text strong>Date range</Text>
              <RangePicker 
                style={{ marginLeft: 8 }} 
                value={range} 
                onChange={(v) => setRange(v as any)} 
              />
            </div>
            
            <div>
              <Text strong>Legend</Text>
              <Space size={6} style={{ marginLeft: 8 }}>
                <Tag color="#3092B9">To Do</Tag>
                <Tag color="#FB923C">In Progress</Tag>
                <Tag color="#10B981">Done</Tag>
                <Tag color="#94A3B8">Archive</Tag>
              </Space>
            </div>
          </Space>
          
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Assignees in view:</Text>
            <Space size="small" style={{ marginLeft: 8 }}>
              {assignees.length === 0 ? (
                <Text type="secondary">-</Text>
              ) : (
                <Avatar.Group size="small" max={{ count: 8, style: { color: '#64748b', backgroundColor: '#f1f5f9' } }}>
                  {assignees.map((u) => (
                    <Tooltip key={u.id} title={getDisplayName(u)}>
                      <Avatar style={{ 
                        background: colorFromId(u.id), 
                        border: "1px solid #fff", 
                        fontSize: 11 
                      }}>
                        {initialsFromBrief(u)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Avatar.Group>
              )}
            </Space>
          </div>
        </Card>

        {/* Main Chart */}
        {datasetEmpty ? (
          <Card>
            <Empty 
              description="No tasks match current filters." 
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : (
          <Card styles={{ body: { padding: 0 } }}>
            <GanttChart 
              tasks={ganttTasks} 
              onTaskUpdate={handleTaskUpdate}
            />
          </Card>
        )}
      </div>
    </div>
  );
}
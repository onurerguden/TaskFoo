/* src/pages/TasksGantt.tsx */
import React, { useMemo, useState, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Space, Select, DatePicker, Tag, Typography, Avatar, Tooltip, Empty, message, Dropdown, Button, Modal, Checkbox, Input } from "antd";
import PageHeader from "../components/PageHeader";
import api from "../api/client";
import type { Epic, Project, Status, Priority } from "../types";
import { listStatuses } from "../api/statuses";
import { listPriorities } from "../api/priorities";
import { assignUsers } from "../api/tasks";
import type { TaskListItemResponse, UserBrief } from "../api/tasks";
import { listEpics } from "../api/epics";
import dayjs, { Dayjs } from "dayjs";
import { SyncOutlined, MoreOutlined, EditOutlined, UserAddOutlined, DeleteOutlined } from "@ant-design/icons";

import { listUsers } from "../api/users";
import TaskEdit from "./TaskEdit";

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

const LABEL_COL_WIDTH = 180; // Previously 300 — reduce to one third for task labels column
const EPIC_HEADER_HEIGHT = 32; // height reserved for each epic header row in the chart
const EPIC_BAR_HEIGHT = 16;    // visual height of the red epic span bar

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
  onEdit?: (taskId: number) => void;
  onAssign?: (taskId: number, currentAssigneeIds: number[]) => void;
  onDelete?: (taskId: number, title?: string) => void;
}

function GanttChart({ tasks, onTaskUpdate, onEdit, onAssign, onDelete }: GanttChartProps) {
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
    const minDate = allDates.reduce((min, current) => current.isBefore(min) ? current : min).subtract(2, 'day').startOf('day');
    const maxDate = allDates.reduce((max, current) => current.isAfter(max) ? current : max).add(2, 'day').endOf('day');

    return { start: minDate, end: maxDate };
  }, [tasks]);

  const totalDays = Math.max(1, dateRange.end.diff(dateRange.start, 'day'));
  const dayWidth = 40; // pixels per day
  const chartWidth = Math.max(800, totalDays * dayWidth);

  // Group tasks by epic
  // Group tasks by epic + sort: (1) tasks inside epic by startDate asc, (2) epics by earliest startDate asc
// Group tasks by epic + sort:
// (1) tasks inside each epic by startDate asc, tie-break by (duration asc), sonra title asc
// (2) epics by earliest task's (startDate asc, sonra duration asc), sonra epic adı asc
const groupedTasks = useMemo(() => {
  const byEpic: Record<string, GanttTaskData[]> = {};
  for (const t of tasks) {
    const epicName = t.epicName || "No Epic";
    (byEpic[epicName] ||= []).push(t);
  }

  const cmpTask = (a: GanttTaskData, b: GanttTaskData) => {
    const aStart = dayjs(a.startDate).valueOf();
    const bStart = dayjs(b.startDate).valueOf();
    if (aStart !== bStart) return aStart - bStart;

    const aDur = dayjs(a.dueDate).valueOf() - dayjs(a.startDate).valueOf();
    const bDur = dayjs(b.dueDate).valueOf() - dayjs(b.startDate).valueOf();
    if (aDur !== bDur) return aDur - bDur;

    // stable fallback (optional)
    return (a.title || "").localeCompare(b.title || "");
  };

  const ordered = Object.entries(byEpic)
    .map(([epicName, list]) => {
      const sortedTasks = [...list].sort(cmpTask);

      // epic sıralaması için: en erken başlayan task; eşitse en kısa süre
      const earliestStart = sortedTasks.length
        ? dayjs(sortedTasks[0].startDate).valueOf()
        : Number.POSITIVE_INFINITY;
      const earliestDur = sortedTasks.length
        ? dayjs(sortedTasks[0].dueDate).valueOf() - dayjs(sortedTasks[0].startDate).valueOf()
        : Number.POSITIVE_INFINITY;

      return { epicName, sortedTasks, earliestStart, earliestDur };
    })
    .sort((a, b) => {
      if (a.earliestStart !== b.earliestStart) return a.earliestStart - b.earliestStart;
      if (a.earliestDur !== b.earliestDur) return a.earliestDur - b.earliestDur;
      return a.epicName.localeCompare(b.epicName);
    })
    .map(({ epicName, sortedTasks }) => [epicName, sortedTasks] as [string, GanttTaskData[]]);

  return ordered;
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
  const totalHeight = headerHeight + groupedTasks.reduce((acc, [_, tks]) => acc + EPIC_HEADER_HEIGHT + tks.length * rowHeight, 0);

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
        maxHeight: '80vh',
        position: 'relative'
      }}>
        <div
          ref={ganttRef}
          style={{
            width: chartWidth + LABEL_COL_WIDTH,
            height: totalHeight,
            position: 'relative'
          }}
        >
          {/* Task labels column (fixed) */}
          <div style={{
            position: 'sticky',
            left: 0,
            top: 0,
            width: LABEL_COL_WIDTH,
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
                {/* Epic header row */}
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
                {[...epicTasks].sort((a, b) => {
                  const aStart = dayjs(a.startDate).valueOf();
                  const bStart = dayjs(b.startDate).valueOf();
                  if (aStart !== bStart) return aStart - bStart;
                  const aDur = dayjs(a.dueDate).valueOf() - dayjs(a.startDate).valueOf();
                  const bDur = dayjs(b.dueDate).valueOf() - dayjs(b.startDate).valueOf();
                  if (aDur !== bDur) return aDur - bDur;
                  return (a.title || "").localeCompare(b.title || "");
                }).map((task) => (
                  <div
                    key={task.id}
                    style={{
                      height: rowHeight,
                      padding: '0px 0px',
                      borderBottom: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      background: updatingTasks.has(task.id) ? '#fef3c7' : '#fff'
                    }}
                    onClick={() => setSelectedId(task.id)}
                  >
                    <div style={{ marginRight: 1 }} onClick={(e) => e.stopPropagation()}>
                      <Dropdown
                        trigger={["click"]}
                        placement="bottomRight"
                        menu={{
                          items: [
                            { key: 'edit', label: 'Edit Task', icon: <EditOutlined />, onClick: () => onEdit && onEdit(task.id) },
                            { key: 'assign', label: 'Assign Users', icon: <UserAddOutlined />, onClick: () => onAssign && onAssign(task.id, (task.assignees || []).map(u => (u as any).id)) },
                            { type: 'divider' as const },
                            { key: 'delete', label: <span style={{ color: '#ef4444' }}>Delete Task</span>, icon: <DeleteOutlined style={{ color: '#ef4444' }} />, onClick: () => onDelete && onDelete(task.id, task.title) },
                          ]
                        }}
                      >
                        <Button type="text" size="small" icon={<MoreOutlined />} />
                      </Dropdown>
                    </div>
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
                          <Avatar.Group
                            size="small"
                            max={{
                              count: 3,
                              style: {
                                color: '#64748b',
                                backgroundColor: '#f1f5f9',
                                fontSize: 10,
                                border: '1px solid #fff',
                              },
                            }}
                          >
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
            left: LABEL_COL_WIDTH,
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
            left: LABEL_COL_WIDTH,
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

            {/* Task bars and epic span bars */}
            {groupedTasks.map(([epicName, epicTasks], groupIndex) => {
              const groupStartY = groupIndex > 0
                ? groupedTasks.slice(0, groupIndex).reduce((acc, [, tks]) => acc + EPIC_HEADER_HEIGHT + tks.length * rowHeight, 0)
                : 0; // top of epic header row
              const currentY = groupStartY + EPIC_HEADER_HEIGHT; // top of first task row for this epic

              // Sort tasks inside the epic by start asc, then duration asc (already consistent with label column)
              const sortedEpicTasks = [...epicTasks].sort((a, b) => {
                const aStart = dayjs(a.startDate).valueOf();
                const bStart = dayjs(b.startDate).valueOf();
                if (aStart !== bStart) return aStart - bStart;
                const aDur = dayjs(a.dueDate).valueOf() - dayjs(a.startDate).valueOf();
                const bDur = dayjs(b.dueDate).valueOf() - dayjs(b.startDate).valueOf();
                return aDur - bDur;
              });

              // Compute epic span: earliest start to latest due among tasks in this epic
              const epicStart = epicTasks.length
                ? epicTasks.reduce((min, t) => (dayjs(t.startDate).isBefore(min) ? dayjs(t.startDate) : min), dayjs(epicTasks[0].startDate))
                : null;
              const epicEnd = epicTasks.length
                ? epicTasks.reduce((max, t) => (dayjs(t.dueDate).isAfter(max) ? dayjs(t.dueDate) : max), dayjs(epicTasks[0].dueDate))
                : null;

              const epicStartPos = epicStart ? getDatePosition(epicStart) : 0;
              const epicEndPos = epicEnd ? getDatePosition(epicEnd) : 0;
              const epicWidth = Math.max(2, epicEndPos - epicStartPos);
              const epicBarY = groupStartY + (EPIC_HEADER_HEIGHT - EPIC_BAR_HEIGHT) / 2; // center inside epic header row

              return (
                <React.Fragment key={`group-${groupIndex}`}>
                  {epicStart && epicEnd && (
                    <div
                      key={`epic-span-${groupIndex}`}
                      style={{
                        position: 'absolute',
                        left: epicStartPos,
                        top: epicBarY,
                        width: epicWidth,
                        height: EPIC_BAR_HEIGHT,
                        background: 'linear-gradient(135deg, #ef4444, #ef4444dd)',
                        borderRadius: 6,
                        border: '1px solid rgba(255,255,255,0.25)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        pointerEvents: 'none',
                        zIndex: 2
                      }}
                      title={`${epicStart.format('DD MMM')} → ${epicEnd.format('DD MMM')}`}
                    >
                      <span style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fff',
                        textShadow: '0 1px 2px rgba(0,0,0,0.35)'
                      }}>
                        {epicName}
                      </span>
                    </div>
                  )}

                  {sortedEpicTasks.map((task, taskIndex) => {
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
                  })}
                </React.Fragment>
              );
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
  // Additional filters
  const [statusIds, setStatusIds] = useState<number[]>([]);
  const [priorityNames, setPriorityNames] = useState<string[]>([]);
  const [assigneeIdsFilter, setAssigneeIdsFilter] = useState<number[]>([]);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [searchText, setSearchText] = useState("");
  const { data: statuses = [] } = useQuery<Status[]>({
    queryKey: ["statuses"],
    queryFn: async () => (await api.get<Status[]>("/api/statuses")).data,
  });

  const { data: priorities = [] } = useQuery<Priority[]>({
    queryKey: ["priorities"],
    queryFn: async () => (await api.get<Priority[]>("/api/priorities")).data,
  });

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [assigningTaskId, setAssigningTaskId] = useState<number | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignSelection, setAssignSelection] = useState<number[]>([]);
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: listUsers });

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
      // Project filter via epic -> project
      if (projectId != null) {
        const pid = t.epic?.id != null ? epicToProjectId[t.epic.id] : undefined;
        if (pid !== projectId) return false;
      }
      // Epic filter
      if (epicId != null && t.epic?.id !== epicId) return false;
      // Date range filter
      if (range) {
        const s = dayjs(t.startDate);
        const d = dayjs(t.dueDate);
        if (d.isBefore(range[0], "day") || s.isAfter(range[1], "day")) return false;
      }
      // Status filter (multi)
      if (statusIds.length > 0) {
        const sid = t.status?.id;
        if (!sid || !statusIds.includes(Number(sid))) return false;
      }
      // Priority filter (by name)
      if (priorityNames.length > 0) {
        const name = t.priority?.name || "";
        if (!priorityNames.includes(name)) return false;
      }
      // Assignee filter (any match)
      if (assigneeIdsFilter.length > 0) {
        const ids = (t.assignees || []).map(u => u.id);
        if (!assigneeIdsFilter.some(id => ids.includes(id))) return false;
      }
      // Overdue only
      if (showOverdueOnly) {
        const due = t.dueDate ? dayjs(t.dueDate) : null;
        if (!due || !due.isBefore(dayjs(), "day")) return false;
      }
      // Unassigned only
      if (showUnassignedOnly) {
        if ((t.assignees || []).length > 0) return false;
      }
      // Text search in title/description
      if (searchText.trim()) {
        const needle = searchText.trim().toLowerCase();
        const hayTitle = (t.title || "").toLowerCase();
        const hayDesc = (t as any).description ? String((t as any).description).toLowerCase() : "";
        if (!hayTitle.includes(needle) && !hayDesc.includes(needle)) return false;
      }
      return true;
    });
  }, [tasks, projectId, epicId, range, epicToProjectId, statusIds, priorityNames, assigneeIdsFilter, showOverdueOnly, showUnassignedOnly, searchText]);

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

  const openEdit = (id: number) => setEditingTaskId(id);
  const openAssign = (id: number, preset: number[]) => {
    setAssigningTaskId(id);
    setAssignSelection(preset);
    setAssignOpen(true);
  };
  const handleAssign = async () => {
    if (!assigningTaskId) return;
    try {
      // Find latest version from the current tasks query result
      const current = (tasks as TaskListItemResponse[]).find(t => t.id === assigningTaskId);
      const version = current?.version ?? 0;

      await assignUsers(assigningTaskId, assignSelection, version);

      qc.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Assignees updated", 0.8);
      setAssignOpen(false);
      setAssigningTaskId(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update assignees";
      message.error(msg);
    }
  };
  const confirmDelete = (id: number, title?: string) => {
    Modal.confirm({
      title: `Delete task${title ? `: ${title}` : ""}?`,
      content: "This action cannot be undone.",
      okText: "Delete",
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await api.delete(`/api/tasks/${id}`);
          qc.invalidateQueries({ queryKey: ["tasks"] });
          message.success("Task deleted", 0.8);
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || "Failed to delete task";
          message.error(msg);
        }
      }
    });
  };

  const datasetEmpty = ganttTasks.length === 0;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeader title="Tasks Gantt" actionText="Back to Tasks" to="/tasks" />
      
      <div
        style={{ width: "100%", margin: 0, padding: 24 }}
      >
        {/* Filters */}
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space wrap>
            <div>
              <Text strong>Search</Text>
              <Input
                allowClear
                placeholder="Title or description"
                style={{ width: 260, marginLeft: 8 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            <div>
              <Text strong>Project</Text>
              <Select
                allowClear
                placeholder="All projects"
                style={{ width: 220, marginLeft: 8 }}
                value={projectId}
                onChange={(v) => { setProjectId(v); setEpicId(undefined); }}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>

            <div>
              <Text strong>Epic</Text>
              <Select
                allowClear
                placeholder="All epics"
                style={{ width: 220, marginLeft: 8 }}
                value={epicId}
                onChange={setEpicId}
                options={(epics as Epic[])
                  .filter((e) => (projectId ? e.project?.id === projectId : true))
                  .map((e) => ({ value: e.id, label: e.name }))}
              />
            </div>

            <div>
              <Text strong>Date range</Text>
              <RangePicker style={{ marginLeft: 8 }} value={range} onChange={(v) => setRange(v as any)} />
            </div>

            <div>
              <Text strong>Status</Text>
              <Select
                mode="multiple"
                allowClear
                placeholder="All statuses"
                style={{ width: 240, marginLeft: 8 }}
                value={statusIds}
                onChange={(vals) => setStatusIds((vals as number[]).map(Number))}
                maxTagCount={2}
                options={(statuses as Status[]).map(s => ({ value: s.id, label: s.name }))}
              />
            </div>

            <div>
              <Text strong>Priority</Text>
              <Select
                mode="multiple"
                allowClear
                placeholder="All priorities"
                style={{ width: 220, marginLeft: 8 }}
                value={priorityNames}
                onChange={(vals) => setPriorityNames(vals as string[])}
                maxTagCount={2}
                options={(priorities as Priority[]).map(p => ({ value: p.name, label: p.name }))}
              />
            </div>

            <div>
              <Text strong>Assignees</Text>
              <Select
                mode="multiple"
                allowClear
                placeholder="Any assignee"
                style={{ width: 280, marginLeft: 8 }}
                value={assigneeIdsFilter}
                onChange={(vals) => setAssigneeIdsFilter((vals as number[]).map(Number))}
                showSearch
                maxTagCount={2}
                filterOption={(input, option) => {
                  const lbl = option?.label as any;
                  const txt = typeof lbl === 'string' ? lbl : (lbl?.props?.children?.[1] ?? '');
                  return String(txt).toLowerCase().includes(input.toLowerCase());
                }}
                options={users.map((u: any) => ({
                  value: u.id,
                  label: (
                    <Space>
                      <Avatar size="small" style={{ background: colorFromId(u.id), fontSize: 11 }}>{initialsFromBrief(u)}</Avatar>
                      {getDisplayName(u)}
                    </Space>
                  )
                }))}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 8 }}>
              <Checkbox checked={showOverdueOnly} onChange={(e) => setShowOverdueOnly(e.target.checked)}>Overdue only</Checkbox>
              <Checkbox checked={showUnassignedOnly} onChange={(e) => setShowUnassignedOnly(e.target.checked)}>Unassigned only</Checkbox>
              <Button onClick={() => { setSearchText(""); setProjectId(undefined); setEpicId(undefined); setRange(undefined); setStatusIds([]); setPriorityNames([]); setAssigneeIdsFilter([]); setShowOverdueOnly(false); setShowUnassignedOnly(false); }}>
                Reset
              </Button>
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
                      <Avatar style={{ background: colorFromId(u.id), border: '1px solid #fff', fontSize: 11 }}>
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
              onEdit={openEdit}
              onAssign={(id, ids) => openAssign(id, ids)}
              onDelete={(id, title) => confirmDelete(id, title)}
            />
          </Card>
        )}
      </div>
      {/* Edit Task Modal */}
      <Modal
        title={null}
        open={!!editingTaskId}
        onCancel={() => setEditingTaskId(null)}
        footer={null}
        width="min(960px, 88vw)"
        style={{ top: 24 }}
        destroyOnClose
        styles={{ body: { padding: 0, overflow: 'hidden' } }}
      >
        {editingTaskId && (
          <div style={{ maxHeight: 'calc(100vh - 200px)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
              <Text strong style={{ fontSize: 16 }}>Edit Task — #{editingTaskId}</Text>
            </div>
            <div style={{ overflow: 'auto', padding: 16 }}>
              <TaskEdit
                inlineMode
                taskIdOverride={editingTaskId}
                onClose={() => {
                  setEditingTaskId(null);
                  qc.invalidateQueries({ queryKey: ['tasks'] });
                }}
              />
            </div>
          </div>
        )}
      </Modal>
      {/* Assign Users Modal */}
      <Modal
        title="Assign Users"
        open={assignOpen}
        onCancel={() => setAssignOpen(false)}
        onOk={handleAssign}
        okText="Save"
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Text type="secondary">Select users to assign to this task.</Text>
          <Select
            mode="multiple"
            style={{ width: "100%" }}
            placeholder="Select users"
            value={assignSelection}
            onChange={(vals) => setAssignSelection(vals as number[])}
            maxTagCount="responsive"
            showSearch
            filterOption={(input, option) => {
              if (!option) return true;
              const lbl = (option.label as any);
              const txt = typeof lbl === 'string' ? lbl : (lbl?.props?.children?.[1] ?? "");
              return String(txt).toLowerCase().includes(input.toLowerCase());
            }}
            options={users.map((u: any) => ({
              value: u.id,
              label: (
                <Space>
                  <Avatar
                    size="small"
                    style={{ background: colorFromId(u.id), fontSize: 11 }}
                  >
                    {initialsFromBrief(u)}
                  </Avatar>
                  {getDisplayName(u)}
                </Space>
              ),
            }))}
          />
        </Space>
      </Modal>
    </div>
  );
}
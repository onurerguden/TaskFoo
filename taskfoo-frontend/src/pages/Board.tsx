import { useMemo, useState, useCallback, useEffect } from "react";
import dayjs from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import "/src/Board.css";


import { wsSubscribe } from "../ws/client";
import {

  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { 
  Card, 
  Col, 
  Row, 
  Typography, 
  message, 
  Avatar, 
  Space, 
  Input, 
  Select, 
  Button, 
  Dropdown, 
  Badge, 
  Tag, 
  Tooltip,
  Empty,
  Skeleton,
  Modal,
  Form,
} from "antd";
import type { MenuProps } from 'antd';
import { 
  FilterOutlined, 
  MoreOutlined, 
  EditOutlined, 
  CalendarOutlined, 
  PaperClipOutlined,
  ClockCircleOutlined,
  UserOutlined,
  ExclamationCircleOutlined,
  WifiOutlined,
  ReloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";

import { listStatuses } from "../api/statuses";
import {
  listTasks,
  updateTaskStatus,
  assignUsers,
  type TaskListItemResponse,
  type UserBrief,
} from "../api/tasks";
import api from "../api/client";
import { listUsers } from "../api/users";
import { listPriorities } from "../api/priorities";
import { listProjects } from "../api/projects";
import { listEpics } from "../api/epics";
import type { Status, Priority, User, Project, Epic } from "../types";
import PageHeaderJust from "../components/PageHeaderJust";
import TaskEdit from "./TaskEdit";



const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

/** --- Types --- */
interface TaskWithMetadata extends Omit<TaskListItemResponse, 'priority' | 'assignees'> {
  // Priority from backend { id, name, color } + UI level
  priority: Priority & { level?: number };
  // UI expects assignedUsers: {id, name, surname}
  assignedUsers?: User[];
  attachments?: number;
  tags?: string[];
  subtasks?: { total: number; completed: number };
}

interface FilterState {
  search: string;
  assignees: number[];
  priorities: string[];
  statuses: number[];
  dueDateFilter: 'all' | 'overdue' | 'today' | 'thisWeek';
  projectIds: number[];
  epicIds: number[];
}

interface ColumnMetrics {
  total: number;
  overdue: number;
  highPriority: number;
}

/** --- Helpers --- */
function initials(name?: string, surname?: string) {
  const a = (name || "").trim();
  const b = (surname || "").trim();
  const i1 = a ? a[0] : "";
  const i2 = b ? b[0] : "";
  return (i1 + i2 || a.slice(0, 2) || "?").toUpperCase();
}

function truncate(s: string | null | undefined, n = 120) {
  if (!s) return "-";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDueDate(dueDate?: string): { text: string; color: string; urgent: boolean } {
  if (!dueDate) return { text: "", color: "#64748b", urgent: false };
  
  const due = new Date(dueDate);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: `${Math.abs(diffDays)}d overdue`, color: "#dc2626", urgent: true };
  if (diffDays === 0) return { text: "Due today", color: "#ea580c", urgent: true };
  if (diffDays === 1) return { text: "Due tomorrow", color: "#d97706", urgent: false };
  if (diffDays <= 7) return { text: `${diffDays}d left`, color: "#059669", urgent: false };
  
  return { text: due.toLocaleDateString(), color: "#64748b", urgent: false };
}


// Enhanced Status Theme with solid colors and Archive
const STATUS_THEME: Record<string, {
  headerBg: string;
  headerText: string;
  columnBg: string;
  border: string;
  accent: string;
  hoverBg: string;
}> = {
  "To Do": {
    headerBg: "#3092B9", // solid blue
    headerText: "#ffffff",
    columnBg: "#F0F9FF",
    border: "#BFDBFE",
    accent: "#3092B9",
    hoverBg: "#E0F2FE",
  },
  "In Progress": {
    headerBg: "#FB923C", // solid orange
    headerText: "#ffffff",
    columnBg: "#FFF7ED",
    border: "#FED7AA",
    accent: "#FB923C",
    hoverBg: "#FFEDD5",
  },
  "Done": {
    headerBg: "#10B981", // solid green
    headerText: "#ffffff",
    columnBg: "#F0FDF4",
    border: "#BBF7D0",
    accent: "#10B981",
    hoverBg: "#ECFDF5",
  },
  "Archive": {
    headerBg: "#94A3B8", // slate-400 neutral
    headerText: "#ffffff",
    columnBg: "#F1F5F9",
    border: "#E2E8F0",
    accent: "#94A3B8",
    hoverBg: "#E2E8F0",
  },
  "Review": {
    headerBg: "#F59E0B",
    headerText: "#111827",
    columnBg: "#FFFBEB",
    border: "#FED7AA",
    accent: "#F59E0B",
    hoverBg: "#FEF3C7",
  },
};

const DEFAULT_STATUS = {
  headerBg: "linear-gradient(135deg, #6b7280 0%, #9ca3af 100%)",
  headerText: "#ffffff",
  columnBg: "#f9fafb",
  border: "#e5e7eb",
  accent: "#6b7280",
  hoverBg: "#f3f4f6",
};

/** Priority Icons (kart görseli için) */
const PRIORITY_ICONS = {
  'Critical': { icon: <ExclamationCircleOutlined />, color: '#dc2626' },
  'High': { icon: <ExclamationCircleOutlined />, color: '#ea580c' },
  'Medium': { icon: <ClockCircleOutlined />, color: '#d97706' },
  'Low': { icon: <ClockCircleOutlined />, color: '#059669' },
};

/** --- Enhanced Draggable Task Card --- */
function DraggableTask({
  task,
  onSelect,
  onAssign,
  onEdit,
  onDelete,
  suppressWarnings,
  justDone,
}: {
  task: TaskWithMetadata;
  onSelect: (id: number, multi: boolean) => void;
  onAssign: (task: TaskWithMetadata) => void;
  onEdit: (task: TaskWithMetadata) => void;
  onDelete: (task: TaskWithMetadata) => void;
  suppressWarnings: boolean;
  justDone?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { taskId: task.id },
  });

  const priorityColor = task.priority?.color || "#64748b";
  const priorityConfig = PRIORITY_ICONS[task.priority?.name as keyof typeof PRIORITY_ICONS];
  const assignees = task.assignedUsers || [];
  const dueInfo = formatDueDate(task.dueDate);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onSelect(task.id, e.ctrlKey || e.metaKey);
  }, [task.id, onSelect]);

const dropdownItems: MenuProps['items'] = [
  {
    key: 'assign',
    label: 'Assign Users',
    icon: <UserOutlined />,
    onClick: () => onAssign(task),
  },
  {
    key: 'edit',
    label: 'Edit Task',
    icon: <EditOutlined />,
    onClick: () => onEdit(task),
  },
  {
    key: 'delete',
    label: 'Delete Task',
    danger: true,
    onClick: () => onDelete(task),
  },
];

  const style: React.CSSProperties = {
    marginBottom: 12,
    cursor: isDragging ? "grabbing" : "grab",
    opacity: isDragging ? 0.5 : 1,
    transform: transform 
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) ${isDragging ? 'rotate(5deg) scale(1.05)' : ''}`
      : undefined,
    transition: isDragging ? 'none' : 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: isDragging
      ? "0 20px 40px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.08)",
    borderLeft: `4px solid ${priorityColor}`,
    borderRadius: 12,
    background: "#ffffff",
    position: 'relative',
  };

  return (
    <Card
      className={`task-card ${justDone ? 'just-done' : ''}`}
      ref={setNodeRef}
      size="small"
      style={style}
      onClick={handleClick}
      {...listeners}
      {...attributes}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Text 
            strong 
            style={{ 
              flex: 1, 
              marginRight: 8,
              color: isOverdue(task.dueDate) ? '#dc2626' : '#1f2937'
            }}
          >
            {task.title}
          </Text>
          <Dropdown 
            menu={{ items: dropdownItems }} 
            trigger={["click"]} 
            placement="bottomRight"
          >
            <Button 
              type="text" 
              size="small" 
              icon={<MoreOutlined />}
              style={{ opacity: 0.8 }}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      }
      extra={
        <Space size={4}>
          {priorityConfig && (
            <Tooltip title={`Priority: ${task.priority?.name}`}>
              <span style={{ color: priorityConfig.color, fontSize: 12 }}>
                {priorityConfig.icon}
              </span>
            </Tooltip>
          )}
          {task.attachments && task.attachments > 0 && (
            <Badge 
              count={task.attachments} 
              size="small"
              style={{ backgroundColor: '#64748b' }}
            >
              <PaperClipOutlined style={{ fontSize: 12, color: '#64748b' }} />
            </Badge>
          )}
        </Space>
      }
    >
      {/* Description */}
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 1.4 }}>
        {truncate(task.description, 100)}
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <Space size={4} wrap>
            {task.tags.slice(0, 3).map((tag) => (
              <Tag key={tag} color="blue">
                {tag}
              </Tag>
            ))}
            {task.tags.length > 3 && (
              <Tag>+{task.tags.length - 3}</Tag>
            )}
          </Space>
        </div>
      )}

      {/* Progress bar for subtasks */}
      {task.subtasks && task.subtasks.total > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>
              Subtasks: {task.subtasks.completed}/{task.subtasks.total}
            </Text>
            <Text style={{ fontSize: 11, color: '#64748b' }}>
              {Math.round((task.subtasks.completed / task.subtasks.total) * 100)}%
            </Text>
          </div>
          <div style={{ 
            height: 4, 
            background: '#e5e7eb', 
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${(task.subtasks.completed / task.subtasks.total) * 100}%`,
              background: 'linear-gradient(90deg, #10b981, #34d399)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Bottom row: Due date and assignees */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Due date */}
        {task.dueDate && !suppressWarnings && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CalendarOutlined style={{ fontSize: 11, color: dueInfo.color }} />
            <Text 
              style={{ 
                fontSize: 11, 
                color: dueInfo.color,
                fontWeight: dueInfo.urgent ? 600 : 400
              }}
            >
              {dueInfo.text}
            </Text>
            {dueInfo.urgent && (
              <span style={{ 
                width: 6, 
                height: 6, 
                borderRadius: '50%', 
                background: dueInfo.color,
                display: 'inline-block',
                marginLeft: 2
              }} />
            )}
          </div>
        )}

        {/* Assignees */}
        <div style={{ marginLeft: 'auto' }}>
          {assignees.length > 0 ? (
            <Avatar.Group 
              maxCount={3} 
              size="small"
              maxStyle={{ 
                color: '#64748b', 
                backgroundColor: '#f1f5f9',
                fontSize: 11
              }}
            >
              {assignees.map((user) => (
                <Tooltip key={user.id} title={`${user.name} ${user.surname || ''}`.trim()}>
                  <Avatar
                    size="small"
                    style={{ 
                      background: `hsl(${user.id * 137.508}deg, 65%, 45%)`,
                      fontSize: 11,
                      border: '1px solid #fff'
                    }}
                  >
                    {initials(user.name, user.surname)}
                  </Avatar>
                </Tooltip>
              ))}
            </Avatar.Group>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>
              Unassigned
            </Text>
          )}
        </div>
      </div>
    </Card>
  );
}

/** --- Enhanced Drag Overlay --- */
function DraggedPreview({ task }: { task: TaskWithMetadata }) {
  const priorityColor = task.priority?.color || "#64748b";
  const assignees = task.assignedUsers || [];
  const dueInfo = formatDueDate(task.dueDate);

  return (
    <Card
      size="small"
      style={{
        width: 300,
        borderLeft: `4px solid ${priorityColor}`,
        borderRadius: 12,
        boxShadow: "0 25px 50px rgba(0,0,0,0.4)",
        cursor: "grabbing",
        background: "#ffffff",
        transform: "rotate(3deg) scale(1.05)",
        opacity: 0.95,
      }}
      title={<Text strong>{task.title}</Text>}
    >
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>
        {truncate(task.description, 80)}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {task.dueDate && (
          <Text style={{ fontSize: 11, color: dueInfo.color }}>
            📅 {dueInfo.text}
          </Text>
        )}
        {assignees.length > 0 && (
          <Avatar.Group maxCount={2} size="small">
            {assignees.slice(0, 2).map((user) => (
              <Avatar
                key={user.id}
                size="small"
                style={{ background: `hsl(${user.id * 137.508}deg, 65%, 45%)` }}
              >
                {initials(user.name, user.surname)}
              </Avatar>
            ))}
          </Avatar.Group>
        )}
      </div>
    </Card>
  );
}

/** --- Enhanced Column with Metrics --- */
function Column({ 
  status, 
  tasks, 
  metrics, 
  isLoading,
  onTaskSelect,
  onTaskEdit,
  onTaskAssign,
  onTaskDelete,
  suppressWarnings,
  recentlyDoneIds,
}: { 
  status: Status; 
  tasks: TaskWithMetadata[];
  metrics: ColumnMetrics;
  isLoading: boolean;
  onTaskSelect: (id: number, multi: boolean) => void;
  onTaskEdit: (task: TaskWithMetadata) => void;
  onTaskAssign: (task: TaskWithMetadata) => void;
  onTaskDelete: (task: TaskWithMetadata) => void;
  suppressWarnings: boolean;
  recentlyDoneIds: Set<number>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: String(status.id) });
  const theme = STATUS_THEME[status.name] || DEFAULT_STATUS;

  return (
    <div ref={setNodeRef} style={{ height: "100%" }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: theme.headerText, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: theme.headerText, fontWeight: 600, fontSize: 16 }}>
                {status.name}
              </Text>
              <Badge 
                count={tasks.length} 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: theme.headerText,
                  fontSize: 12
                }}
              />
            </div>
            {!suppressWarnings && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {metrics.overdue > 0 && (
                  <Tooltip title="Overdue tasks">
                    <Badge 
                      count={metrics.overdue} 
                      style={{ backgroundColor: '#dc2626' }}
                      size="small"
                    />
                  </Tooltip>
                )}
                {metrics.highPriority > 0 && (
                  <Tooltip title="High priority tasks">
                    <ExclamationCircleOutlined style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }} />
                  </Tooltip>
                )}
              </div>
            )}
          </div>
        }
        headStyle={{
          background: theme.headerBg,
          borderRadius: "6px 6px 0 0",
          borderBottom: "none",
          padding: "12px 16px",
        }}
         style={{
          background: isOver ? theme.hoverBg : theme.columnBg,
          border: `2px solid ${isOver ? theme.accent : theme.border}`,
          borderRadius: 6,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: isOver ? "scale(1.02)" : "scale(1)",
          marginBottom: 16
        }}
      bodyStyle={{ padding: 16 }}
      >
        {isLoading ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {[1, 2, 3].map(i => (
              <Skeleton.Button 
                key={i} 
                active 
                size="large" 
                style={{ width: '100%', height: 120 }} 
              />
            ))}
          </Space>
        ) : tasks.length === 0 ? (
          <Empty 
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Text type="secondary" style={{ fontSize: 13 }}>
                No tasks in {status.name.toLowerCase()}
              </Text>
            }
            style={{ marginTop: 40 }}
          />
        ) : (
          tasks.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              onSelect={onTaskSelect}
              onAssign={onTaskAssign}
              onEdit={onTaskEdit}
              onDelete={onTaskDelete}
              suppressWarnings={suppressWarnings}
              justDone={recentlyDoneIds.has(task.id)}
            />
          ))
        )}
      </Card>
    </div>
  );
}

/** --- Advanced Filters Component --- */
function AdvancedFilters({
  filters,
  onChange,
  assignees,
  priorities,
  projects,
  epics,
  onAddTask,
  onReset,
}: {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  assignees: User[];
  priorities: Priority[];
  projects: Project[];
  epics: Epic[];
  onAddTask: () => void;
  onReset: () => void;
}) {
  return (
    <Card 
      size="small" 
      style={{ marginBottom: 20, borderRadius: 12 }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <FilterOutlined style={{ color: '#3b82f6' }} />
            <Text strong>Filters</Text>
          </Space>
          <Space>
            <Button 
              size="small" 
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAddTask}
              style={{ background: "#3092B9", border: "none" }}
            >
              Add Task
            </Button>
            <Button size="small" onClick={onReset}>
              Reset
            </Button>
          </Space>
        </div>
      }
    >
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Search
            placeholder="Search tasks..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            style={{ marginBottom: 8 }}
          />
        </Col>
        
        <Col xs={24} sm={12} md={6}>
          <Select
            mode="multiple"
            placeholder="Filter by assignees"
            value={filters.assignees}
            onChange={(assigneesIds) => onChange({ ...filters, assignees: assigneesIds })}
            style={{ width: '100%', marginBottom: 8 }}
            maxTagCount={2}
          >
            {assignees.map((user) => (
              <Option key={user.id} value={user.id}>
                <Space>
                  <Avatar 
                    size="small" 
                    style={{ background: `hsl(${user.id * 137.508}deg, 65%, 45%)` }}
                  >
                    {initials(user.name, user.surname)}
                  </Avatar>
                  {user.name} {user.surname}
                </Space>
              </Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Select
            mode="multiple"
            placeholder="Filter by priority"
            value={filters.priorities}
            onChange={(prioritiesNames) => onChange({ ...filters, priorities: prioritiesNames })}
            style={{ width: '100%', marginBottom: 8 }}
            maxTagCount={2}
          >
            {priorities.map((p) => (
              <Option key={p.id} value={p.name}>
                <Space>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: p.color || '#64748b'
                    }}
                  />
                  {p.name}
                </Space>
              </Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Filter by due date"
            value={filters.dueDateFilter}
            onChange={(dueDateFilter) => onChange({ ...filters, dueDateFilter })}
            style={{ width: '100%', marginBottom: 8 }}
          >
            <Option value="all">All dates</Option>
            <Option value="overdue">
              <Text type="danger">Overdue</Text>
            </Option>
            <Option value="today">Due today</Option>
            <Option value="thisWeek">Due this week</Option>
          </Select>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Select
            mode="multiple"
            placeholder="Filter by projects"
            value={filters.projectIds}
            onChange={(projectIds) => onChange({ ...filters, projectIds: projectIds.map((id: number | string) => Number(id)) })}
            style={{ width: '100%', marginBottom: 8 }}
            maxTagCount={2}
          >
            {projects.map((p) => (
              <Option key={p.id} value={p.id}>{p.name}</Option>
            ))}
          </Select>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Select
            mode="multiple"
            placeholder="Filter by epics"
            value={filters.epicIds}
            onChange={(epicIds) => onChange({ ...filters, epicIds: epicIds.map((id: number | string) => Number(id)) })}
            style={{ width: '100%', marginBottom: 8 }}
            maxTagCount={2}
          >
            {epics.map((e) => (
              <Option key={e.id} value={e.id}>{e.name}</Option>
            ))}
          </Select>
        </Col>
      </Row>
    </Card>
  );
}

/** --- Network Status Component --- */
function NetworkStatus({ isOnline }: { isOnline: boolean }) {
  if (isOnline) return null;
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      background: '#dc2626',
      color: 'white',
      padding: '8px 16px',
      textAlign: 'center',
      zIndex: 1000,
      fontSize: 14
    }}>
      <WifiOutlined style={{ marginRight: 8 }} />
      You're offline. Changes will sync when connection is restored.
    </div>
  );
}

/** --- Main Enhanced Board Component --- */
export default function EnhancedBoard() {



  
  const qc = useQueryClient();
  const [msg, msgCtx] = message.useMessage();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [editingTask, setEditingTask] = useState<TaskWithMetadata | null>(null);
  const [recentlyDoneIds, setRecentlyDoneIds] = useState<Set<number>>(new Set());
const [assigningTask, setAssigningTask] = useState<TaskWithMetadata | null>(null);
const [assignUserIds, setAssignUserIds] = useState<number[]>([]);
const [deletingTask, setDeletingTask] = useState<TaskWithMetadata | null>(null);

  // WebSocket subscriptions: invalidate task list on any board/task event
  useEffect(() => {
    // Primary topic used by backend for board updates
    const offTasks = wsSubscribe("/topic/tasks", () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    });

    // Optional board-wide topic (kept for forward-compat if backend publishes here)
    const offBoard = wsSubscribe("/topic/board", () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    });

    return () => {
      offTasks?.();
      offBoard?.();
    };
  }, [qc]);

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    assignees: [],
    priorities: [],
    statuses: [],
    dueDateFilter: 'all',
    projectIds: [],
    epicIds: [],
  });
  // Projects for filter
  const { data: projects = [], isLoading: prjLoading, error: projectsError } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: listProjects,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Epics for filter
  const { data: epics = [], isLoading: epcLoading, error: epicsError } = useQuery<Epic[]>({
    queryKey: ["epics"],
    queryFn: listEpics,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Map epicId -> projectId (since TaskListItemResponse doesn't include project)
  const epicToProjectId = useMemo(() => {
    const map: Record<number, number | undefined> = {};
    for (const e of epics as any[]) {
      if (e?.id != null) map[e.id] = e.project?.id;
    }
    return map;
  }, [epics]);

  // Enhanced sensors for better touch/mouse support
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3, // 3px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Statuses
  const { data: statuses = [], isLoading: stLoading, error: statusError } = useQuery<Status[]>({
    queryKey: ["statuses"],
    queryFn: listStatuses,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Users for assignee filter (DB)
  const { data: users = [], isLoading: usLoading, error: usersError } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: listUsers,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Priorities for priority filter (DB)
  const { data: priorities = [], isLoading: prLoading, error: prioritiesError } = useQuery<Priority[]>({
    queryKey: ["priorities"],
    queryFn: listPriorities,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Tasks
const { data: rawTasks = [], isLoading: tkLoading, error: taskError } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: listTasks,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Transform Task[] to TaskWithMetadata[] 
 const transformTasksToMetadata = (tasks: TaskListItemResponse[]): TaskWithMetadata[] => {
  return tasks.map(task => ({
    ...task,
    priority: task.priority
      ? { 
          ...task.priority, 
          color: typeof task.priority.color === "string" && task.priority.color !== null ? task.priority.color : "#64748b",
          level: getPriorityLevel(task.priority.name) 
        }
      : { id: 0, name: "Low", color: "#64748b", level: 1 },
    assignedUsers: (task.assignees ?? []).map((a: UserBrief) => (
      {
        id: a.id,
        name: (a as any).name ?? "",
        surname: (a as any).surname ?? ""
      } as unknown as User
    )),
    attachments: (task as any).attachments ?? 0,
    tags: (task as any).tags ?? [],
    subtasks: (task as any).subtasks,
  }));
};

  const getPriorityLevel = (priorityName: string): number => {
    switch (priorityName) {
      case 'Critical': return 4;
      case 'High': return 3;
      case 'Medium': return 2;
      case 'Low': return 1;
      default: return 0;
    }
  };

  // Transform tasks to include metadata
  const tasks = useMemo(() => transformTasksToMetadata(rawTasks), [rawTasks]);

  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task: TaskWithMetadata) => {
      // Search filter
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase()) &&
          !task.description?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Assignee filter
      if (filters.assignees.length > 0) {
        const taskAssigneeIds = task.assignedUsers?.map((u: User) => u.id) || [];
        if (!filters.assignees.some((id: number) => taskAssigneeIds.includes(id))) {
          return false;
        }
      }

      // Priority filter
      if (filters.priorities.length > 0 && task.priority?.name && 
          !filters.priorities.includes(task.priority.name)) {
        return false;
      }

      // Status filter
   if (filters.statuses.length > 0) {
  const sid = task.status?.id;
  if (!sid || !filters.statuses.includes(Number(sid))) {
    return false;
  }
}

      // Project filter (derive via epic -> project map)
      if (filters.projectIds.length > 0) {
        // Wait for epics to load before applying project filter; otherwise we might wrongly exclude everything
        if (epcLoading) return true;

        const epicId = task.epic?.id;
        const projectId = epicId != null ? epicToProjectId[epicId] : undefined;
        if (!projectId || !filters.projectIds.includes(Number(projectId))) return false;
      }

      // Epic filter
      if (filters.epicIds.length > 0) {
        const taskEpicId = (task as any).epicId ?? (task as any).epic_id ?? (task as any).epic?.id ?? null;
        if (!taskEpicId || !filters.epicIds.includes(Number(taskEpicId))) return false;
      }

      // Due date filter
      if (filters.dueDateFilter !== 'all') {
        const now = new Date();
        const taskDue = task.dueDate ? new Date(task.dueDate) : null;
        
        switch (filters.dueDateFilter) {
          case 'overdue':
            if (!taskDue || taskDue >= now) return false;
            break;
          case 'today': {
            if (!taskDue) return false;
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            if (taskDue < today || taskDue >= tomorrow) return false;
            break;
          }
          case 'thisWeek': {
            if (!taskDue) return false;
            const weekFromNow = new Date();
            weekFromNow.setDate(weekFromNow.getDate() + 7);
            if (taskDue > weekFromNow) return false;
            break;
          }
        }
      }

      return true;
    });
  }, [tasks, filters]);

  // Group filtered tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<number, TaskWithMetadata[]> = {};
    statuses.forEach(status => {
      grouped[status.id] = filteredTasks.filter(task => task.status?.id === status.id);
    });
    return grouped;
  }, [filteredTasks, statuses]);

  // Calculate column metrics
  const columnMetrics = useMemo(() => {
    const metrics: Record<number, ColumnMetrics> = {};
    
    Object.entries(tasksByStatus).forEach(([statusId, statusTasks]) => {
      const overdue = statusTasks.filter(task => isOverdue(task.dueDate)).length;
      const highPriority = statusTasks.filter(task => 
        task.priority?.name === 'Critical' || task.priority?.name === 'High'
      ).length;
      
      metrics[Number(statusId)] = {
        total: statusTasks.length,
        overdue,
        highPriority
      };
    });
    
    return metrics;
  }, [tasksByStatus]);

  // Mutation for updating task status
  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, statusId, version }: { taskId: number; statusId: number; version: number }) =>
      updateTaskStatus(taskId, statusId, version),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      msg.success("Task status updated successfully" , 0.7);
    },
    onError: (error) => {
      console.error("Failed to update task status:", error);
      msg.error("Failed to update task status");
    },
  });

  const assignUsersMutation = useMutation({
    mutationFn: async ({ taskId, userIds, version }: { taskId: number; userIds: number[]; version: number }) => {
      return await assignUsers(taskId, userIds, version);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Users assigned successfully", 0.8);
      setAssigningTask(null);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Failed to assign users");
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: number) => {
      await api.delete(`/api/tasks/${taskId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Task deleted", 0.8);
      setDeletingTask(null);
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || "Failed to delete task");
    },
  });

  // --- Edit Modal Form Instance and Effect ---
  const [editForm] = Form.useForm();

  useEffect(() => {
    if (editingTask) {
      editForm.setFieldsValue({
        title: editingTask.title,
        description: editingTask.description,
        dates: [
          editingTask.startDate ? dayjs(editingTask.startDate) : undefined,
          editingTask.dueDate ? dayjs(editingTask.dueDate) : undefined,
        ],
      });
    } else {
      editForm.resetFields();
    }
  }, [editingTask, editForm]);



const handleOpenAssign = (task: TaskWithMetadata) => {
  setAssigningTask(task);
  const ids = (task.assignedUsers || []).map(u => u.id);
  setAssignUserIds(ids);
};

const handleAssignConfirm = () => {
  if (!assigningTask) return;
  assignUsersMutation.mutate({
    taskId: assigningTask.id,
    userIds: assignUserIds,
    version: assigningTask.version,
  });
};

const handleOpenDelete = (task: TaskWithMetadata) => {
  setDeletingTask(task);
};

const handleDeleteConfirm = () => {
  if (!deletingTask) return;
  deleteTaskMutation.mutate(deletingTask.id);
};

  // Selection handler (no-op)
  const handleTaskSelect = useCallback((_taskId: number, _multi: boolean) => {
    // Selection feature removed
  }, []);

  const handleTaskEdit = useCallback((task: TaskWithMetadata) => {
    setEditingTask(task);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      assignees: [],
      priorities: [],
      statuses: [],
      dueDateFilter: 'all',
      projectIds: [],
      epicIds: [],
    });
  }, []);

  const activeTask = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;
  const isLoading = stLoading || tkLoading || usLoading || prLoading || prjLoading || epcLoading;

  // Error handling
  if (statusError || taskError || usersError || prioritiesError || projectsError || epicsError) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Space direction="vertical" size="large">
          <ExclamationCircleOutlined style={{ fontSize: 48, color: '#dc2626' }} />
          <Title level={3}>Failed to load board data</Title>
          <Text type="secondary">
            {statusError?.message || taskError?.message || usersError?.message || prioritiesError?.message || projectsError?.message || epicsError?.message || 'An unexpected error occurred'}
          </Text>
          <Space>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />}
              onClick={() => {
                qc.invalidateQueries({ queryKey: ["statuses"] });
                qc.invalidateQueries({ queryKey: ["tasks"] });
                qc.invalidateQueries({ queryKey: ["users"] });
                qc.invalidateQueries({ queryKey: ["priorities"] });
                qc.invalidateQueries({ queryKey: ["projects"] });
                qc.invalidateQueries({ queryKey: ["epics"] });
              }}
            >
              Retry
            </Button>
          </Space>
        </Space>
      </div>
    );
  }

  return (
    <>
      {msgCtx}
      <NetworkStatus isOnline={isOnline} />
      
   <PageHeaderJust title="Task Board" />

      <div style={{ padding: 24, minHeight: '100vh', display: 'block' }}>
       {/* Header Banner */}


  
        {/* Filters */}
        <AdvancedFilters
          filters={filters}
          onChange={setFilters}
          assignees={users}
          priorities={priorities}
          projects={projects}
          epics={epics}
          onAddTask={() => { window.location.assign("/tasks/new"); }}
          onReset={resetFilters}
        />

        {/* Board */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={(event: DragStartEvent) => {
              const taskId = event.active.data.current?.taskId;
              setActiveTaskId(taskId);
            }}
            onDragEnd={(event: DragEndEvent) => {
              const { active, over } = event;
              setActiveTaskId(null);

              if (!over) return;

              const taskId = active.data.current?.taskId;
              const newStatusId = Number(over.id);
              const task = tasks.find(t => t.id === taskId);
              
              if (!task || task.status?.id === newStatusId) return;

              // Optimistic update
              const newStatusObj = statuses.find(s => s.id === newStatusId);
             qc.setQueryData<TaskListItemResponse[]>(["tasks"], (oldTasks) => {
                if (!oldTasks) return oldTasks;
                return oldTasks.map(t => 
                  t.id === taskId ? { ...t, status: newStatusObj ?? t.status } : t
                );
              });

              // Trigger Done highlight animation
              if (newStatusObj?.name === 'Done' && taskId) {
                setRecentlyDoneIds(prev => {
                  const next = new Set(prev);
                  next.add(taskId);
                  return next;
                });
                setTimeout(() => {
                  setRecentlyDoneIds(prev => {
                    const next = new Set(prev);
                    next.delete(taskId);
                    return next;
                  });
                }, 1100);
              }

              updateStatusMutation.mutate({ 
  taskId, 
  statusId: newStatusId, 
  version: task.version 
});
            }}
            modifiers={[restrictToWindowEdges]}
          >
            <Row gutter={16}>
              {statuses.map((status) => (
                <Col key={status.id} xs={24} sm={12} lg={6} style={{ marginBottom: 16 }}>
                  <Column
                    status={status}
                    tasks={tasksByStatus[status.id] || []}
                    metrics={columnMetrics[status.id] || { total: 0, overdue: 0, highPriority: 0 }}
                    isLoading={isLoading}
                    onTaskSelect={handleTaskSelect}
                    onTaskEdit={handleTaskEdit}
                    onTaskAssign={handleOpenAssign}
                    onTaskDelete={handleOpenDelete}
                    suppressWarnings={status.name === 'Done' || status.name === 'Archive'}
                    recentlyDoneIds={recentlyDoneIds}
                  />
                </Col>
              ))}
            </Row>

            <DragOverlay>
              {activeTask && <DraggedPreview task={activeTask} />}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Assign Users Modal */}
<Modal
  title={`Assign Users${assigningTask ? ` — #${assigningTask.id}` : ""}`}
  open={!!assigningTask}
  onCancel={() => setAssigningTask(null)}
  onOk={handleAssignConfirm}
  okText={assignUsersMutation.isPending ? "Assigning..." : "Assign"}
  okButtonProps={{ loading: assignUsersMutation.isPending, type: "primary" }}
>
  <Space direction="vertical" style={{ width: "100%" }}>
    <Text type="secondary">Select users to assign to this task.</Text>
    <Select
      mode="multiple"
      value={assignUserIds}
      onChange={(vals) => setAssignUserIds(vals as number[])}
      style={{ width: "100%" }}
      placeholder="Choose users"
      maxTagCount="responsive"
      options={users.map((u: any) => ({
        value: u.id,
        label: (
          <Space>
            <Avatar size="small" style={{ background: `hsl(${u.id * 137.508}deg, 65%, 45%)` }}>
              {((u.name?.[0] || "") + (u.surname?.[0] || "") || "?").toUpperCase()}
            </Avatar>
            {(u.name ?? "").trim()} {(u.surname ?? "").trim()}
          </Space>
        ),
      }))}
    />
  </Space>
</Modal>

{/* Delete Task Modal */}
<Modal
  title="Delete Task"
  open={!!deletingTask}
  onCancel={() => setDeletingTask(null)}
  onOk={handleDeleteConfirm}
  okText={deleteTaskMutation.isPending ? "Deleting..." : "Delete"}
  okButtonProps={{ danger: true, loading: deleteTaskMutation.isPending }}
>
  <Text>
    Are you sure you want to delete task <Text strong>#{deletingTask?.id}</Text>? This action cannot be undone.
  </Text>
</Modal>

        {/* Task Edit Modal */}
        <Modal
          title={null}
          open={!!editingTask}
          onCancel={() => setEditingTask(null)}
          footer={null}
          width="min(1200px, 90vw)"
          style={{ top: 24 }}
          destroyOnClose
          styles={{ body: { padding: 10 } }}
        >
          {editingTask && (
            <div style={{ maxHeight: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}>
              {/* App Bar Header */}
              <div
                style={{
                  padding: "10px 16px",
                  borderBottom: "1px solid #e5e7eb",
                  background: "#ffffff",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                <Text strong style={{ fontSize: 16 }}>Edit Task — #{editingTask.id}</Text>
              </div>

              {/* Scrollable Content */}
              <div style={{ overflow: "auto", padding: 16, paddingRight: 16 }}>
                <TaskEdit
                  inlineMode
                  taskIdOverride={editingTask.id}
                  onClose={() => {
                    setEditingTask(null);
                    qc.invalidateQueries({ queryKey: ["tasks"] });
                  }}
                />
              </div>
            </div>
          )}
        </Modal>
      </div>
    </>
  );
}
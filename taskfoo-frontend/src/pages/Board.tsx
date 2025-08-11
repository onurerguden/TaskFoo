import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  type DragCancelEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
  closestCorners,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Card, Col, Row, Typography, message, Spin, Avatar, Space } from "antd";
import { UserOutlined } from "@ant-design/icons";

import { listStatuses } from "../api/statuses";
import { listTasks, updateTaskStatus } from "../api/tasks";
import type { Task, Status } from "../types";

const { Title, Text } = Typography;

/** --- Helpers --- */
function initials(name?: string, surname?: string) {
  const a = (name || "").trim();
  const b = (surname || "").trim();
  const i1 = a ? a[0] : "";
  const i2 = b ? b[0] : "";
  return (i1 + i2 || a.slice(0, 2) || "?").toUpperCase();
}

function truncate(s?: string, n = 120) {
  if (!s) return "-";
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

// Status başlık renkleri
const STATUS_THEME: Record<
  string,
  { headerBg: string; headerText: string; columnBg: string; border: string }
> = {
  "To Do": {
    headerBg: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
    headerText: "#ffffff",
    columnBg: "#f8fafc",
    border: "#dbeafe",
  },
  "In Progress": {
    headerBg: "linear-gradient(135deg, #0ea5e9 0%, #60a5fa 100%)",
    headerText: "#ffffff",
    columnBg: "#f0f9ff",
    border: "#bae6fd",
  },
  Done: {
    headerBg: "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
    headerText: "#ffffff",
    columnBg: "#f0fdf4",
    border: "#bbf7d0",
  },
};

const DEFAULT_STATUS = {
  headerBg: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
  headerText: "#ffffff",
  columnBg: "#f8fafc",
  border: "#e5e7eb",
};

/** DRAGGABLE TASK CARD (list içi) */
function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
      data: { taskId: task.id },
    });

  const priorityColor = task.priority?.color || "#d1d5db";
  const assignees = (task as any).assignedUsers as
    | Array<{ id: number; name?: string; surname?: string }>
    | undefined;

  const style: React.CSSProperties = {
    marginBottom: 12,
    cursor: "grab",
    opacity: isDragging ? 0.4 : 1, // orijinali şeffaflaştır
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.15)" : "0 1px 3px rgba(0,0,0,0.08)",
    borderLeft: `4px solid ${priorityColor}`,
    borderRadius: 8,
  };

  return (
    <Card
      ref={setNodeRef}
      size="small"
      style={style}
      title={<Text strong>{task.title}</Text>}
      {...listeners}
      {...attributes}
    >
      <div style={{ fontSize: 12, color: "#334155", marginBottom: 8 }}>
        {truncate(task.description, 140)}
      </div>

      {assignees?.length ? (
        <Space size={8} wrap>
          {assignees.map((u) => (
            <Space key={u.id} size={6}>
              <Avatar
                size="small"
                icon={<UserOutlined />}
                style={{ background: "#3b82f6" }}
              >
                {initials(u.name, (u as any).surname)}
              </Avatar>
              <Text style={{ fontSize: 12, color: "#334155" }}>
                {u.name}
                {(u as any).surname ? ` ${(u as any).surname}` : ""}
              </Text>
            </Space>
          ))}
        </Space>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>
          Unassigned
        </Text>
      )}
    </Card>
  );
}

/** OVERLAY (drag sırasında ekranda gezen kopya) */
function DraggedPreview({ task }: { task: Task }) {
  const priorityColor = task.priority?.color || "#d1d5db";
  const assignees = (task as any).assignedUsers as
    | Array<{ id: number; name?: string; surname?: string }>
    | undefined;

  return (
    <Card
      size="small"
      style={{
        width: 280,
        borderLeft: `4px solid ${priorityColor}`,
        borderRadius: 8,
        boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
        cursor: "grabbing",
      }}
      title={<Text strong>{task.title}</Text>}
    >
      <div style={{ fontSize: 12, color: "#334155", marginBottom: 8 }}>
        {truncate(task.description, 100)}
      </div>
      {assignees?.length ? (
        <Space size={8} wrap>
          {assignees.map((u) => (
            <Space key={u.id} size={6}>
              <Avatar size="small" icon={<UserOutlined />} style={{ background: "#3b82f6" }}>
                {initials(u.name, (u as any).surname)}
              </Avatar>
              <Text style={{ fontSize: 12, color: "#334155" }}>
                {u.name}
                {(u as any).surname ? ` ${(u as any).surname}` : ""}
              </Text>
            </Space>
          ))}
        </Space>
      ) : null}
    </Card>
  );
}

/** DROPPABLE COLUMN */
function Column({ status, tasks }: { status: Status; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: String(status.id) });
  const theme = STATUS_THEME[status.name] || DEFAULT_STATUS;

  return (
    <div ref={setNodeRef as any} style={{ height: "100%" }}>
      <Card
        title={
          <div style={{ color: theme.headerText }}>
            <Text style={{ color: theme.headerText, fontWeight: 600 }}>
              {status.name}
            </Text>{" "}
            <span style={{ opacity: 0.9 }}>({tasks.length})</span>
          </div>
        }
        headStyle={{
          background: theme.headerBg,
          borderRadius: "8px 8px 0 0",
          borderBottom: "none",
          padding: "10px 12px",
        }}
        style={{
          background: isOver ? "#eaf2ff" : theme.columnBg,
          border: `1px solid ${theme.border}`,
          borderRadius: 8,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        bodyStyle={{ padding: 12, flex: 1, overflowY: "auto" }}
      >
        {tasks.map((t) => (
          <DraggableTask key={t.id} task={t} />
        ))}
      </Card>
    </div>
  );
}

export default function Board() {
  const qc = useQueryClient();
  const [msg, msgCtx] = message.useMessage();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const { data: statuses = [], isLoading: stLoading } = useQuery<Status[]>({
    queryKey: ["statuses"],
    queryFn: listStatuses,
  });

  const { data: tasks = [], isLoading: tkLoading } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: listTasks,
  });

  // tasks'ı statusId -> Task[] olarak grupla
  const columns = useMemo(() => {
    const map = new Map<number, Task[]>();
    statuses.forEach((s) => map.set(s.id, []));
    tasks.forEach((t) => {
      const sid = t.status?.id;
      if (sid && map.has(sid)) map.get(sid)!.push(t);
    });
    return map; // Map<statusId, Task[]>
  }, [statuses, tasks]);

  const activeTask = useMemo(
    () => (activeTaskId ? tasks.find((t) => t.id === activeTaskId) || null : null),
    [activeTaskId, tasks]
  );

  const mutation = useMutation({
    mutationFn: ({ taskId, toStatusId }: { taskId: number; toStatusId: number }) =>
      updateTaskStatus(taskId, toStatusId),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const prev = (qc.getQueryData<Task[]>(["tasks"]) || []).map((t) => ({ ...t }));

      const next = prev.map((t) => {
        if (t.id !== vars.taskId) return t;
        const toName =
          statuses.find((s) => s.id === vars.toStatusId)?.name ??
          t.status?.name ??
          "";
        return {
          ...t,
          status: {
            ...t.status,
            id: vars.toStatusId,
            name: toName,
          },
        };
      });

      qc.setQueryData(["tasks"], next);
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["tasks"], ctx.prev);
      msg.error("Status güncellenemedi.");
    },
    onSuccess: () => {
      msg.success("Taşındı ✓");
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });

  function handleDragStart(e: DragStartEvent) {
    const taskId = (e.active?.data?.current as any)?.taskId as number | undefined;
    if (taskId) setActiveTaskId(taskId);
  }

  function handleDragEnd(e: DragEndEvent) {
    const taskId = (e.active?.data?.current as any)?.taskId as number | undefined;
    const toStatusId = e.over?.id ? Number(e.over.id) : undefined;

    setActiveTaskId(null);

    if (!taskId || !toStatusId) return;
    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.status?.id === toStatusId) return;

    mutation.mutate({ taskId, toStatusId });
  }

  function handleDragCancel(_e: DragCancelEvent) {
    setActiveTaskId(null);
  }

  const loading = stLoading || tkLoading;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {msgCtx}

      {/* Header — NewTask ile aynı mavi gradient */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          padding: "24px 20px",
          marginBottom: 0,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title
            level={2}
            style={{
              textAlign: "center",
              color: "white",
              margin: 0,
              fontSize: 28,
              fontWeight: 600,
            }}
          >
            📋 Board
          </Title>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
        {loading ? (
          <Spin />
        ) : (
          <DndContext
            collisionDetection={closestCorners}
            modifiers={[restrictToWindowEdges]}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <Row gutter={16} style={{ minHeight: "calc(100vh - 180px)" }}>
              {statuses.map((s) => {
                const list = columns.get(s.id) ?? [];
                return (
                  <Col key={s.id} xs={24} md={12} lg={8} style={{ height: "100%" }}>
                    <Column status={s} tasks={list} />
                  </Col>
                );
              })}
            </Row>

            {/* DragOverlay: kartın özgürce hareket eden kopyası */}
            <DragOverlay adjustScale={false}>
              {activeTask ? <DraggedPreview task={activeTask} /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}
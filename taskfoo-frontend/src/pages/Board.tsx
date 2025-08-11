import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  type DragEndEvent,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Card, Col, Row, Typography, message, Spin } from "antd";

import { listStatuses } from "../api/statuses";
import { listTasks, updateTaskStatus } from "../api/tasks";
import type { Task, Status } from "../types";

const { Title } = Typography;

/** DRAGGABLE TASK CARD */
function DraggableTask({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
      data: { taskId: task.id },
    });

  const style: React.CSSProperties = {
    marginBottom: 8,
    cursor: "grab",
    opacity: isDragging ? 0.6 : 1,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    boxShadow: isDragging ? "0 6px 16px rgba(0,0,0,0.2)" : undefined,
  };

  return (
    <Card
      ref={setNodeRef}
      size="small"
      style={style}
      title={task.title}
      {...listeners}
      {...attributes}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>
        {task.description ?? "-"}
      </div>
    </Card>
  );
}

/** DROPPABLE COLUMN */
function Column({ status, tasks }: { status: Status; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.id });

  return (
    <Card
      title={status.name}
      extra={<span>{tasks.length}</span>}
      style={{
        background: isOver ? "#e6f7ff" : "#fafafa",
        transition: "background 120ms ease",
        minHeight: 120,
      }}
      bodyStyle={{ padding: 8 }}
      ref={setNodeRef as any}
    >
      {tasks.map((t) => (
        <DraggableTask key={t.id} task={t} />
      ))}
    </Card>
  );
}

export default function Board() {
  const qc = useQueryClient();
  const [msg, msgCtx] = message.useMessage();

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

  const mutation = useMutation({
    mutationFn: ({ taskId, toStatusId }: { taskId: number; toStatusId: number }) =>
      updateTaskStatus(taskId, toStatusId),
    onMutate: async (vars) => {
      // optimistic update
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

  function handleDragEnd(e: DragEndEvent) {
    const taskId = (e.active?.data?.current as any)?.taskId as number | undefined;
    const overRaw = e.over?.id;
    const toStatusId =
      typeof overRaw === "number" ? overRaw : overRaw ? Number(String(overRaw)) : undefined;

    if (!taskId || !toStatusId) return;

    const current = tasks.find((t) => t.id === taskId);
    if (!current || current.status?.id === toStatusId) return;

    mutation.mutate({ taskId, toStatusId });
  }

  const loading = stLoading || tkLoading;

  return (
    <>
      {msgCtx}
      <div style={{ marginBottom: 16 }}>
        <Title level={3}>Board</Title>
      </div>

      {loading ? (
        <Spin />
      ) : (
        <DndContext modifiers={[restrictToWindowEdges]} onDragEnd={handleDragEnd}>
          <Row gutter={16}>
            {statuses.map((s) => {
              const list = columns.get(s.id) ?? [];
              return (
                <Col key={s.id} xs={24} md={12} lg={8}>
                  <Column status={s} tasks={list} />
                </Col>
              );
            })}
          </Row>
        </DndContext>
      )}
    </>
  );
}
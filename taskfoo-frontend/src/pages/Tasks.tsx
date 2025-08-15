/* src/pages/Tasks.tsx */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Tag, Avatar, Space, Button, Popconfirm, App } from "antd";
import { DeleteOutlined, UserOutlined } from "@ant-design/icons";
import PageHeader from "../components/PageHeader";

// DTO tabanlı API importları
import { listTasks, type TaskListItemResponse, type UserBrief } from "../api/tasks";

const { Text } = Typography;

// Helpers for compact date/time (null-safe)
function fmtDate(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function fmtTime(d?: string | null) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

// basit renk eşlemesi
const STATUS_COLORS: Record<string, string> = {
  "To Do": "default",
  "In Progress": "processing",
  Done: "success",
};

export default function Tasks() {
  const qc = useQueryClient();
  const { message } = App.useApp();

  // DTO: TaskListItemResponse[]
  const { data = [], isLoading, isError, error } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: listTasks,
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      // silme ucu aynı
      const { default: api } = await import("../api/client");
      await api.delete(`/api/tasks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      message.success("Task deleted");
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message ?? "Delete failed");
    },
  });

  if (isError) {
    return (
      <Alert
        type="error"
        message="Failed to load data"
        description={(error as Error)?.message}
        showIcon
      />
    );
  }

  // Columns — DTO alanları: status{name}, priority{name,color}, epic{name}, assignees[{id,fullName}]
  const columns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 70 },
      { title: "Title", dataIndex: "title", ellipsis: true },
      {
        title: "Status",
        render: (_: any, r: TaskListItemResponse) => (
          <Tag color={STATUS_COLORS[r.status?.name ?? ""] || "blue"}>
            {r.status?.name ?? "-"}
          </Tag>
        ),
        width: 120,
      },
      {
        title: "Priority",
        render: (_: any, r: TaskListItemResponse) => (
          <Space size={6}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: r.priority?.color || "#6b7280",
                display: "inline-block",
              }}
            />
            <Text>{r.priority?.name ?? "-"}</Text>
          </Space>
        ),
        width: 130,
      },
      {
        title: "Epic",
        render: (_: any, r: TaskListItemResponse) => r.epic?.name ?? "-",
        width: 180,
      },
      {
        title: "Assignees",
        render: (_: any, r: TaskListItemResponse) =>
          (r.assignees?.length ?? 0) > 0 ? (
            <Space size={8} wrap>
              {r.assignees!.map((u: UserBrief) => {
                const name = ((u as any).name ?? "").toString().trim();
                const surname = ((u as any).surname ?? "").toString().trim();
                const full = ((u as any).fullName ?? (u as any).fullname ?? "").toString().trim();
                const displayName = [name, surname].filter(Boolean).join(" ") || full || `User ${u.id}`;
                const initials = displayName
                  .split(/\s+/)
                  .filter(Boolean)
                  .map((p: string) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <Space key={u.id} size={4}>
                    <Avatar
                      size="small"
                      style={{
                        background: `hsl(${(u.id as number) * 137.508}deg, 65%, 45%)`,
                        fontSize: 11,
                      }}
                    >
                      {initials || <UserOutlined />}
                    </Avatar>
                    <Text>{displayName}</Text>
                  </Space>
                );
              })}
            </Space>
          ) : (
            "-"
          ),
        width: 260,
      },
      { title: "Start Date", render: (_: any, r: TaskListItemResponse) => fmtDate(r.startDate), width: 110 },
      { title: "Start Time", render: (_: any, r: TaskListItemResponse) => fmtTime(r.startDate), width: 100 },
      { title: "Due Date", render: (_: any, r: TaskListItemResponse) => fmtDate(r.dueDate), width: 110 },
      { title: "Due Time", render: (_: any, r: TaskListItemResponse) => fmtTime(r.dueDate), width: 100 },
      {
        title: "",
        key: "actions",
        fixed: false,
        render: (_: any, r: TaskListItemResponse) => (
          <Popconfirm
            title="Are you sure you want to delete this task?"
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => del.mutate(r.id as number)}
          >
            <Button danger icon={<DeleteOutlined />} size="small">
              Delete
            </Button>
          </Popconfirm>
        ),
        width: 100,
      },
    ],
    [del]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeader title="Tasks" actionText="New Task" to="/tasks/new" />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12 }}>
        <Table<TaskListItemResponse>
          size="middle"
          loading={isLoading}
          rowKey="id"
          dataSource={data}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          columns={columns as any}
        />
      </div>
    </div>
  );
}
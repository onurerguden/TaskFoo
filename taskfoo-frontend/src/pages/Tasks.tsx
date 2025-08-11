/* src/pages/Tasks.tsx */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Tag, Avatar, Space, Button, Popconfirm, App } from "antd";
import { PlusOutlined, DeleteOutlined, UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { Task } from "../types";

const { Text, Title } = Typography;

// Helpers for compact date/time
function fmtDate(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const dd = String(dt.getDate()).padStart(2, "0");
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const yyyy = dt.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
function fmtTime(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  const hh = String(dt.getHours()).padStart(2, "0");
  const mi = String(dt.getMinutes()).padStart(2, "0");
  return `${hh}:${mi}`;
}

const STATUS_COLORS: Record<string, string> = {
  "To Do": "default",
  "In Progress": "processing",
  Done: "success",
};

export default function Tasks() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { message } = App.useApp();

  const { data = [], isLoading, isError, error } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
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

  // Columns tuned to avoid horizontal scroll; page is wider (1400px)
  const columns = useMemo(
    () => [
      { title: "ID", dataIndex: "id", width: 70 },
      { title: "Title", dataIndex: "title", ellipsis: true },
      {
        title: "Status",
        render: (_: any, r: Task) => (
          <Tag color={STATUS_COLORS[r.status?.name ?? ""] || "blue"}>{r.status?.name ?? "-"}</Tag>
        ),
        width: 120,
      },
      {
        title: "Priority",
        render: (_: any, r: Task) => (
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
        title: "Project / Epic",
        render: (_: any, r: Task) =>
          (r as any).project?.name ??
          r.epic?.project?.name ??
          r.epic?.name ??
          "-",
      },
      {
        title: "Assignees",
        render: (_: any, r: Task) =>
          (r as any).assignedUsers?.length ? (
            <Space size={8} wrap>
              {(r as any).assignedUsers.map((u: any) => (
                <Space key={u.id} size={4}>
                  <Avatar size="small" icon={<UserOutlined />} style={{ background: "#3b82f6" }}>
                    {(u.name?.[0] || "") + (u.surname?.[0] || "")}
                  </Avatar>
                  <Text>{u.name}{u.surname ? ` ${u.surname}` : ""}</Text>
                </Space>
              ))}
            </Space>
          ) : (
            "-"
          ),
        width: 200,
      },
      { title: "Start Date", render: (_: any, r: Task) => fmtDate(r.startDate), width: 110 },
      { title: "Start Time", render: (_: any, r: Task) => fmtTime(r.startDate), width: 100 },
      { title: "Due Date", render: (_: any, r: Task) => fmtDate(r.dueDate), width: 110 },
      { title: "Due Time", render: (_: any, r: Task) => fmtTime(r.dueDate), width: 100 },
      {
        title: "",
        key: "actions",
        fixed: false,
        render: (_: any, r: Task) => (
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
      {/* Header — themed gradient */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          padding: "16px 20px",
          marginBottom: 12,
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Title level={3} style={{ color: "white", margin: 0 }}>📄 Tasks</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav("/tasks/new")}
            style={{
              background: "white",
              color: "#1e40af",
              border: "none",
            }}
          >
            New Task
          </Button>
        </div>
      </div>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12 }}>
        <Table<Task>
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
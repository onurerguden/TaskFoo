/* src/pages/Users.tsx */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Avatar, Space, Button, Popconfirm, App, Tag } from "antd";
import { UserOutlined, DeleteOutlined, EyeOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { type TaskListItemResponse, type UserBrief } from "../api/tasks";
import PageHeader from "../components/PageHeader";
// ...


const visibleName = (u: { name?: string; surname?: string; fullName?: string } | undefined) => {
  if (!u) return "";
  const n = (u.name || "").trim();
  const s = (u.surname || "").trim();
  if (n || s) return `${n}${s ? ` ${s}` : ""}`.trim();
  return (u.fullName || "").trim();
};

const initialsFrom = (full: string) => {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const colorForId = (id: number) => `hsl(${(id * 137.508) % 360}deg, 65%, 45%)`;

const { Text } = Typography;

type UserRow = {
  id: number;
  name?: string;
  surname?: string;
  role?: string;
};

export default function Users() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { message } = App.useApp();

  // users
  const { data: users = [], isLoading, isError, error } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => (await api.get<UserRow[]>("/api/users")).data,
  });

  // tasks (assigned count için gerekir)
  const { data: tasks = [] } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<TaskListItemResponse[]>("/api/tasks")).data,
  });

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      message.success("User deleted");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Delete failed"),
  });

  if (isError) {
    return <Alert type="error" message="Failed to load users" description={(error as Error)?.message} showIcon />;
  }

  const columns = useMemo(
    () => [
      {
        title: "User",
        render: (_: any, r: UserRow) => {
          const displayName = visibleName(r);
          const initials = initialsFrom(displayName || `User ${r.id}`);
          return (
            <Space>
              <Avatar style={{ background: colorForId(r.id) }}>{initials}</Avatar>
              <div>
                <Text strong>{displayName || `User ${r.id}`}</Text>
                <div style={{ fontSize: 12, color: "#6b7280" }}>{r.role || "-"}</div>
              </div>
            </Space>
          );
        },
      },
      {
        title: "Assigned Tasks",
        dataIndex: "assigned",
        width: 160,
        render: (_: any, r: UserRow) => {
          const count = tasks.filter((t) => {
            const assigneesA = (t as any).assignees as UserBrief[] | undefined;
            const assigneesB = (t as any).assignedUsers as { id: number }[] | undefined;
            if (assigneesA && Array.isArray(assigneesA)) return assigneesA.some((u) => u.id === r.id);
            if (assigneesB && Array.isArray(assigneesB)) return assigneesB.some((u) => u.id === r.id);
            return false;
          }).length;
          return (
            <Tag color={count > 0 ? "blue" : "default"} style={{ borderRadius: 6 }}>
              {count}
            </Tag>
          );
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 220,
        render: (_: any, r: UserRow) => (
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => nav(`/tasks?assignee=${r.id}`)}>
              View tasks
            </Button>
            <Popconfirm
              title="Delete this user?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => del.mutate(r.id)}
            >
              <Button danger icon={<DeleteOutlined />}>Delete</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [tasks, del, nav]
  );

  return (
    
  <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
    {/* Header */}
    
<PageHeader title="Users" actionText="New User" to="/users/new" />

    <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12 }}>
      <Table<UserRow>
        size="middle"
        loading={isLoading}
        rowKey="id"
        dataSource={users}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        columns={columns as any}
      />
    </div>
  </div>
);
}
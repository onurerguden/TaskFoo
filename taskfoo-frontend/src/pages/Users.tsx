/* src/pages/Users.tsx */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Avatar, Space, Button, Popconfirm, App, Tag } from "antd";
import { UserOutlined, DeleteOutlined, EyeOutlined, PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { Task } from "../types";

const { Title, Text } = Typography;

type UserRow = {
  id: number;
  name: string;
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
  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
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
        render: (_: any, r: UserRow) => (
          <Space>
            <Avatar icon={<UserOutlined />} style={{ background: "#3b82f6" }}>
              {(r.name?.[0] || "") + (r.surname?.[0] || "")}
            </Avatar>
            <div>
              <Text strong>{r.name}{r.surname ? ` ${r.surname}` : ""}</Text>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{r.role || "-"}</div>
            </div>
          </Space>
        ),
      },
      {
        title: "Assigned Tasks",
        dataIndex: "assigned",
        width: 160,
        render: (_: any, r: UserRow) => {
          const count = tasks.filter(t => (t as any).assignedUsers?.some((u: any) => u.id === r.id)).length;
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
      <div
        style={{
          background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
          padding: "16px 20px",
          marginBottom: 12,
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Title level={3} style={{ color: "white", margin: 0 }}>👤 Users</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => nav("/users/new")}
            style={{ background: "white", color: "#1e40af", border: "none" }}
          >
            New User
          </Button>
        </div>
      </div>

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
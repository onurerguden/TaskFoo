/* src/pages/Projects.tsx */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Space, Button, Popconfirm, App, Tag, Progress } from "antd";
import { DeleteOutlined, EyeOutlined, ProjectOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { Task } from "../types";
import PageHeader from "../components/PageHeader";

const { Text } = Typography;

type ProjectRow = {
  id: number;
  name: string;
  description?: string;
};

export default function Projects() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { message } = App.useApp();

  const { data: projects = [], isLoading, isError, error } = useQuery<ProjectRow[]>({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<ProjectRow[]>("/api/projects")).data,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
  });

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      message.success("Project deleted");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Delete failed"),
  });

  if (isError) {
    return <Alert type="error" message="Failed to load projects" description={(error as Error)?.message} showIcon />;
  }

  const columns = useMemo(
    () => [
      {
        title: "Project",
        render: (_: any, r: ProjectRow) => (
          <Space>
            <ProjectOutlined style={{ color: "#1e40af" }} />
            <div>
              <Text strong>{r.name}</Text>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{r.description || "-"}</div>
            </div>
          </Space>
        ),
      },
      {
        title: "Tasks",
        width: 260,
        render: (_: any, r: ProjectRow) => {
          const list = (tasks as Task[]).filter(t => (t as any).project?.id === r.id || t.epic?.project?.id === r.id);
          const total = list.length;
          const td = list.filter(t => t.status?.name === "To Do").length;
          const ip = list.filter(t => t.status?.name === "In Progress").length;
          const dn = list.filter(t => t.status?.name === "Done").length;
          return (
            <Space size={6} wrap>
              <Tag>{total} total</Tag>
              <Tag color="default">{td} To Do</Tag>
              <Tag color="processing">{ip} In Progress</Tag>
              <Tag color="success">{dn} Done</Tag>
            </Space>
          );
        },
      },
      {
        title: "Completion",
        width: 180,
        render: (_: any, r: ProjectRow) => {
          const list = (tasks as Task[]).filter(t => (t as any).project?.id === r.id || t.epic?.project?.id === r.id);
          const total = list.length;
          const done = list.filter(t => t.status?.name === "Done").length;
          const pct = total ? Math.round((done / total) * 100) : 0;
          return <Progress percent={pct} size="small" />;
        },
      },
      {
        title: "Actions",
        key: "actions",
        width: 220,
        render: (_: any, r: ProjectRow) => (
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => nav(`/board?projectId=${r.id}`)}>
              View board
            </Button>
            <Popconfirm
              title="Delete this project?"
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
      <PageHeader title="Projects" actionText="New Project" to="/projects/new" />

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12 }}>
        <Table<ProjectRow>
          size="middle"
          loading={isLoading}
          rowKey="id"
          dataSource={projects}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          columns={columns as any}
        />
      </div>
    </div>
  );
}
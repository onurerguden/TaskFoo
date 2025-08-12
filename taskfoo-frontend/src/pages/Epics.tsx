/* src/pages/Epics.tsx */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Space, Button, Popconfirm, App, Tag } from "antd";
import { DeleteOutlined, EyeOutlined, FlagOutlined, ProjectOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import type { Task } from "../types";
import PageHeader from "../components/PageHeader";

const { Text } = Typography;

type EpicRow = {
  id: number;
  name: string;
  description?: string;
  project?: { id: number; name: string };
};

export default function Epics() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { message } = App.useApp();

  const { data: epics = [], isLoading, isError, error } = useQuery<EpicRow[]>({
    queryKey: ["epics"],
    queryFn: async () => (await api.get<EpicRow[]>("/api/epics")).data,
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
  });

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/epics/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["epics"] });
      message.success("Epic deleted");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Delete failed"),
  });

  if (isError) {
    return <Alert type="error" message="Failed to load epics" description={(error as Error)?.message} showIcon />;
  }

  const columns = useMemo(
    () => [
      {
        title: "Epic",
        render: (_: any, r: EpicRow) => (
          <Space>
            <FlagOutlined style={{ color: "#1e40af" }} />
            <div>
              <Text strong>{r.name}</Text>
              <div style={{ fontSize: 12, color: "#6b7280" }}>{r.description || "-"}</div>
            </div>
          </Space>
        ),
      },
      {
        title: "Project",
        dataIndex: "project",
        width: 220,
        render: (p: any) => (
          <Space>
            <ProjectOutlined style={{ color: "#1e40af" }} />
            <Text>{p?.name ?? "-"}</Text>
          </Space>
        ),
      },
      {
        title: "Tasks",
        width: 200,
        render: (_: any, r: EpicRow) => {
          const list = (tasks as Task[]).filter(t => t.epic?.id === r.id);
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
        title: "Actions",
        key: "actions",
        width: 220,
        render: (_: any, r: EpicRow) => (
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => nav(`/board?epicId=${r.id}`)}>
              View board
            </Button>
            <Popconfirm
              title="Delete this epic?"
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
 
<PageHeader title="Epics" actionText="New Epic" to="/epics/new" />


      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12 }}>
        <Table<EpicRow>
          size="middle"
          loading={isLoading}
          rowKey="id"
          dataSource={epics}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          columns={columns as any}
        />
      </div>
    </div>
  );
}
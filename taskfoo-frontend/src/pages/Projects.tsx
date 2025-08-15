/* src/pages/Projects.tsx */
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Space, Button, Popconfirm, App, Tag, Progress, Avatar, Tooltip } from "antd";
import { DeleteOutlined, EyeOutlined, ProjectOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import { listEpics } from "../api/epics";
import { listUsers } from "../api/users";
import type { Epic, Project, User } from "../types";
import type { TaskListItemResponse, UserBrief } from "../api/tasks";

const { Text } = Typography;

/** Helpers */
function initialsFromName(name?: string, surname?: string) {
  const a = (name || "").trim();
  const b = (surname || "").trim();
  if (!a && !b) return "?";
  if (a && b) return (a[0] + b[0]).toUpperCase();
  const one = (a || b);
  return one.slice(0, 2).toUpperCase();
}
function initialsFrom(fullName?: string) {
  const s = (fullName || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function colorFromId(id: number) {
  return `hsl(${(id * 137.508) % 360}deg, 65%, 45%)`;
}

/** Row type coming from /api/projects */
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

  // tasks now return DTO TaskListItemResponse
  const { data: tasks = [] } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<TaskListItemResponse[]>("/api/tasks")).data,
  });

  // Need epics to map epicId -> projectId (since task list only has epic {id,name})
  const { data: epics = [] } = useQuery<Epic[]>({
    queryKey: ["epics"],
    queryFn: listEpics,
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: listUsers,
  });

  const userMap = useMemo(() => {
    const m = new Map<number, User>();
    for (const u of users as User[]) {
      if (u?.id != null) m.set(u.id, u);
    }
    return m;
  }, [users]);

  const epicToProjectId = useMemo(() => {
    const map: Record<number, number | undefined> = {};
    for (const e of epics as Epic[]) {
      if (e?.id != null) map[e.id] = e.project?.id;
    }
    return map;
  }, [epics]);

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/projects/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      message.success("Project deleted");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Delete failed"),
  });

  if (isError) {
    return (
      <Alert type="error" message="Failed to load projects" description={(error as Error)?.message} showIcon />
    );
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
        width: 320,
        render: (_: any, r: ProjectRow) => {
          const list = (tasks as TaskListItemResponse[]).filter((t) => {
            const epicId = t.epic?.id;
            const pid = epicId != null ? epicToProjectId[epicId] : undefined;
            return pid === r.id;
          });
          const total = list.length;
          const td = list.filter((t) => t.status?.name === "To Do").length;
          const ip = list.filter((t) => t.status?.name === "In Progress").length;
          const rv = list.filter((t) => t.status?.name === "Review").length;
          const dn = list.filter((t) => t.status?.name === "Done").length;
          return (
            <Space size={6} wrap>
              <Tag>{total} total</Tag>
              <Tag>{td} To Do</Tag>
              <Tag color="processing">{ip} In Progress</Tag>
              <Tag color="warning">{rv} Review</Tag>
              <Tag color="success">{dn} Done</Tag>
            </Space>
          );
        },
      },
      {
        title: "Assignees",
        width: 260,
        render: (_: any, r: ProjectRow) => {
          const list = (tasks as TaskListItemResponse[]).filter((t) => {
            const epicId = t.epic?.id;
            const pid = epicId != null ? epicToProjectId[epicId] : undefined;
            return pid === r.id;
          });

          // unique users across tasks
          const uniq = new Map<number, UserBrief>();
          for (const t of list) {
            for (const u of t.assignees || []) {
              if (!uniq.has(u.id)) uniq.set(u.id, u);
            }
          }
          const arr = Array.from(uniq.values());

          if (arr.length === 0) return <span style={{ color: "#6b7280" }}>-</span>;

          return (
            <Avatar.Group maxCount={6} size="small" maxStyle={{ color: "#64748b", backgroundColor: "#f1f5f9" }}>
              {arr.map((u) => {
                const uInfo = userMap.get(u.id);
                const displayName = uInfo ? `${uInfo.name ?? ""} ${uInfo.surname ?? ""}`.trim() : (u.fullName || "Unknown user");
                const initials = uInfo ? initialsFromName(uInfo.name, uInfo.surname) : initialsFrom(u.fullName);
                return (
                  <Tooltip key={u.id} title={displayName}>
                    <Avatar style={{ background: colorFromId(u.id), border: "1px solid #fff", fontSize: 11 }}>
                      {initials}
                    </Avatar>
                  </Tooltip>
                );
              })}
            </Avatar.Group>
          );
        },
      },
      {
        title: "Completion",
        width: 180,
        render: (_: any, r: ProjectRow) => {
          const list = (tasks as TaskListItemResponse[]).filter((t) => {
            const epicId = t.epic?.id;
            const pid = epicId != null ? epicToProjectId[epicId] : undefined;
            return pid === r.id;
          });
          const total = list.length;
          const done = list.filter((t) => t.status?.name === "Done").length;
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
    [tasks, del, nav, epicToProjectId, userMap]
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
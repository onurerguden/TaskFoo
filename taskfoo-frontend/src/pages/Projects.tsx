/* src/pages/Projects.tsx */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Space, Button, Popconfirm, App, Tag, Progress, Avatar, Tooltip, Card, Input, Select, Modal } from "antd";
import { DeleteOutlined, EyeOutlined, ProjectOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import { listEpics } from "../api/epics";
import { listUsers } from "../api/users";
import { listStatuses } from "../api/statuses";
import type { Epic, User } from "../types";
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

type FilterState = {
  search: string;
  statusIds: number[];
  assigneeIds: number[];
};

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

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    statusIds: [],
    assigneeIds: [],
  });

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

  const { data: statuses = [] } = useQuery({ queryKey: ["statuses"], queryFn: listStatuses });

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
    mutationFn: async (id: number) => {
      const res = await api.delete(`/api/projects/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      message.success("Project deleted");
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || "Delete failed";
      console.error("Project delete error:", e);
      message.error(msg);
    },
  });

  const filteredProjects = useMemo(() => {
    return (projects || []).filter((p) => {
      // text search over name + description
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const inName = (p.name || "").toLowerCase().includes(s);
        const inDesc = (p.description || "").toLowerCase().includes(s);
        if (!inName && !inDesc) return false;
      }

      // derive all tasks that belong to this project
      const projectTasks = (tasks as TaskListItemResponse[]).filter((t) => {
        const epicId = t.epic?.id;
        const pid = epicId != null ? epicToProjectId[epicId] : undefined;
        return pid === p.id;
      });

      // status filter: keep projects that have ANY task with selected statuses
      if (filters.statusIds.length) {
        const anyStatus = projectTasks.some((t) => {
          const sid = t.status?.id ? Number(t.status.id) : undefined;
          return !!sid && filters.statusIds.includes(sid);
        });
        if (!anyStatus) return false;
      }

      // assignee filter: keep projects that have ANY task assigned to selected users
      if (filters.assigneeIds.length) {
        const anyAssignee = projectTasks.some((t) => {
          const ids = (t.assignees || []).map((u) => Number((u as any).id));
          return filters.assigneeIds.some((id) => ids.includes(id));
        });
        if (!anyAssignee) return false;
      }

      return true;
    });
  }, [projects, tasks, filters, epicToProjectId]);

  if (isError) {
    return (
      <Alert type="error" message="Failed to load projects" description={(error as Error)?.message} showIcon />
    );
  }

  const columns = useMemo(
    () => [
      {
        title: "Project Name",
        width: 300,
        render: (_: any, r: ProjectRow) => (
          <Space>
            <ProjectOutlined style={{ color: "#1e40af" }} />
            <div>
              <Text strong style={{ display: "block" }}>{r.name}</Text>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  maxWidth: 360,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
                title={r.description || "-"}
              >
                {r.description || "-"}
              </div>
            </div>
          </Space>
        ),
      },
      {
        title: "Tasks",
        width: 300,
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
          const ar = list.filter((t) => t.status?.name === "Archive").length;
          return (
            <Space size={8} wrap>
              <Tag>{total} total</Tag>
              <Tag>{td} To Do</Tag>
              <Tag color="processing">{ip} In Progress</Tag>
              <Tag color="warning">{rv} Review</Tag>
              <Tag color="success">{dn} Done</Tag>
              <Tag color="default">{ar} Archive</Tag>
            </Space>
          );
        },
      },
      {
        title: "Assignees",
        width: 120,
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
        width: 260,
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
        width: 180,
        render: (_: any, r: ProjectRow) => (
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => nav(`/board?projectId=${r.id}`)}>
              View board
            </Button>
            <Popconfirm
              title="Delete this project?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true, loading: del.isPending }}
              cancelText="Cancel"
              onConfirm={() => {
                // Check dependent records before delete to prevent FK 500s
                const projectTasks = (tasks as TaskListItemResponse[]).filter((t) => {
                  const epicId = t.epic?.id;
                  const pid = epicId != null ? epicToProjectId[epicId] : undefined;
                  return pid === r.id;
                });
                const epicsCount = (epics as Epic[]).filter((e) => e.project?.id === r.id).length;

                if (projectTasks.length > 0 || epicsCount > 0) {
                  Modal.warning({
                    title: "Project can't be deleted",
                    content: (
                      <div>
                        This project has
                        {" "}
                        <b>{projectTasks.length}</b> task(s)
                        {epicsCount > 0 ? (
                          <>
                            {" "}and <b>{epicsCount}</b> epic(s)
                          </>
                        ) : null}
                        . Please move/delete or archive them first.
                      </div>
                    ),
                  });
                  return;
                }

                del.mutate(r.id);
              }}
            >
              <Button danger icon={<DeleteOutlined />} disabled={del.isPending}>
                Delete
              </Button>
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

      <div style={{ padding: 12 }}>
        <Card
          size="small"
          style={{ borderRadius: 10, marginBottom: 12 }}
          bodyStyle={{ background: "#f9fafb", borderRadius: 8, padding: 12 }}
          title={<Text strong>Filters</Text>}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap"
            }}
          >
            <Input
              placeholder="Search project name or description…"
              allowClear
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              style={{ width: 280 }}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Task Statuses in Project"
              value={filters.statusIds}
              onChange={(v) => setFilters((f) => ({ ...f, statusIds: v as number[] }))}
              options={statuses.map((s: any) => ({ value: s.id, label: s.name }))}
              maxTagCount="responsive"
              style={{ minWidth: 240 }}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Assignees in Project"
              value={filters.assigneeIds}
              onChange={(v) => setFilters((f) => ({ ...f, assigneeIds: v as number[] }))}
              options={users.map((u: any) => ({ value: u.id, label: `${u.name || ""}${u.surname ? ` ${u.surname}` : ""}`.trim() }))}
              maxTagCount="responsive"
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 260 }}
            />
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Button onClick={() => setFilters({ search: "", statusIds: [], assigneeIds: [] })}>
                Reset
              </Button>
            </div>
          </div>
        </Card>

        <Card
  size="small"
  style={{ borderRadius: 10, overflowX: "auto" }}   // ← eklendi
  bodyStyle={{ padding: 0 }}
  title={<Text strong>Projects</Text>}
  className="projects-card"
>
          <Table<ProjectRow>
            size="small"
            sticky
            loading={isLoading}
            rowKey="id"
            dataSource={filteredProjects}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            columns={columns as any}
            tableLayout="fixed"
            rowClassName={() => "proj-row"}
          />
        </Card>
      </div>
        <style>{`
          /* Make the table background transparent so the group background shows */
          .projects-card .ant-table,
          .projects-card .ant-table-container {
            background: transparent !important;
          }
          .projects-card .ant-table-tbody > tr.proj-row > td {
            background: #ffffff !important;
            border: none;
            border-bottom: 1px solid #e5e7eb; /* thin grey separator like Tasks */
            transition: background 0.2s ease;
          }
          .projects-card .ant-table-tbody > tr.proj-row:last-child > td {
            border-bottom: none;
          }
          /* Header transparent */
          .projects-card .ant-table-thead > tr > th {
            background: transparent !important;
          }
          /* Hover background on rows */
          .projects-card .ant-table-tbody > tr.proj-row:hover > td {
            background: #fafafa !important;
          }
          /* Thin separator above pagination to visually split page controls */
          .projects-card .ant-table-pagination {
            border-top: 1px solid #e5e7eb;
            margin-top: 8px;
            padding-top: 12px;
            background: transparent;
          }
        `}</style>
    </div>
  );
}
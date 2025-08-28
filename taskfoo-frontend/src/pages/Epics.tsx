/* src/pages/Epics.tsx */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Space, Button, Popconfirm, App, Tag, Progress, Avatar, Tooltip, Card, Input, Select, Modal } from "antd";
import { DeleteOutlined, EyeOutlined, ProjectOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import PageHeader from "../components/PageHeader";
import { listUsers } from "../api/users";
import { listStatuses } from "../api/statuses";
import type { User } from "../types";
import type { TaskListItemResponse, UserBrief } from "../api/tasks";

const { Text } = Typography;

/** Helpers (Projects.tsx ile birebir) */
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
  projectIds: number[];
};

/** Epics liste satırı */
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

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    statusIds: [],
    assigneeIds: [],
    projectIds: [],
  });

  // Epics
  const { data: epics = [], isLoading, isError, error } = useQuery<EpicRow[]>({
    queryKey: ["epics"],
    queryFn: async () => (await api.get<EpicRow[]>("/api/epics")).data,
  });

  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: async () => (await api.get("/api/projects")).data });

  // Task DTO listesi
  const { data: tasks = [] } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<TaskListItemResponse[]>("/api/tasks")).data,
  });

  // Users & Statuses
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

  // Silme mutasyonu
  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/api/epics/${id}`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["epics"] });
      message.success("Epic deleted");
    },
    onError: (e: any) => {
      const msg = e?.response?.data?.message || e?.message || "Delete failed";
      console.error("Epic delete error:", e);
      message.error(msg);
    },
  });

  // Filtrelenmiş epics
  const filteredEpics = useMemo(() => {
    return (epics || []).filter((e) => {
      // text search over name + description
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const inName = (e.name || "").toLowerCase().includes(s);
        const inDesc = (e.description || "").toLowerCase().includes(s);
        if (!inName && !inDesc) return false;
      }

      // Bu epic'e ait tüm tasklar
      const epicTasks = (tasks as TaskListItemResponse[]).filter((t) => t.epic?.id === e.id);

      // status filtresi: seçilen statülerden en az birine sahip task var mı
      if (filters.statusIds.length) {
        const anyStatus = epicTasks.some((t) => {
          const sid = t.status?.id ? Number(t.status.id) : undefined;
          return !!sid && filters.statusIds.includes(sid);
        });
        if (!anyStatus) return false;
      }

      // assignee filtresi: seçilen kullanıcılardan en az birine atanmış task var mı
      if (filters.assigneeIds.length) {
        const anyAssignee = epicTasks.some((t) => {
          const ids = (t.assignees || []).map((u) => Number((u as any).id));
          return filters.assigneeIds.some((id) => ids.includes(id));
        });
        if (!anyAssignee) return false;
      }

      if (filters.projectIds.length > 0) {
        if (!filters.projectIds.includes(e.project?.id ?? -1)) return false;
      }

      return true;
    });
  }, [epics, tasks, filters]);

  if (isError) {
    return (
      <Alert type="error" message="Failed to load epics" description={(error as Error)?.message} showIcon />
    );
  }

  const columns = useMemo(
    () => [
      {
        title: "Epic Name",
        width: 340,
        render: (_: any, r: EpicRow) => (
          <Space>
            <ProjectOutlined style={{ color: "#1e40af" }} />
            <div>
              <Text strong style={{ display: "block" }}>{r.name}</Text>
              <div
                style={{
                  fontSize: 12,
                  color: "#6b7280",
                  maxWidth: 420,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis"
                }}
                title={r.description || "-"}
              >
                {r.description || "-"}
              </div>
              {r.project?.name ? (
                <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>
                  In project: <b>{r.project.name}</b>
                </div>
              ) : null}
            </div>
          </Space>
        ),
      },
      {
        title: "Tasks",
        width: 300,
        render: (_: any, r: EpicRow) => {
          const list = (tasks as TaskListItemResponse[]).filter((t) => t.epic?.id === r.id);
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
        render: (_: any, r: EpicRow) => {
          const list = (tasks as TaskListItemResponse[]).filter((t) => t.epic?.id === r.id);

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
        title: "Task Completion",
        width: 260,
        render: (_: any, r: EpicRow) => {
          const list = (tasks as TaskListItemResponse[]).filter((t) => t.epic?.id === r.id);
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
        render: (_: any, r: EpicRow) => (
          <Space>
            <Button icon={<EyeOutlined />} onClick={() => nav(`/board?epicId=${r.id}`)}>
              View board
            </Button>
            <Popconfirm
              title="Delete this epic?"
              description="This action cannot be undone."
              okText="Delete"
              okButtonProps={{ danger: true, loading: del.isPending }}
              cancelText="Cancel"
              onConfirm={() => {
                // Epic altında task var mı kontrol et; varsa sildir(t)me
                const epicTasks = (tasks as TaskListItemResponse[]).filter((t) => t.epic?.id === r.id);
                if (epicTasks.length > 0) {
                  Modal.warning({
                    title: "Epic can't be deleted",
                    content: (
                      <div>
                        This epic has <b>{epicTasks.length}</b> task(s). Please move/delete or archive them first.
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
    [tasks, del, nav, userMap]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeader title="Epics" actionText="New Epic" to="/epics/new" />

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
              placeholder="Search epic name or description…"
              allowClear
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              style={{ width: 280 }}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Task Statuses in Epic"
              value={filters.statusIds}
              onChange={(v) => setFilters((f) => ({ ...f, statusIds: v as number[] }))}
              options={(statuses as any[]).map((s: any) => ({ value: s.id, label: s.name }))}
              maxTagCount="responsive"
              style={{ minWidth: 240 }}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Assignees in Epic"
              value={filters.assigneeIds}
              onChange={(v) => setFilters((f) => ({ ...f, assigneeIds: v as number[] }))}
              options={(users as any[]).map((u: any) => ({ value: u.id, label: `${u.name || ""}${u.surname ? ` ${u.surname}` : ""}`.trim() }))}
              maxTagCount="responsive"
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 260 }}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Projects"
              value={filters.projectIds}
              onChange={(v) => setFilters((f) => ({ ...f, projectIds: v as number[] }))}
              options={(projects as any[]).map((p: any) => ({ value: p.id, label: p.name }))}
              maxTagCount="responsive"
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 240 }}
            />
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Button onClick={() => setFilters({ search: "", statusIds: [], assigneeIds: [], projectIds: [] })}>
                Reset
              </Button>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          style={{ borderRadius: 10, overflowX: "auto" }}
          bodyStyle={{ padding: 0 }}
          title={<Text strong>Epics</Text>}
          className="epics-card"
        >
          <Table<EpicRow>
            size="small"
            sticky
            loading={isLoading}
            rowKey="id"
            dataSource={filteredEpics}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            columns={columns as any}
            tableLayout="fixed"
            rowClassName={() => "epic-row"}
          />
        </Card>
      </div>

      <style>{`
        /* Projects sayfasıyla birebir aynı görsel düzen */
        .epics-card .ant-table,
        .epics-card .ant-table-container {
          background: transparent !important;
        }
        .epics-card .ant-table-tbody > tr.epic-row > td {
          background: #ffffff !important;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          transition: background 0.2s ease;
        }
        .epics-card .ant-table-tbody > tr.epic-row:last-child > td {
          border-bottom: none;
        }
        .epics-card .ant-table-thead > tr > th {
          background: transparent !important;
        }
        .epics-card .ant-table-tbody > tr.epic-row:hover > td {
          background: #fafafa !important;
        }
        .epics-card .ant-table-pagination {
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 12px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
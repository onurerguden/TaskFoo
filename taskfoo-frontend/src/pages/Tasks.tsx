/* src/pages/Tasks.tsx */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Tag, Avatar, Space, Button, Popconfirm, App, Card, Input, Select, Row, Col } from "antd";
import { DeleteOutlined, UserOutlined, SettingOutlined } from "@ant-design/icons";
import PageHeader from "../components/PageHeader";
import { useNavigate } from "react-router-dom";

// DTO tabanlı API importları
import { listTasks, type TaskListItemResponse, type UserBrief } from "../api/tasks";
import { listStatuses } from "../api/statuses";
import { listPriorities } from "../api/priorities";
import { listUsers } from "../api/users";
import { listProjects } from "../api/projects";
import { listEpics } from "../api/epics";

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

type FilterState = {
  search: string;
  statusIds: number[];
  priorityIds: number[];
  assigneeIds: number[];
  projectIds: number[];
  epicIds: number[];
};

export default function Tasks() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const nav = useNavigate();

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    statusIds: [],
    priorityIds: [],
    assigneeIds: [],
    projectIds: [],
    epicIds: [],
  });

  // Option datasets for filters
  const { data: statuses = [] } = useQuery({ queryKey: ["statuses"], queryFn: listStatuses });
  const { data: priorities = [] } = useQuery({ queryKey: ["priorities"], queryFn: listPriorities });
  const { data: users = [] } = useQuery({ queryKey: ["users"], queryFn: listUsers });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const { data: epicsAll = [] } = useQuery({ queryKey: ["epics"], queryFn: listEpics });

  // Filter epics by selected projects (if any)
  const epics = useMemo(() => {
    if (!filters.projectIds.length) return epicsAll;
    return epicsAll.filter((e: any) => filters.projectIds.includes(Number(e?.project?.id)));
  }, [epicsAll, filters.projectIds]);

  const epicToProjectId = useMemo(() => {
    const map: Record<number, number | undefined> = {};
    (epicsAll as any[]).forEach((e: any) => {
      if (e?.id != null) map[e.id] = e?.project?.id;
    });
    return map;
  }, [epicsAll]);

  // DTO: TaskListItemResponse[]
  const { data = [], isLoading, isError, error } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: listTasks,
  });

  const filteredData = useMemo(() => {
    return (data || []).filter((t) => {
      // search over title + description
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const inTitle = (t.title || "").toLowerCase().includes(s);
        const inDesc = (t.description || "").toLowerCase().includes(s);
        if (!inTitle && !inDesc) return false;
      }
      // status
      if (filters.statusIds.length) {
        const sid = t.status?.id ? Number(t.status.id) : undefined;
        if (!sid || !filters.statusIds.includes(sid)) return false;
      }
      // priority
      if (filters.priorityIds.length) {
        const pid = t.priority?.id ? Number(t.priority.id) : undefined;
        if (!pid || !filters.priorityIds.includes(pid)) return false;
      }
      // assignees (any)
      if (filters.assigneeIds.length) {
        const ids = (t.assignees || []).map((u) => Number((u as any).id));
        const hit = filters.assigneeIds.some((id) => ids.includes(id));
        if (!hit) return false;
      }
      // project via epicId -> projectId mapping (tasks don't carry project directly)
      if (filters.projectIds.length) {
        const epicId = (t as any).epic?.id;
        const projId = epicId != null ? epicToProjectId[Number(epicId)] : undefined;
        if (!projId || !filters.projectIds.includes(Number(projId))) return false;
      }
      // epic direct
      if (filters.epicIds.length) {
        const eid = (t as any).epic?.id ?? undefined;
        if (!eid || !filters.epicIds.includes(Number(eid))) return false;
      }
      return true;
    });
  }, [data, filters]);

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
      { title: "ID", dataIndex: "id", width: 70, align: "center" },
      { title: "Title", dataIndex: "title", ellipsis: true, width: 200 },
      {
        title: "Status",
        render: (_: any, r: TaskListItemResponse) => (
          <Tag color={STATUS_COLORS[r.status?.name ?? ""] || "blue"}>
            {r.status?.name ?? "-"}
          </Tag>
        ),
        width: 120,
        align: "center",
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
        width: 140,
        align: "center",
      },
      {
        title: "Epic",
        render: (_: any, r: TaskListItemResponse) => r.epic?.name ?? "-",
        width: 180,
        ellipsis: true,
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
        width: 180,
      },
      { title: "Start Date", render: (_: any, r: TaskListItemResponse) => fmtDate(r.startDate), width: 110, align: "center" },
      { title: "Start Time", render: (_: any, r: TaskListItemResponse) => fmtTime(r.startDate), width: 90, align: "center" },
      { title: "Due Date", render: (_: any, r: TaskListItemResponse) => fmtDate(r.dueDate), width: 110, align: "center" },
      { title: "Due Time", render: (_: any, r: TaskListItemResponse) => fmtTime(r.dueDate), width: 90, align: "center" },
      {
        title: "Action Buttons",
        key: "actions",
        fixed: false,
        render: (_: any, r: TaskListItemResponse) => (
          <div className="action-buttons">
            <Button
              size="large"
              className="task-action-btn edit"
              icon={<SettingOutlined />}
              onClick={() => nav(`/tasks/${r.id}/edit`)}
            >
              Edit Task
            </Button>
            <Popconfirm
              title="Are you sure you want to delete this task?"
              okText="Delete"
              okButtonProps={{ danger: true }}
              cancelText="Cancel"
              onConfirm={() => del.mutate(r.id as number)}
            >
              <Button size="large" className="task-action-btn delete" icon={<DeleteOutlined />}>
                Delete
              </Button>
            </Popconfirm>
          </div>
        ),
        width: 180,
        align: "center",
      },
    ],
    [del]
  );

 return (
  <div
    style={{
      minHeight: "100vh",
      background: "#f8f9fa",
    }}
  >
    <style>{`
      .task-action-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 6px 12px;
        font-size: 14px;
        font-weight: 500;
        border-radius: 4px;
        border: 2px solid;
      }

      .task-action-btn.delete {
        color: white;
        border-color: red;
        background-color: red;
      }

      .task-action-btn.edit {
        color: white;
        border-color: orange;
        background-color: orange;
      }

      .action-buttons {
        display: flex;
        gap: 8px;
        justify-content: center;
      }
      .action-buttons button {
        flex: 1;
        min-width: 90px;
      }
    `}</style>
    <PageHeader title="Tasks" actionText="New Task" to="/tasks/new" />

    <div style={{ padding: 12 }}>
      <Card size="small" style={{ borderRadius: 10, marginBottom: 12 }} title={<Text strong>Filters</Text>}>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search title or description…"
              allowClear
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Status"
              style={{ width: "100%" }}
              value={filters.statusIds}
              onChange={(v) => setFilters((f) => ({ ...f, statusIds: v as number[] }))}
              options={statuses.map((s: any) => ({ value: s.id, label: s.name }))}
              maxTagCount="responsive"
            />
          </Col>
          <Col xs={24} md={4}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Priority"
              style={{ width: "100%" }}
              value={filters.priorityIds}
              onChange={(v) => setFilters((f) => ({ ...f, priorityIds: v as number[] }))}
              options={priorities.map((p: any) => ({ value: p.id, label: p.name }))}
              maxTagCount="responsive"
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Assignees"
              style={{ width: "100%" }}
              value={filters.assigneeIds}
              onChange={(v) => setFilters((f) => ({ ...f, assigneeIds: v as number[] }))}
              options={users.map((u: any) => ({ value: u.id, label: `${u.name || ""}${u.surname ? ` ${u.surname}` : ""}`.trim() }))}
              maxTagCount="responsive"
              showSearch
              optionFilterProp="label"
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Projects"
              style={{ width: "100%" }}
              value={filters.projectIds}
              onChange={(v) => setFilters((f) => ({ ...f, projectIds: v as number[] }))}
              options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
              maxTagCount="responsive"
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              mode="multiple"
              allowClear
              placeholder="Epics"
              style={{ width: "100%" }}
              value={filters.epicIds}
              onChange={(v) => setFilters((f) => ({ ...f, epicIds: v as number[] }))}
              options={epics.map((e: any) => ({ value: e.id, label: e.name }))}
              maxTagCount="responsive"
              disabled={epics.length === 0}
            />
          </Col>
          <Col xs={24} md={6}>
            <Space>
              <Button onClick={() => setFilters({ search: "", statusIds: [], priorityIds: [], assigneeIds: [], projectIds: [], epicIds: [] })}>Reset</Button>
              <Button type="primary" onClick={() => setFilters((f) => ({ ...f }))}>Apply</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        size="small"
        style={{ borderRadius: 10 }}
        bodyStyle={{ padding: 0 }}
        title={<Text strong>Tasks</Text>}
      >
        <Table<TaskListItemResponse>
          size="small"
          sticky
          loading={isLoading}
          rowKey="id"
          dataSource={filteredData}
          pagination={{ pageSize: 12, showSizeChanger: false }}
          columns={columns as any}
          tableLayout="fixed"
          scroll={{ x: 1100 }}
        />
      </Card>
    </div>
  </div>
);
}
/* src/pages/Users.tsx */
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Table, Typography, Alert, Avatar, Space, Button, Popconfirm, App, Tag, Card, Input, Select, Tooltip, Modal, Grid } from "antd";
import { DeleteOutlined, EyeOutlined } from "@ant-design/icons";
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

type FilterState = {
  search: string;
  roles: string[];
  projectIds: number[];
};

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
  const screens = Grid.useBreakpoint();

  const [filters, setFilters] = useState<FilterState>({
    search: "",
    roles: [],
    projectIds: [],
  });

  // users
  const { data: users = [], isLoading, isError, error } = useQuery<UserRow[]>({
    queryKey: ["users"],
    queryFn: async () => (await api.get<UserRow[]>("/api/users")).data,
  });

  // projects & epics (to map user tasks -> project)
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: async () => (await api.get("/api/projects")).data });
  const { data: epics = [] } = useQuery({ queryKey: ["epics"], queryFn: async () => (await api.get("/api/epics")).data });

  // tasks (assigned count için gerekir)
  const { data: tasks = [] } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<TaskListItemResponse[]>("/api/tasks")).data,
  });

  const epicToProjectId = useMemo(() => {
    const map: Record<number, number | undefined> = {};
    for (const e of epics as any[]) {
      if (e?.id != null) map[e.id] = e.project?.id;
    }
    return map;
  }, [epics]);

  const del = useMutation({
    mutationFn: async (id: number) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      message.success("User deleted");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Delete failed"),
  });

  const filteredUsers = useMemo(() => {
    const roleSet = new Set(filters.roles.map((r) => (r || "").toLowerCase()));
    return (users as UserRow[]).filter((u) => {
      // search over full visible name
      if (filters.search) {
        const s = filters.search.toLowerCase();
        const name = visibleName(u).toLowerCase();
        if (!name.includes(s)) return false;
      }
      // role filter
      if (roleSet.size > 0) {
        const role = (u.role || "").toLowerCase();
        if (!role || !roleSet.has(role)) return false;
      }
      // project filter: user must have at least one task in selected projects
      if ((filters.projectIds?.length ?? 0) > 0) {
        const hasInProject = (tasks as TaskListItemResponse[]).some((t) => {
          const assigneesA = (t as any).assignees as UserBrief[] | undefined;
          const assigneesB = (t as any).assignedUsers as { id: number }[] | undefined;
          const isAssigned =
            (assigneesA && assigneesA.some((x) => x.id === u.id)) ||
            (assigneesB && assigneesB.some((x) => x.id === u.id));
          if (!isAssigned) return false;
          const epicId = (t as any).epic?.id as number | undefined;
          const pid = epicId != null ? epicToProjectId[epicId] : undefined;
          return pid != null && filters.projectIds.includes(pid);
        });
        if (!hasInProject) return false;
      }
      return true;
    });
  }, [users, tasks, filters, epicToProjectId]);

  if (isError) {
    return <Alert type="error" message="Failed to load users" description={(error as Error)?.message} showIcon />;
  }

  const roleOptions = useMemo(() => {
    const set = new Set<string>();
    (users as UserRow[]).forEach((u) => {
      if (u.role) set.add(u.role);
    });
    return Array.from(set).map((r) => ({ value: r, label: r }));
  }, [users]);

  const getAssignedCount = (userId: number) => {
    return (tasks as TaskListItemResponse[]).filter((t) => {
      const assigneesA = (t as any).assignees as UserBrief[] | undefined;
      const assigneesB = (t as any).assignedUsers as { id: number }[] | undefined;
      if (assigneesA && Array.isArray(assigneesA)) return assigneesA.some((u) => u.id === userId);
      if (assigneesB && Array.isArray(assigneesB)) return assigneesB.some((u) => u.id === userId);
      return false;
    }).length;
  };

  const columns = useMemo(
  
    () => [
      {
        title: "User Name",
        width: 440,
        render: (_: any, r: UserRow) => {
          const displayName = visibleName(r);
          const initials = initialsFrom(displayName || `User ${r.id}`);
          return (
            <Space>
              <Tooltip title={displayName || `User ${r.id}`}>
                <Avatar style={{ background: colorForId(r.id), border: "1px solid #fff" }}>{initials}</Avatar>
              </Tooltip>
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
        width: 260,
        render: (_: any, r: UserRow) => {
          const count = getAssignedCount(r.id);
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
        width: 160,
        render: (_: any, r: UserRow) => {
          const count = getAssignedCount(r.id);
          const compact = !screens.md;
          return (
            <Space wrap size={8}>
              <Button icon={<EyeOutlined />} size={compact ? "small" : "middle"} onClick={() => nav(`/tasks?assignee=${r.id}`)}>
                {compact ? null : "View tasks"}
              </Button>
              <Popconfirm
                title="Delete this user?"
                okText="Delete"
                okButtonProps={{ danger: true }}
                cancelText="Cancel"
                onConfirm={() => {
                  if (count > 0) {
                    Modal.warning({
                      title: "User can't be deleted",
                      content: (
                        <div>
                          This user is assigned to <b>{count}</b> task(s). Please reassign or delete those tasks first.
                        </div>
                      ),
                    });
                    return;
                  }
                  del.mutate(r.id);
                }}
              >
                <Button danger icon={<DeleteOutlined />} size={compact ? "small" : "middle"} disabled={del.isPending}>
                  {compact ? null : "Delete"}
                </Button>
              </Popconfirm>
            </Space>
          );
        },
      },
    ],
    [tasks, del, nav, screens]
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeader title="Users" actionText="New User" to="/users/new" />

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
              placeholder="Search user…"
              allowClear
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              style={{ width: 280 }}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Roles"
              value={filters.roles}
              onChange={(v) => setFilters((f) => ({ ...f, roles: v as string[] }))}
              options={roleOptions}
              maxTagCount="responsive"
              style={{ minWidth: 220 }}
            />
            <Select
              mode="multiple"
              allowClear
              placeholder="Projects (by assigned tasks)"
              value={filters.projectIds}
              onChange={(v) => setFilters((f) => ({ ...f, projectIds: v as number[] }))}
              options={(projects as any[]).map((p: any) => ({ value: p.id, label: p.name }))}
              maxTagCount="responsive"
              showSearch
              optionFilterProp="label"
              style={{ minWidth: 260 }}
            />
            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Button onClick={() => setFilters({ search: "", roles: [], projectIds: [] })}>
                Reset
              </Button>
            </div>
          </div>
        </Card>

        <Card
          size="small"
          style={{ borderRadius: 10, overflowX: "auto" }}
          bodyStyle={{ padding: 0 }}
          title={<Text strong>Users</Text>}
          className="users-card"
        >
          <Table<UserRow>
            size="small"
            sticky
            loading={isLoading}
            rowKey="id"
            dataSource={filteredUsers}
            pagination={{ pageSize: 10, showSizeChanger: false }}
            columns={columns as any}
            tableLayout="fixed"
            rowClassName={() => "user-row"}
          />
        </Card>
      </div>

      <style>{`
        .users-card .ant-table,
        .users-card .ant-table-container {
          background: transparent !important;
        }
        .users-card .ant-table-tbody > tr.user-row > td {
          background: #ffffff !important;
          border: none;
          border-bottom: 1px solid #e5e7eb;
          transition: background 0.2s ease;
        }
        .users-card .ant-table-tbody > tr.user-row:last-child > td {
          border-bottom: none;
        }
        .users-card .ant-table-thead > tr > th {
          background: transparent !important;
        }
        .users-card .ant-table-tbody > tr.user-row:hover > td {
          background: #fafafa !important;
        }
        .users-card .ant-table-pagination {
          border-top: 1px solid #e5e7eb;
          margin-top: 8px;
          padding-top: 12px;
          background: transparent;
        }
      `}</style>
    </div>
  );
}
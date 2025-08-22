import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  Col,
  Row,
  Table,
  Typography,
  Alert,
  Statistic,
  Tag,
  Progress,
  Tabs,
  List,
  Avatar,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  DashboardOutlined,
  TeamOutlined,
  ProjectOutlined,
} from "@ant-design/icons";
import api from "../api/client";
import type { Task } from "../types";
import PageHeaderJust from "../components/PageHeaderJust";

const { Text } = Typography;

// ---- helpers ----

export default function Dashboard() {
  // Tasks
  const { data: tasks = [], isLoading, isError, error } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
  });


  if (isError) {
    return (
      <div style={{ padding: 24 }}>
        <Alert
          type="error"
          message="Failed to load data"
          description={(error as Error)?.message}
          showIcon
          style={{ borderRadius: 8, border: "1px solid #fecaca" }}
        />
      </div>
    );
  }

  // ---- derived metrics ----
  const total = tasks.length;
  const byStatus = (name: string) => tasks.filter(t => t.status?.name === name).length;
  const byPriority = (name: string) => tasks.filter(t => t.priority?.name === name).length;
  const doneCount = byStatus("Done");
  const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const toDoTasks = tasks.filter(t => t.status?.name === "To Do");
  const inProgressTasks = tasks.filter(t => t.status?.name === "In Progress");

  // Workload by assignee (top 6)
  type Workload = { key: string; userId?: number; name: string; count: number };
  const workloadTop: Workload[] = useMemo(() => {
    const counter = new Map<string, Workload>();
    tasks.forEach(t => {
      const assignees: any[] = (t as any).assignees || (t as any).assignedUsers || [];
      if (!Array.isArray(assignees) || assignees.length === 0) {
        const key = "__unassigned";
        const cur = counter.get(key) || { key, name: "Unassigned", count: 0 };
        cur.count += 1;
        counter.set(key, cur);
      } else {
        assignees.forEach((u: any) => {
          const key = String(u.id ?? u.email ?? u.name ?? Math.random());
          const full = [u.name, u.surname].filter(Boolean).join(" ") || u.email || "(user)";
          const cur = counter.get(key) || { key, userId: u.id, name: full, count: 0 };
          cur.count += 1;
          counter.set(key, cur);
        });
      }
    });
    return Array.from(counter.values()).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [tasks]);

  // Tasks by project (top 8)
  const tasksByProject = useMemo(() => {
    const m = new Map<string, number>();
    tasks.forEach(t => {
      const anyT = t as any;
      const p = anyT.project?.name || anyT.projectName || anyT.projectId || "No Project";
      m.set(p, (m.get(p) || 0) + 1);
    });
    return Array.from(m.entries())
      .map(([name, count]) => ({ key: name, name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [tasks]);

  // Priority × Status matrix
  const STATUSES = ["To Do", "In Progress", "Done"] as const;
  const PRIORITIES = ["High", "Medium", "Low"] as const;
  const matrixData = PRIORITIES.map(p => {
    const row: any = { key: p, priority: p };
    STATUSES.forEach(s => {
      row[s] = tasks.filter(t => t.priority?.name === p && t.status?.name === s).length;
    });
    row.total = STATUSES.reduce((acc, s) => acc + row[s], 0);
    return row;
  });

  // Status & Priority cards
  const statusCards = [
    { title: "Total Tasks", value: total, icon: <DashboardOutlined style={{ color: "#1e40af" }} />, color: "#1e40af", bgColor: "#eff6ff" },
    { title: "To Do", value: byStatus("To Do"), icon: <ClockCircleOutlined style={{ color: "#dc2626" }} />, color: "#dc2626", bgColor: "#fef2f2" },
    { title: "In Progress", value: byStatus("In Progress"), icon: <PlayCircleOutlined style={{ color: "#ea580c" }} />, color: "#ea580c", bgColor: "#fff7ed" },
    { title: "Done", value: byStatus("Done"), icon: <CheckCircleOutlined style={{ color: "#16a34a" }} />, color: "#16a34a", bgColor: "#f0fdf4" },
  ];
  const priorityCards = [
    { title: "High Priority", value: byPriority("High"), icon: <ArrowUpOutlined style={{ color: "#dc2626" }} />, color: "#dc2626", bgColor: "#fef2f2" },
    { title: "Medium Priority", value: byPriority("Medium"), icon: <MinusOutlined style={{ color: "#ea580c" }} />, color: "#ea580c", bgColor: "#fff7ed" },
    { title: "Low Priority", value: byPriority("Low"), icon: <ArrowDownOutlined style={{ color: "#16a34a" }} />, color: "#16a34a", bgColor: "#f0fdf4" },
  ];

  const getStatusTag = (status: string) => {
    const statusConfig = {
      "To Do": { color: "#dc2626", bgColor: "#fef2f2" },
      "In Progress": { color: "#ea580c", bgColor: "#fff7ed" },
      "Done": { color: "#16a34a", bgColor: "#f0fdf4" },
    } as const;
    const config = (statusConfig as any)[status] || { color: "#6b7280", bgColor: "#f9fafb" };
    return (
      <Tag style={{ color: config.color, backgroundColor: config.bgColor, border: `1px solid ${config.color}20`, borderRadius: 4 }}>
        {status}
      </Tag>
    );
  };

  const getPriorityTag = (priority: string) => {
    const priorityConfig = {
      High: { color: "#dc2626", bgColor: "#fef2f2" },
      Medium: { color: "#ea580c", bgColor: "#fff7ed" },
      Low: { color: "#16a34a", bgColor: "#f0fdf4" },
    } as const;
    const config = (priorityConfig as any)[priority] || { color: "#6b7280", bgColor: "#f9fafb" };
    return (
      <Tag style={{ color: config.color, backgroundColor: config.bgColor, border: `1px solid ${config.color}20`, borderRadius: 4 }}>
        {priority}
      </Tag>
    );
  };

  // “Latest 5” – ID’ye göre proxyladık (date olmadığı için)
  const latest = [...tasks].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)).slice(0, 5);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", padding: 0 }}>
      <PageHeaderJust title="Dashboard" />

      <div style={{ padding: 24 }}>
        {/* Status Overview */}
        <Card
          title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}>Task Status Overview</Text>}
          style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
        >
          <Row gutter={[16, 16]}>
            {statusCards.map((card, i) => (
              <Col xs={24} sm={12} lg={6} key={i}>
                <Card loading={isLoading} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: card.bgColor }} bodyStyle={{ padding: 20 }}>
                  <Statistic
                    title={<Text style={{ color: "#6b7280", fontSize: 14 }}>{card.title}</Text>}
                    value={card.value}
                    valueStyle={{ color: card.color, fontSize: 24, fontWeight: 600 }}
                    prefix={card.icon}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={[24, 24]}>
          {/* Priority Distribution */}
          <Col xs={24} lg={8}>
            <Card
              title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}>Priority Distribution</Text>}
              style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
            >
              <Row gutter={[12, 12]}>
                {priorityCards.map((card, index) => (
                  <Col xs={24} key={index}>
                    <Card loading={isLoading} style={{ borderRadius: 6, border: "1px solid #e5e7eb", background: card.bgColor }} bodyStyle={{ padding: 16 }}>
                      <Statistic
                        title={<Text style={{ color: "#6b7280", fontSize: 13 }}>{card.title}</Text>}
                        value={card.value}
                        valueStyle={{ color: card.color, fontSize: 20, fontWeight: 600 }}
                        prefix={card.icon}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          {/* Completion Rate */}
          <Col xs={24} lg={8}>
            <Card
              title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}>Completion Rate</Text>}
              style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
            >
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <Progress type="circle" percent={completionRate} size={120} strokeColor={{ "0%": "#1e40af", "100%": "#3b82f6" }} />
                <div style={{ marginTop: 12 }}>
                  <Text style={{ color: "#6b7280", fontSize: 14 }}>
                    {doneCount} of {total} tasks completed
                  </Text>
                </div>
              </div>
            </Card>
          </Col>

          {/* Workload by Assignee */}
          <Col xs={24} lg={8}>
            <Card
              title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}><TeamOutlined /> Workload by Assignee</Text>}
              style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
            >
              <List
                loading={isLoading}
                itemLayout="horizontal"
                dataSource={workloadTop}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar>{it.name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase()}</Avatar>}
                      title={<Text style={{ color: "#111827" }}>{it.name}</Text>}
                      description={
                        <Progress
                          percent={
                            tasks.length
                              ? Math.round(
                                  (it.count / Math.max(...workloadTop.map(w => w.count))) * 100
                                )
                              : 0
                          }
                          showInfo={false}
                        />
                      }
                    />
                    <div style={{ minWidth: 40, textAlign: "right" }}>
                      <Text>{it.count}</Text>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: 0 }}>
          {/* Priority × Status matrix */}
          <Col xs={24} lg={12}>
            <Card
              title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}>Priority × Status</Text>}
              style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
            >
              <Table
                size="small"
                pagination={false}
                dataSource={matrixData}
                columns={[
                  { title: <Text strong>Priority</Text>, dataIndex: "priority" },
                  ...STATUSES.map(s => ({ title: s, dataIndex: s })),
                  { title: <Text strong>Total</Text>, dataIndex: "total" },
                ]}
              />
            </Card>
          </Col>

          {/* Tasks by Project */}
          <Col xs={24} lg={12}>
            <Card
              title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}><ProjectOutlined /> Tasks by Project</Text>}
              style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
            >
              <Table
                size="small"
                pagination={false}
                dataSource={tasksByProject}
                columns={[
                  { title: "Project", dataIndex: "name" },
                  { title: "Tasks", dataIndex: "count", width: 120 },
                ]}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: 0 }}>
          {/* Quick Filters (no date columns) */}
          <Col xs={24} lg={12}>
            <Card
              title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}>Quick Filters</Text>}
              style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
            >
              <Tabs
                items={[
                  {
                    key: "todo",
                    label: "To Do",
                    children: (
                      <Table<Task>
                        loading={isLoading}
                        rowKey="id"
                        dataSource={toDoTasks.slice(0, 5)}
                        pagination={false}
                        size="small"
                        columns={[
                          { title: "ID", dataIndex: "id", width: 70 },
                          { title: "Title", dataIndex: "title", ellipsis: true },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "inprogress",
                    label: "In Progress",
                    children: (
                      <Table<Task>
                        loading={isLoading}
                        rowKey="id"
                        dataSource={inProgressTasks.slice(0, 5)}
                        pagination={false}
                        size="small"
                        columns={[
                          { title: "ID", dataIndex: "id", width: 70 },
                          { title: "Title", dataIndex: "title", ellipsis: true },
                        ]}
                      />
                    ),
                  },
                  {
                    key: "done",
                    label: "Done",
                    children: (
                      <Table<Task>
                        loading={isLoading}
                        rowKey="id"
                        dataSource={tasks.filter(t => t.status?.name === "Done").slice(0, 5)}
                        pagination={false}
                        size="small"
                        columns={[
                          { title: "ID", dataIndex: "id", width: 70 },
                          { title: "Title", dataIndex: "title", ellipsis: true },
                        ]}
                      />
                    ),
                  },
                ]}
              />
            </Card>
          </Col>

          {/* Latest Tasks (no time columns) */}
          <Col xs={24} lg={12}>
            <Card
              title={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <DashboardOutlined style={{ color: "#1e40af" }} />
                  <Text strong style={{ color: "#1f2937", fontSize: 16 }}>Latest 5 Tasks</Text>
                </div>
              }
              style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
            >
              <Table<Task>
                loading={isLoading}
                rowKey="id"
                dataSource={latest}
                pagination={false}
                size="middle"
                style={{ borderRadius: 6 }}
                columns={[
                  {
                    title: <Text strong style={{ color: "#374151" }}>ID</Text>,
                    dataIndex: "id",
                    width: 70,
                    render: (id) => <Text style={{ color: "#6b7280", fontFamily: "monospace" }}>#{id}</Text>,
                  },
                  {
                    title: <Text strong style={{ color: "#374151" }}>Title</Text>,
                    dataIndex: "title",
                    ellipsis: true,
                    render: (title) => <Text style={{ color: "#1f2937" }}>{title}</Text>,
                  },
                  {
                    title: <Text strong style={{ color: "#374151" }}>Status</Text>,
                    render: (_, r) => r.status?.name ? getStatusTag(r.status.name) : <Text style={{ color: "#9ca3af" }}>-</Text>,
                    width: 130,
                  },
                  {
                    title: <Text strong style={{ color: "#374151" }}>Priority</Text>,
                    render: (_, r) => r.priority?.name ? getPriorityTag(r.priority.name) : <Text style={{ color: "#9ca3af" }}>-</Text>,
                    width: 120,
                  },
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
}
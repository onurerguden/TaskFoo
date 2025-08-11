import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Table, Typography, Alert, Statistic } from "antd";
import api from "../api/client";
import type { Task } from "../types";

const { Text, Title } = Typography;

function fmt(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString() + " " + dt.toLocaleTimeString();
}

export default function Dashboard() {
  const { data = [], isLoading, isError, error } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data,
  });

  if (isError) {
    return (
      <Alert
        type="error"
        message="Veri yüklenemedi"
        description={(error as Error)?.message}
        showIcon
      />
    );
  }

  // basit metrikler
  const total = data.length;
  const byStatus = (name: string) =>
    data.filter(t => t.status?.name === name).length;
  const byPriority = (name: string) =>
    data.filter(t => t.priority?.name === name).length;

  // son 5 (createdAt’e göre)
  const latest = [...data]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <Title level={3} style={{ marginBottom: 16 }}>Overview</Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}><Statistic title="Total Tasks" value={total} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}><Statistic title="To Do" value={byStatus("To Do")} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}><Statistic title="In Progress" value={byStatus("In Progress")} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}><Statistic title="Done" value={byStatus("Done")} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}><Statistic title="High" value={byPriority("High")} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}><Statistic title="Medium" value={byPriority("Medium")} /></Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card loading={isLoading}><Statistic title="Low" value={byPriority("Low")} /></Card>
        </Col>
      </Row>

      <Title level={4} style={{ marginTop: 24 }}>Latest 5 Tasks</Title>
      <Table<Task>
        loading={isLoading}
        rowKey="id"
        dataSource={latest}
        pagination={false}
        size="small"
        columns={[
          { title: "ID", dataIndex: "id", width: 70 },
          { title: "Title", dataIndex: "title", ellipsis: true },
          { title: "Status", render: (_, r) => r.status?.name ?? "-" , width: 130 },
          { title: "Priority", render: (_, r) => r.priority?.name ?? "-" , width: 120 },
          { title: "Created", render: (_, r) => fmt(r.createdAt), width: 200 },
        ]}
      />
    </div>
  );
}
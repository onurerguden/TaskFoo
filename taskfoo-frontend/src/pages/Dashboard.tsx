import { useQuery } from "@tanstack/react-query";
import { Card, Col, Row, Table, Typography, Alert, Statistic, Tag, Progress } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
  DashboardOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import api from "../api/client";
import type { Task } from "../types";
import PageHeaderJust from "../components/PageHeaderJust";

const { Text } = Typography;

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
      <div style={{ padding: "24px" }}>
        <Alert
          type="error"
          message="Failed to load data"
          description={(error as Error)?.message}
          showIcon
          style={{
            borderRadius: "8px",
            border: "1px solid #fecaca"
          }}
        />
      </div>
    );
  }

  // Simple metrics
  const total = data.length;
  const byStatus = (name: string) =>
    data.filter(t => t.status?.name === name).length;
  const byPriority = (name: string) =>
    data.filter(t => t.priority?.name === name).length;

  // Latest 5 (by createdAt)
  const latest = [...data]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Calculate completion percentage
  const doneCount = byStatus("Done");
  const completionRate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const statusCards = [
    {
      title: "Total Tasks",
      value: total,
      icon: <DashboardOutlined style={{ color: "#1e40af" }} />,
      color: "#1e40af",
      bgColor: "#eff6ff"
    },
    {
      title: "To Do",
      value: byStatus("To Do"),
      icon: <ClockCircleOutlined style={{ color: "#dc2626" }} />,
      color: "#dc2626",
      bgColor: "#fef2f2"
    },
    {
      title: "In Progress",
      value: byStatus("In Progress"),
      icon: <PlayCircleOutlined style={{ color: "#ea580c" }} />,
      color: "#ea580c",
      bgColor: "#fff7ed"
    },
    {
      title: "Done",
      value: byStatus("Done"),
      icon: <CheckCircleOutlined style={{ color: "#16a34a" }} />,
      color: "#16a34a",
      bgColor: "#f0fdf4"
    }
  ];

  const priorityCards = [
    {
      title: "High Priority",
      value: byPriority("High"),
      icon: <ArrowUpOutlined style={{ color: "#dc2626" }} />,
      color: "#dc2626",
      bgColor: "#fef2f2"
    },
    {
      title: "Medium Priority",
      value: byPriority("Medium"),
      icon: <MinusOutlined style={{ color: "#ea580c" }} />,
      color: "#ea580c",
      bgColor: "#fff7ed"
    },
    {
      title: "Low Priority",
      value: byPriority("Low"),
      icon: <ArrowDownOutlined style={{ color: "#16a34a" }} />,
      color: "#16a34a",
      bgColor: "#f0fdf4"
    }
  ];

  const getStatusTag = (status: string) => {
    const statusConfig = {
      "To Do": { color: "#dc2626", bgColor: "#fef2f2" },
      "In Progress": { color: "#ea580c", bgColor: "#fff7ed" },
      "Done": { color: "#16a34a", bgColor: "#f0fdf4" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: "#6b7280", bgColor: "#f9fafb" };
    
    return (
      <Tag 
        style={{ 
          color: config.color, 
          backgroundColor: config.bgColor,
          border: `1px solid ${config.color}20`,
          borderRadius: "4px"
        }}
      >
        {status}
      </Tag>
    );
  };

  const getPriorityTag = (priority: string) => {
    const priorityConfig = {
      "High": { color: "#dc2626", bgColor: "#fef2f2" },
      "Medium": { color: "#ea580c", bgColor: "#fff7ed" },
      "Low": { color: "#16a34a", bgColor: "#f0fdf4" }
    };
    const config = priorityConfig[priority as keyof typeof priorityConfig] || { color: "#6b7280", bgColor: "#f9fafb" };
    
    return (
      <Tag 
        style={{ 
          color: config.color, 
          backgroundColor: config.bgColor,
          border: `1px solid ${config.color}20`,
          borderRadius: "4px"
        }}
      >
        {priority}
      </Tag>
    );
  };

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "#f8f9fa",
      padding: "0"
    }}>
      <PageHeaderJust title="Dashboard" />
      {/* Main Content (full-width like Board) */}
      <div style={{
        padding: "24px"
      }}>
        {/* Status Metrics */}
        <Card 
          title={
            <Text strong style={{ color: "#1f2937", fontSize: "16px" }}>
              Task Status Overview
            </Text>
          }
          style={{ 
            marginBottom: "24px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}
          headStyle={{
            background: "#f8f9fa",
            borderBottom: "1px solid #e5e7eb"
          }}
        >
          <Row gutter={[16, 16]}>
            {statusCards.map((card, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card 
                  loading={isLoading}
                  style={{
                    borderRadius: "8px",
                    border: "1px solid #e5e7eb",
                    background: card.bgColor
                  }}
                  bodyStyle={{ padding: "20px" }}
                >
                  <Statistic 
                    title={
                      <Text style={{ color: "#6b7280", fontSize: "14px" }}>
                        {card.title}
                      </Text>
                    } 
                    value={card.value}
                    valueStyle={{ 
                      color: card.color, 
                      fontSize: "24px",
                      fontWeight: 600
                    }}
                    prefix={card.icon}
                  />
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={[24, 24]}>
          {/* Priority Metrics */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Text strong style={{ color: "#1f2937", fontSize: "16px" }}>
                  Priority Distribution
                </Text>
              }
              style={{ 
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
              headStyle={{
                background: "#f8f9fa",
                borderBottom: "1px solid #e5e7eb"
              }}
            >
              <Row gutter={[16, 16]}>
                {priorityCards.map((card, index) => (
                  <Col xs={24} key={index}>
                    <Card 
                      loading={isLoading}
                      style={{
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        background: card.bgColor
                      }}
                      bodyStyle={{ padding: "16px" }}
                    >
                      <Statistic 
                        title={
                          <Text style={{ color: "#6b7280", fontSize: "13px" }}>
                            {card.title}
                          </Text>
                        } 
                        value={card.value}
                        valueStyle={{ 
                          color: card.color, 
                          fontSize: "20px",
                          fontWeight: 600
                        }}
                        prefix={card.icon}
                      />
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </Col>

          {/* Completion Rate */}
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Text strong style={{ color: "#1f2937", fontSize: "16px" }}>
                  Completion Rate
                </Text>
              }
              style={{ 
                borderRadius: "8px",
                border: "1px solid #e5e7eb",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
              }}
              headStyle={{
                background: "#f8f9fa",
                borderBottom: "1px solid #e5e7eb"
              }}
            >
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <Progress 
                  type="circle" 
                  percent={completionRate}
                  size={120}
                  strokeColor={{
                    '0%': '#1e40af',
                    '100%': '#3b82f6',
                  }}
                  format={(percent) => (
                    <span style={{ color: "#1e40af", fontSize: "18px", fontWeight: 600 }}>
                      {percent}%
                    </span>
                  )}
                />
                <div style={{ marginTop: "16px" }}>
                  <Text style={{ color: "#6b7280", fontSize: "14px" }}>
                    {doneCount} of {total} tasks completed
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Latest Tasks */}
        <Card 
          title={
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CalendarOutlined style={{ color: "#1e40af" }} />
              <Text strong style={{ color: "#1f2937", fontSize: "16px" }}>
                Latest 5 Tasks
              </Text>
            </div>
          }
          style={{ 
            marginTop: "24px",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}
          headStyle={{
            background: "#f8f9fa",
            borderBottom: "1px solid #e5e7eb"
          }}
        >
          <Table<Task>
            loading={isLoading}
            rowKey="id"
            dataSource={latest}
            pagination={false}
            size="middle"
            style={{
              borderRadius: "6px"
            }}
            columns={[
              { 
                title: <Text strong style={{ color: "#374151" }}>ID</Text>, 
                dataIndex: "id", 
                width: 70,
                render: (id) => (
                  <Text style={{ color: "#6b7280", fontFamily: "monospace" }}>
                    #{id}
                  </Text>
                )
              },
              { 
                title: <Text strong style={{ color: "#374151" }}>Title</Text>, 
                dataIndex: "title", 
                ellipsis: true,
                render: (title) => (
                  <Text style={{ color: "#1f2937" }}>{title}</Text>
                )
              },
              { 
                title: <Text strong style={{ color: "#374151" }}>Status</Text>, 
                render: (_, r) => r.status?.name ? getStatusTag(r.status.name) : <Text style={{ color: "#9ca3af" }}>-</Text>, 
                width: 130 
              },
              { 
                title: <Text strong style={{ color: "#374151" }}>Priority</Text>, 
                render: (_, r) => r.priority?.name ? getPriorityTag(r.priority.name) : <Text style={{ color: "#9ca3af" }}>-</Text>, 
                width: 120 
              },
              { 
                title: <Text strong style={{ color: "#374151" }}>Created</Text>, 
                render: (_, r) => (
                  <Text style={{ color: "#6b7280", fontSize: "13px" }}>
                    {fmt(r.createdAt)}
                  </Text>
                ), 
                width: 200 
              },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
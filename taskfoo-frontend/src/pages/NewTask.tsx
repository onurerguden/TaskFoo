// src/pages/NewTask.tsx
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Typography,
  Space,
  App,
  Tag,
  Avatar,
  Row,
  Col,
} from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  FlagOutlined,
  ProjectOutlined,
  FileTextOutlined,
  SaveOutlined,
  CloseOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";

import { listStatuses } from "../api/statuses";
import { listPriorities } from "../api/priorities";
import { listEpics } from "../api/epics";
import { listProjects } from "../api/projects";
import { listUsers } from "../api/users";
import { createTask, assignUsers } from "../api/tasks";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type FormValues = {
  title: string;
  description?: string;
  statusId: number;
  priorityId: number;
  projectId?: number;
  epicId?: number;
  dates?: [Dayjs, Dayjs];
  assigneeIds?: number[];
};

export default function NewTask() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { message } = App.useApp();

  const [form] = Form.useForm<FormValues>();

  const { data: statuses = [], isLoading: stL } = useQuery({ queryKey: ["statuses"], queryFn: listStatuses });
  const { data: priorities = [], isLoading: prL } = useQuery({ queryKey: ["priorities"], queryFn: listPriorities });
  const { data: projects = [], isLoading: pjL } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const { data: epicsAll = [], isLoading: epL } = useQuery({ queryKey: ["epics"], queryFn: listEpics });
  const { data: users = [], isLoading: usL } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  const selectedProjectId = Form.useWatch("projectId", form);
  const epics = useMemo(() => {
    if (!selectedProjectId) return epicsAll;
    return epicsAll.filter((e: any) => e.project?.id === selectedProjectId);
  }, [epicsAll, selectedProjectId]);

  const creating = useMutation({
    mutationFn: async (v: FormValues) => {
      const [start, due] = v.dates ?? [];
      const created = await createTask({
        title: v.title,
        description: v.description,
        status: { id: v.statusId },
        priority: { id: v.priorityId },
        epic: v.epicId ? { id: v.epicId } : undefined,
        startDate: start ? start.format("YYYY-MM-DD") : undefined,
        dueDate: due ? due.format("YYYY-MM-DD") : undefined,
      });
      if (v.assigneeIds?.length) {
        await assignUsers(created.id as number, v.assigneeIds);
      }
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      message.success("✅ Task created successfully");
      nav("/tasks");
    },
    onError: (e: any) => {
      message.error(e?.response?.data?.message ?? "Failed to create task");
    },
  });

  const loading = stL || prL || pjL || epL || usL || creating.isPending;

  return (
    <div style={{ 
      minHeight: "100vh",
      background: "#f8f9fa",
      padding: "0"
    }}>
      {/* Header Section */}
      <div style={{ 
        background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
        padding: "32px 24px",
        marginBottom: "0"
      }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <Title 
            level={1} 
            style={{ 
              textAlign: "center",
              color: "white",
              margin: 0,
              fontSize: "28px",
              fontWeight: 600
            }}
          >
            <PlusCircleOutlined style={{ marginRight: "12px" }} />
            Create New Task
          </Title>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        maxWidth: "1200px", 
        margin: "0 auto",
        padding: "24px"
      }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) => creating.mutate(v)}
          disabled={loading}
        >
          <Row gutter={[24, 24]}>
            {/* Left Column */}
            <Col xs={24} lg={16}>
              {/* Basic Information */}
              <Card 
                title={
                  <Space>
                    <FileTextOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937" }}>Basic Information</Text>
                  </Space>
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
                bodyStyle={{ padding: "24px" }}
              >
                <Form.Item
                  name="title"
                  label={<Text strong style={{ color: "#374151" }}>Task Title</Text>}
                  rules={[{ required: true, message: "Task title is required" }, { min: 3, message: "Minimum 3 characters" }]}
                >
                  <Input 
                    placeholder="e.g. Implement User Authentication API" 
                    maxLength={120} 
                    showCount 
                    size="large"
                    style={{
                      borderColor: "#d1d5db",
                      borderRadius: "6px"
                    }}
                  />
                </Form.Item>

                <Form.Item 
                  name="description" 
                  label={<Text strong style={{ color: "#374151" }}>Description</Text>}
                >
                  <Input.TextArea 
                    rows={6} 
                    placeholder="Write detailed description about the task..."
                    style={{
                      borderColor: "#d1d5db",
                      borderRadius: "6px"
                    }}
                  />
                </Form.Item>
              </Card>

              {/* Time and Assignment */}
              <Card 
                title={
                  <Space>
                    <CalendarOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937" }}>Time and Assignment</Text>
                  </Space>
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
                bodyStyle={{ padding: "24px" }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item 
                      name="dates" 
                      label={<Text strong style={{ color: "#374151" }}>Start and Due Date</Text>}
                    >
                      <RangePicker 
                        style={{ 
                          width: "100%",
                          borderColor: "#d1d5db",
                          borderRadius: "6px"
                        }}
                        size="large"
                        placeholder={["Start Date", "Due Date"]}
                        format="DD/MM/YYYY"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item 
                      name="assigneeIds" 
                      label={<Text strong style={{ color: "#374151" }}>Assignees</Text>}
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        placeholder="Select people"
                        loading={usL}
                        size="large"
                        maxTagCount="responsive"
                        style={{
                          borderRadius: "6px"
                        }}
                        options={users.map((u: any) => ({
                          value: u.id,
                          label: (
                            <Space>
                              <Avatar size="small" icon={<UserOutlined />} style={{ background: "#3b82f6" }} />
                              {u.name}
                            </Space>
                          ),
                        }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Right Column */}
            <Col xs={24} lg={8}>
              {/* Status and Priority */}
              <Card 
                title={
                  <Space>
                    <FlagOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937" }}>Status and Priority</Text>
                  </Space>
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
                bodyStyle={{ padding: "24px" }}
              >
                <Form.Item
                  name="statusId"
                  label={<Text strong style={{ color: "#374151" }}>Status</Text>}
                  rules={[{ required: true, message: "Please select status" }]}
                  style={{ marginBottom: "20px" }}
                >
                  <Select
                    showSearch
                    placeholder="Select status"
                    loading={stL}
                    size="large"
                    style={{
                      borderRadius: "6px"
                    }}
                    options={statuses.map((s: any) => ({
                      value: s.id,
                      label: (
                        <Space>
                          <Tag color={s.color || "#3b82f6"}>{s.name}</Tag>
                        </Space>
                      ),
                    }))}
                  />
                </Form.Item>

                <Form.Item
                  name="priorityId"
                  label={<Text strong style={{ color: "#374151" }}>Priority</Text>}
                  rules={[{ required: true, message: "Please select priority" }]}
                >
                  <Select
                    showSearch
                    placeholder="Select priority"
                    loading={prL}
                    size="large"
                    style={{
                      borderRadius: "6px"
                    }}
                    options={priorities.map((p: any) => ({
                      value: p.id,
                      label: (
                        <Space>
                          <div
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              background: p.color || "#6b7280",
                              display: "inline-block",
                            }}
                          />
                          <Text strong style={{ color: "#374151" }}>{p.name}</Text>
                        </Space>
                      ),
                    }))}
                  />
                </Form.Item>
              </Card>

              {/* Project and Epic */}
              <Card 
                title={
                  <Space>
                    <ProjectOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937" }}>Project and Epic</Text>
                  </Space>
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
                bodyStyle={{ padding: "24px" }}
              >
                <Form.Item 
                  name="projectId" 
                  label={<Text strong style={{ color: "#374151" }}>Project</Text>}
                  style={{ marginBottom: "20px" }}
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder="Select project (optional)"
                    loading={pjL}
                    size="large"
                    style={{
                      borderRadius: "6px"
                    }}
                    options={projects.map((p: any) => ({
                      value: p.id,
                      label: (
                        <Space>
                          <ProjectOutlined style={{ color: "#1e40af" }} />
                          {p.name}
                        </Space>
                      ),
                    }))}
                  />
                </Form.Item>

                <Form.Item 
                  name="epicId" 
                  label={<Text strong style={{ color: "#374151" }}>Epic</Text>}
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder={selectedProjectId ? "Select epic" : "Select project first"}
                    loading={epL}
                    disabled={!selectedProjectId}
                    size="large"
                    style={{
                      borderRadius: "6px"
                    }}
                    options={epics.map((e: any) => ({
                      value: e.id,
                      label: e.name,
                    }))}
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          {/* Action Buttons */}
          <Card style={{ 
            marginTop: "24px", 
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            background: "#f8f9fa",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: "12px"
            }}>
              <Button 
                size="large"
                onClick={() => nav(-1)}
                icon={<CloseOutlined />}
                style={{ 
                  minWidth: "120px",
                  borderColor: "#d1d5db",
                  color: "#374151",
                  borderRadius: "6px"
                }}
              >
                Cancel
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={creating.isPending}
                size="large"
                icon={<SaveOutlined />}
                style={{
                  minWidth: "120px",
                  background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                  border: "none",
                  borderRadius: "6px",
                  boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)"
                }}
              >
                Save
              </Button>
            </div>
          </Card>
        </Form>
      </div>
    </div>
  );
}
// src/pages/NewTask.tsx
import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageHeaderIcon from "../components/PageHeaderIcon";
import {
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Card,
  Typography,
  Space,
  Tag,
  Avatar,
  Row,
  Col,
  Modal,
  Divider,
  message as antdMessage,
} from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  FlagOutlined,
  ProjectOutlined,
  FileTextOutlined,
  SaveOutlined,
  CloseOutlined,
  CheckOutlined,
  CheckCircleTwoTone,
} from "@ant-design/icons";
import { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { listStatuses } from "../api/statuses";
import { listPriorities } from "../api/priorities";
import { listEpics } from "../api/epics";
import { listProjects } from "../api/projects";
import { listUsers } from "../api/users";
import { createTask, type CreateTaskRequest } from "../api/tasks";

const { Text } = Typography;
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
  const [form] = Form.useForm<FormValues>();
  const message = antdMessage; // use global message API to ensure popups even without <App> provider
  const [done, setDone] = useState(false);
  const hasNavigatedRef = useRef(false);
  const submittedRef = useRef(false);

  const [resultOpen, setResultOpen] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [createdTask, setCreatedTask] = useState<{ 
    id?: number; 
    title: string; 
    description?: string; 
    statusName?: string;
    priorityName?: string;
    projectName?: string;
    epicName?: string;
    startDate?: string;
    dueDate?: string;
    assigneeNames?: string[];
  } | null>(null);

  const { data: statuses = [], isLoading: stL } = useQuery({
    queryKey: ["statuses"],
    queryFn: listStatuses
  });

  const { data: priorities = [], isLoading: prL } = useQuery({
    queryKey: ["priorities"],
    queryFn: listPriorities
  });

  const { data: projects = [], isLoading: pjL } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects
  });

  const { data: epicsAll = [], isLoading: epL } = useQuery({
    queryKey: ["epics"],
    queryFn: listEpics
  });

  const { data: users = [], isLoading: usL } = useQuery({
    queryKey: ["users"],
    queryFn: listUsers
  });

  const selectedProjectId = Form.useWatch("projectId", form);

  const epics = useMemo(() => {
    if (!selectedProjectId) return epicsAll;
    return epicsAll.filter((e: any) => e.project?.id === selectedProjectId);
  }, [epicsAll, selectedProjectId]);

  const creating = useMutation({
    mutationFn: async (v: FormValues) => {
      const [start, due] = v.dates ?? [];
      // Backend startDate ve dueDate zorunlu kılıyor, default değerler veriyoruz
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // DTO formatında request oluştur
      const requestData: CreateTaskRequest = {
        title: v.title.trim(),
        description: v.description?.trim() || undefined,
        statusId: v.statusId,
        priorityId: v.priorityId,
        epicId: v.epicId || undefined,
        startDate: start ? start.format("YYYY-MM-DD") : today,
        dueDate: due ? due.format("YYYY-MM-DD") : today,
        assigneeIds: v.assigneeIds && v.assigneeIds.length > 0 ? v.assigneeIds : undefined,
      };
      console.log("Creating task with data:", requestData);
      return await createTask(requestData);
    },
    retry: false,
    onMutate: async () => {
      message.open({ type: "loading", content: "Creating task...", key: "createTask", duration: 0 });
    },
    onSuccess: async (data: any) => {
      // Cache'i güncelle
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      // Custom event dispatch et (Board.tsx'teki listener için)
      window.dispatchEvent(new CustomEvent("taskfoo:task-event", {
        detail: { type: "created", taskId: data.id }
      }));

      message.open({ type: "success", content: "Task created", key: "createTask", duration: 0.6 });
      setDone(true);

      // Get related names for display
      const selectedStatus = statuses.find(s => s.id === form.getFieldValue("statusId"));
      const selectedPriority = priorities.find((p: any) => p.id === form.getFieldValue("priorityId"));
      const selectedProject = projects.find((p: { id: number }) => p.id === form.getFieldValue("projectId"));
      const selectedEpic = epics.find((e: any) => e.id === form.getFieldValue("epicId"));
      const selectedAssigneeIds = form.getFieldValue("assigneeIds") || [];
      const assigneeNames = selectedAssigneeIds.map((id: number) => {
        const user = users.find(u => u.id === id);
        return user ? `${user.name}${user.surname ? ` ${user.surname}` : ''}` : 'Unknown User';
      });

      setCreatedTask({
        ...data,
        statusName: selectedStatus?.name || "Unknown Status",
        priorityName: selectedPriority?.name || "Unknown Priority",
        projectName: selectedProject?.name,
        epicName: selectedEpic?.name,
        assigneeNames: assigneeNames.length > 0 ? assigneeNames : undefined,
      });
      setCountdown(8);
      setResultOpen(true);
    },
    onError: (error: any) => {
      console.error("Task creation failed:", error);
      console.error("Error response:", error?.response?.data);
      console.error("Error status:", error?.response?.status);
      
      // Backend'den gelen detaylı hata mesajı
      let errorMessage = "Failed to create task. Please try again.";
      if (error?.response?.data) {
        const data = error.response.data;
        if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMessage = data.errors.join(", ");
        } else if (typeof data === 'string') {
          errorMessage = data;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      message.open({
        type: "error",
        content: errorMessage,
        key: "createTask",
        duration: 2.5,
      });
      submittedRef.current = false; // allow retry after error
    },
    onSettled: () => {
      // mutation finished; button spinner handled by isPending
    },
  });

  const loading = stL || prL || pjL || epL || usL || creating.isPending;

  const onFinishFailed = () => {
    message.warning("Please fill the required fields");
  };

  // Form validation
  const validateForm = () => {
    return form.validateFields().catch(() => {
      message.warning("Please fill in all required fields correctly.");
      return Promise.reject();
    });
  };

  const handleFinish = async (v: FormValues) => {
    if (creating.isPending || submittedRef.current) return; // ignore rapid double-clicks
    submittedRef.current = true;
    try {
      await validateForm();
      await creating.mutateAsync(v);
    } catch {
      // onError will reset submittedRef
    }
  };

  const handleContinueCreate = () => {
    setResultOpen(false);
    setDone(false);
    setCreatedTask(null);
    setTimeout(() => setCountdown(8), 0);
    hasNavigatedRef.current = false;
    submittedRef.current = false;
    form.resetFields();
    // Focus first field for faster entry
    setTimeout(() => {
      const first = document.querySelector<HTMLInputElement>('input[name="title"]');
      first?.focus();
    }, 0);
  };

  const handleGoTasks = () => {
    setResultOpen(false);
    nav("/tasks", { replace: true });
  };

  // Auto-redirect countdown when modal is open
  useEffect(() => {
    if (!resultOpen) return;
    setCountdown(8);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          handleGoTasks();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resultOpen]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f9fa",
      padding: "0"
    }}>
      <PageHeaderIcon title="Create New Task" />
      
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "24px"
      }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
          onFinishFailed={onFinishFailed}
          disabled={loading}
          validateTrigger={["onBlur", "onChange"]}
          scrollToFirstError
        >
          <Row gutter={[24, 24]}>
            {/* Left Column */}
            <Col xs={24} lg={16}>
              {/* Basic Information */}
              <Card
                title={
                  <Space>
                    <FileTextOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Basic Information</Text>
                  </Space>
                }
                style={{
                  marginBottom: "24px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
                styles={{
                  header: {
                    background: "#f8f9fa",
                    borderBottom: "1px solid #e5e7eb"
                  },
                  body: { padding: "24px" }
                }}
              >
                <Form.Item
                  name="title"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Task Title *</Text>}
                  rules={[
                    { required: true, message: "Task title is required" },
                    { min: 3, message: "Title must be at least 3 characters" },
                    { max: 120, message: "Title cannot exceed 120 characters" },
                    { whitespace: true, message: "Title cannot be empty" }
                  ]}
                  hasFeedback
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
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Description</Text>}
                  rules={[
                    { max: 2000, message: "Description cannot exceed 2000 characters" }
                  ]}
                >
                  <Input.TextArea
                    rows={6}
                    placeholder="Write detailed description about the task..."
                    maxLength={2000}
                    showCount
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
                    <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Time and Assignment</Text>
                  </Space>
                }
                style={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
                styles={{
                  header: {
                    background: "#f8f9fa",
                    borderBottom: "1px solid #e5e7eb"
                  },
                  body: { padding: "24px" }
                }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="dates"
                      label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Start and Due Date *</Text>}
                      rules={[
                        { required: true, message: "Please select start and due dates" }
                      ]}
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
                      label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Assignees</Text>}
                    >
                      <Select
                        mode="multiple"
                        allowClear
                        showSearch
                        placeholder="Select people"
                        loading={usL}
                        size="large"
                        maxTagCount="responsive"
                        filterOption={(input, option) => {
                          if (!option || !input) return true;
                          const searchText = typeof option.label === 'string'
                            ? option.label
                            : (option as any).children || '';
                          return searchText.toLowerCase().includes(input.toLowerCase());
                        }}
                        style={{
                          borderRadius: "6px"
                        }}
                        options={users.map((u: any) => ({
                          value: u.id,
                          label: (
                            <Space>
                              <Avatar
                                size="small"
                                icon={<UserOutlined />}
                                style={{
                                  background: `hsl(${u.id * 137.508}deg, 65%, 45%)`,
                                  fontSize: 11
                                }}
                              />
                              {(u.name ?? "").trim() + (u.surname ? ` ${u.surname}` : "")}
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
                    <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Status and Priority</Text>
                  </Space>
                }
                style={{
                  marginBottom: "24px",
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
                styles={{
                  header: {
                    background: "#f8f9fa",
                    borderBottom: "1px solid #e5e7eb"
                  },
                  body: { padding: "24px" }
                }}
              >
                <Form.Item
                  name="statusId"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Status *</Text>}
                  rules={[{ required: true, message: "Please select a status" }]}
                  style={{ marginBottom: "20px" }}
                  hasFeedback
                >
                  <Select
                    showSearch
                    placeholder="Select status"
                    loading={stL}
                    size="large"
                    filterOption={(input, option) => {
                      if (!option || !input) return true;
                      const searchText = typeof option.label === 'string'
                        ? option.label
                        : option.value?.toString() || '';
                      return searchText.toLowerCase().includes(input.toLowerCase());
                    }}
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
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Priority *</Text>}
                  rules={[{ required: true, message: "Please select a priority" }]}
                  hasFeedback
                >
                  <Select
                    showSearch
                    placeholder="Select priority"
                    loading={prL}
                    size="large"
                    filterOption={(input, option) => {
                      if (!option || !input) return true;
                      const searchText = typeof option.label === 'string'
                        ? option.label
                        : option.value?.toString() || '';
                      return searchText.toLowerCase().includes(input.toLowerCase());
                    }}
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
                    <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Project and Epic</Text>
                  </Space>
                }
                style={{
                  borderRadius: "8px",
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }}
                styles={{
                  header: {
                    background: "#f8f9fa",
                    borderBottom: "1px solid #e5e7eb"
                  },
                  body: { padding: "24px" }
                }}
              >
                <Form.Item
                  name="projectId"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Project</Text>}
                  style={{ marginBottom: "20px" }}
                >
                  <Select
                    allowClear
                    showSearch
                    placeholder="Select project (optional)"
                    loading={pjL}
                    size="large"
                    filterOption={(input, option) => {
                      if (!option || !input) return true;
                      const searchText = typeof option.label === 'string'
                        ? option.label
                        : option.value?.toString() || '';
                      return searchText.toLowerCase().includes(input.toLowerCase());
                    }}
                    style={{
                      borderRadius: "6px"
                    }}
                    onChange={() => {
                      // Clear epic when project changes
                      form.setFieldValue("epicId", undefined);
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
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Epic</Text>}
                >
                  <Select
                    showSearch
                    placeholder={selectedProjectId ? "Select epic (optional)" : "Select project first"}
                    loading={epL}
                    disabled={!selectedProjectId || epL}
                    allowClear={selectedProjectId ? true : false}
                    size="large"
                    filterOption={(input, option) => {
                      if (!option || !input) return true;
                      const searchText = typeof option.label === 'string'
                        ? option.label
                        : option.value?.toString() || '';
                      return searchText.toLowerCase().includes(input.toLowerCase());
                    }}
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
          }} styles={{ body: { padding: 16 } }}>
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px"
            }}>
              <Button
                size="large"
                onClick={() => nav(-1)}
                icon={<CloseOutlined />}
                disabled={creating.isPending}
                style={{
                  minWidth: "140px",
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
                icon={done ? <CheckOutlined /> : <SaveOutlined />}
                aria-busy={creating.isPending}
                aria-live="polite"
                style={{
                  minWidth: "160px",
                  background: done
                    ? "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
                    : "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                  border: "none",
                  borderRadius: "6px",
                  boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
                  transition: "transform 80ms ease",
                }}
              >
                {creating.isPending ? "Creating..." : done ? "Saved!" : "Create Task"}
              </Button>
            </div>
          </Card>
        </Form>
      </div>

      <Modal
        open={resultOpen}
        closable={false}
        maskClosable={false}
        onCancel={handleContinueCreate}
        title={<Space><CheckCircleTwoTone twoToneColor="#52c41a" /><Text strong style={{ fontSize: 18 }}>Task created successfully</Text></Space>}
        footer={[
          <Button key="continue" onClick={handleContinueCreate}>
            Continue Creating Task
          </Button>,
          <Button key="tasks" type="primary" onClick={handleGoTasks}>
            Go to Tasks ({countdown}s)
          </Button>,
        ]}
        styles={{ body: { fontSize: 16, lineHeight: 1.8 } }}
      >
        <Text type="secondary">The following task has been added successfully:</Text>
        <Divider style={{ margin: "12px 0" }} />
        <div style={{ lineHeight: 1.9 }}>
          <div><Text strong>Title:</Text> <Text style={{ fontSize: 16 }}>{createdTask?.title ?? form.getFieldValue("title")}</Text></div>
          { (createdTask?.description || form.getFieldValue("description")) && (
            <div><Text strong>Description:</Text> <Text style={{ fontSize: 16 }}>{createdTask?.description ?? form.getFieldValue("description")}</Text></div>
          )}
          <div><Text strong>Status:</Text> <Text style={{ fontSize: 16 }}>{createdTask?.statusName}</Text></div>
          <div><Text strong>Priority:</Text> <Text style={{ fontSize: 16 }}>{createdTask?.priorityName}</Text></div>
          { createdTask?.projectName && (
            <div><Text strong>Project:</Text> <Text style={{ fontSize: 16 }}>{createdTask.projectName}</Text></div>
          )}
          { createdTask?.epicName && (
            <div><Text strong>Epic:</Text> <Text style={{ fontSize: 16 }}>{createdTask.epicName}</Text></div>
          )}
          { createdTask?.startDate && (
            <div><Text strong>Start Date:</Text> <Text style={{ fontSize: 16 }}>{createdTask.startDate}</Text></div>
          )}
          { createdTask?.dueDate && (
            <div><Text strong>Due Date:</Text> <Text style={{ fontSize: 16 }}>{createdTask.dueDate}</Text></div>
          )}
          { createdTask?.assigneeNames && createdTask.assigneeNames.length > 0 && (
            <div><Text strong>Assignees:</Text> <Text style={{ fontSize: 16 }}>{createdTask.assigneeNames.join(", ")}</Text></div>
          )}
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <Text type="secondary">No action? Redirecting to Tasks in <Text strong>{countdown}</Text> seconds…</Text>
      </Modal>
    </div>
  );
}
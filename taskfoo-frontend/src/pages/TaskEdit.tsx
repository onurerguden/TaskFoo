import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState, useRef } from "react";
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
import dayjs, { Dayjs } from "dayjs";

import {
  getTask,
  updateTask,
  updateTaskStatus,
  updateTaskDates,
  assignUsers,
  type TaskListItemResponse,
} from "../api/tasks";
import { listStatuses } from "../api/statuses";
import { listPriorities } from "../api/priorities";
import { listProjects } from "../api/projects";
import { listEpics } from "../api/epics";
import { listUsers } from "../api/users";

const { Text } = Typography;
const { RangePicker } = DatePicker;

export default function TaskEdit() {
  const { id } = useParams<{ id: string }>();
  const taskId = Number(id);
  const nav = useNavigate();
  const qc = useQueryClient();
  const [form] = Form.useForm();
  const message = antdMessage; // use global message API to ensure popups even without <App> provider
  const [done, setDone] = useState(false);
  const hasNavigatedRef = useRef(false);
  const submittedRef = useRef(false);

  const [resultOpen, setResultOpen] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [updatedTask, setUpdatedTask] = useState<{ 
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

  // Lookups
  const { data: statuses = [], isLoading: stL } = useQuery({ queryKey: ["statuses"], queryFn: listStatuses });
  const { data: priorities = [], isLoading: prL } = useQuery({ queryKey: ["priorities"], queryFn: listPriorities });
  const { data: projects = [], isLoading: pjL } = useQuery({ queryKey: ["projects"], queryFn: listProjects });
  const { data: epicsAll = [], isLoading: epL } = useQuery({ queryKey: ["epics"], queryFn: listEpics });
  const { data: users = [], isLoading: usL } = useQuery({ queryKey: ["users"], queryFn: listUsers });

  // Task source of truth
  const { data: task, isLoading: tkL, isFetching: tkF } = useQuery({
    queryKey: ["task", taskId],
    queryFn: () => getTask(taskId),
    enabled: Number.isFinite(taskId),
  });

  // Helpers
  const latestVersion = () => qc.getQueryData<TaskListItemResponse>(["task", taskId])?.version ?? task?.version ?? 0;
  const dateFmt = (d?: Dayjs | null) => (d ? d.format("YYYY-MM-DD") : undefined);

  // Filter Epics by selected project (project is used only to filter epics; not sent to backend)
  const selectedProjectId = Form.useWatch("projectId", form);
  const epics = useMemo(() => {
    if (!selectedProjectId) return epicsAll;
    return epicsAll.filter((e: any) => e.project?.id === selectedProjectId);
  }, [epicsAll, selectedProjectId]);

  // --- Mutations ---
  const mutDetails = useMutation({
    mutationFn: async (v: any) => {
      const res = await updateTask(taskId, {
        id: task!.id,
        version: latestVersion(),
        title: v.title?.trim(),
        description: v.description?.trim() || undefined,
        priorityId: v.priorityId,
        epicId: v.epicId,
      });
      return res;
    },
    retry: false,
    onMutate: async () => {
      message.open({ type: "loading", content: "Updating task...", key: "updateTask", duration: 0 });
    },
    onSuccess: async (data: any) => {
      qc.setQueryData(["task", taskId], data);
      await qc.invalidateQueries({ queryKey: ["tasks"] });
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      message.open({ type: "success", content: "Task updated", key: "updateTask", duration: 0.6 });
      setDone(true);

      // Get related names for display
      const selectedStatus = statuses.find(s => s.id === form.getFieldValue("statusId"));
      const selectedPriority = priorities.find((p: any) => p.id === form.getFieldValue("priorityId"));
      const selectedProject = projects.find((p: any) => p.id === form.getFieldValue("projectId"));
      const selectedEpic = epics.find((e: any) => e.id === form.getFieldValue("epicId"));
      const selectedAssigneeIds = form.getFieldValue("assigneeIds") || [];
      const assigneeNames = selectedAssigneeIds.map((id: number) => {
        const user = users.find(u => u.id === id);
        return user ? `${user.name}${user.surname ? ` ${user.surname}` : ''}` : 'Unknown User';
      });

      setUpdatedTask({
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
    onError: (e: any) => {
      message.open({
        type: "error",
        content: e?.response?.data?.message ?? "Failed to update task",
        key: "updateTask",
        duration: 2.5,
      });
      submittedRef.current = false; // allow retry after error
    },
    onSettled: () => {
      // mutation finished; button spinner handled by isPending
    },
  });

  const mutStatus = useMutation({
    mutationFn: (statusId: number) => updateTaskStatus(taskId, statusId, latestVersion()),
    onSuccess: (data) => {
      qc.setQueryData(["task", taskId], data);
      message.success("Status updated");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Failed to update status"),
  });

  const mutDates = useMutation({
    mutationFn: ({ start, due }: { start?: Dayjs; due?: Dayjs }) =>
      updateTaskDates(taskId, { startDate: dateFmt(start)!, dueDate: dateFmt(due)!, version: latestVersion() }),
    onSuccess: (data) => {
      qc.setQueryData(["task", taskId], data);
      message.success("Dates updated");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Failed to update dates"),
  });

  const mutAssign = useMutation({
    mutationFn: (userIds: number[]) => assignUsers(taskId, userIds, latestVersion()),
    onSuccess: (data) => {
      qc.setQueryData(["task", taskId], data);
      message.success("Assignees updated");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Failed to update assignees"),
  });

  // Prefill form once task & lookups are ready
  useEffect(() => {
    if (!task) return;
    const initial: any = {
      title: task.title,
      description: task.description ?? "",
      statusId: task.status?.id,
      priorityId: task.priority?.id,
      epicId: task.epic?.id,
      dates: [
        task.startDate ? dayjs(task.startDate) : null,
        task.dueDate ? dayjs(task.dueDate) : null,
      ].filter(Boolean),
      assigneeIds: (task.assignees ?? []).map((u) => (u as any).id),
    };

    // Try to infer project from epic → project
    const epicFull = epicsAll.find((e: any) => e.id === task.epic?.id);
    if (epicFull?.project?.id) {
      initial.projectId = epicFull.project.id;
    }

    form.setFieldsValue(initial);
  }, [task, epicsAll, form]);

  const loading = stL || prL || pjL || epL || usL || tkL || tkF;

  const onFinishFailed = () => {
    message.warning("Please fill the required fields");
  };

  const handleFinish = async (v: any) => {
    if (mutDetails.isPending || submittedRef.current) return; // ignore rapid double-clicks
    submittedRef.current = true;
    try {
      await form.validateFields();
      await mutDetails.mutateAsync(v);
    } catch {
      // onError will reset submittedRef
    }
  };

  const handleContinueEdit = () => {
    setResultOpen(false);
    setDone(false);
    setUpdatedTask(null);
    setTimeout(() => setCountdown(8), 0);
    hasNavigatedRef.current = false;
    submittedRef.current = false;
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
      padding: 0,
    }}>
      <PageHeaderIcon title={`Edit Task #${taskId}`} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish} onFinishFailed={onFinishFailed} disabled={loading} validateTrigger={["onBlur", "onChange"]}>
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
                  marginBottom: 24,
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
                styles={{ header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }, body: { padding: 24 } }}
                loading={loading}
              >
                <Form.Item
                  name="title"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Task Title *</Text>}
                  rules={[
                    { required: true, message: "Task title is required" },
                    { min: 3, message: "Title must be at least 3 characters" },
                    { max: 120, message: "Title cannot exceed 120 characters" },
                    { whitespace: true, message: "Title cannot be empty" },
                  ]}
                  hasFeedback
                >
                  <Input
                    placeholder="e.g. Implement User Authentication API"
                    maxLength={120}
                    showCount
                    size="large"
                    style={{ borderColor: "#d1d5db", borderRadius: 6 }}
                  />
                </Form.Item>

                <Form.Item
                  name="description"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Description</Text>}
                  rules={[{ max: 2000, message: "Description cannot exceed 2000 characters" }]}
                >
                  <Input.TextArea
                    rows={6}
                    placeholder="Write detailed description about the task..."
                    maxLength={2000}
                    showCount
                    style={{ borderColor: "#d1d5db", borderRadius: 6 }}
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
                style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                styles={{ header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }, body: { padding: 24 } }}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="dates"
                      label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Start and Due Date *</Text>}
                      rules={[{ required: true, message: "Please select start and due dates" }]}
                    >
                      <RangePicker
                        style={{ width: "100%", borderColor: "#d1d5db", borderRadius: 6 }}
                        size="large"
                        placeholder={["Start Date", "Due Date"]}
                        format="DD/MM/YYYY"
                        onChange={(vals) => {
                          const [s, d] = vals ?? [];
                          if (s && d) mutDates.mutate({ start: s, due: d });
                        }}
                      />
                    </Form.Item>
                  </Col>

                  <Col xs={24} md={12}>
                    <Form.Item name="assigneeIds" label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Assignees</Text>}>
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
                          const label = (option.label as any);
                          const str = typeof label === "string" ? label : (label?.props?.children?.[1] ?? "");
                          return String(str).toLowerCase().includes(input.toLowerCase());
                        }}
                        style={{ borderRadius: 6 }}
                        onChange={(ids: number[]) => mutAssign.mutate(ids)}
                        options={users.map((u: any) => ({
                          value: u.id,
                          label: (
                            <Space>
                              <Avatar
                                size="small"
                                icon={<UserOutlined />}
                                style={{ background: `hsl(${u.id * 137.508}deg, 65%, 45%)`, fontSize: 11 }}
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
                style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                styles={{ header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }, body: { padding: 24 } }}
              >
                <Form.Item
                  name="statusId"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Status *</Text>}
                  rules={[{ required: true, message: "Please select a status" }]}
                  style={{ marginBottom: 20 }}
                  hasFeedback
                >
                  <Select
                    showSearch
                    placeholder="Select status"
                    loading={stL}
                    size="large"
                    filterOption={(input, option) => {
                      if (!option || !input) return true;
                      const label = option.label as any;
                      const text = typeof label === "string" ? label : label?.props?.children?.[0]?.props?.children ?? "";
                      return String(text).toLowerCase().includes(input.toLowerCase());
                    }}
                    style={{ borderRadius: 6 }}
                    options={statuses.map((s: any) => ({
                      value: s.id,
                      label: (
                        <Space>
                          <Tag color={s.color || "#3b82f6"}>{s.name}</Tag>
                        </Space>
                      ),
                    }))}
                    onChange={(val: number) => mutStatus.mutate(val)}
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
                      const label = option.label as any;
                      const text = typeof label === "string" ? label : label?.props?.children?.[1]?.props?.children ?? "";
                      return String(text).toLowerCase().includes(input.toLowerCase());
                    }}
                    style={{ borderRadius: 6 }}
                    options={priorities.map((p: any) => ({
                      value: p.id,
                      label: (
                        <Space>
                          <div style={{ width: 12, height: 12, borderRadius: "50%", background: p.color || "#6b7280", display: "inline-block" }} />
                          <Text strong style={{ color: "#374151" }}>{p.name}</Text>
                        </Space>
                      ),
                    }))}
                  />
                </Form.Item>
              </Card>

              {/* Project and Epic (Project only filters epics) */}
              <Card
                title={
                  <Space>
                    <ProjectOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Project and Epic</Text>
                  </Space>
                }
                style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                styles={{ header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }, body: { padding: 24 } }}
              >
                <Form.Item name="projectId" label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Project</Text>} style={{ marginBottom: 20 }}>
                  <Select
                    allowClear
                    showSearch
                    placeholder="Select project (optional)"
                    loading={pjL}
                    size="large"
                    filterOption={(input, option) => {
                      if (!option || !input) return true;
                      const label = option.label as any;
                      const text = typeof label === "string" ? label : label?.props?.children?.[1] ?? "";
                      return String(text).toLowerCase().includes(input.toLowerCase());
                    }}
                    style={{ borderRadius: 6 }}
                    onChange={() => form.setFieldValue("epicId", undefined)}
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

                <Form.Item name="epicId" label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Epic</Text>}>
                  <Select
                    showSearch
                    placeholder={selectedProjectId ? "Select epic (optional)" : "Select project first"}
                    loading={epL}
                    disabled={!selectedProjectId || epL}
                    allowClear={!!selectedProjectId}
                    size="large"
                    filterOption={(input, option) => {
                      if (!option || !input) return true;
                      const label = option.label as any;
                      const text = typeof label === "string" ? label : label?.props?.children ?? "";
                      return String(text).toLowerCase().includes(input.toLowerCase());
                    }}
                    style={{ borderRadius: 6 }}
                    options={epics.map((e: any) => ({ value: e.id, label: e.name }))}
                  />
                </Form.Item>
              </Card>

              {/* Actions */}
              <Card 
                styles={{ body: { padding: 16 } }} 
                style={{ marginTop: 16, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8f9fa", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
              >
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                  <Button 
                    disabled={mutDetails.isPending}
                    size="large" 
                    onClick={() => nav(-1)} 
                    icon={<CloseOutlined />} 
                    style={{ minWidth: 140, borderColor: "#d1d5db", color: "#374151", borderRadius: 6 }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={mutDetails.isPending}
                    size="large"
                    icon={done ? <CheckOutlined /> : <SaveOutlined />}
                    aria-busy={mutDetails.isPending}
                    aria-live="polite"
                    style={{
                      minWidth: 160,
                      background: done
                        ? "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
                        : "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
                      border: "none",
                      borderRadius: 6,
                      boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
                      transition: "transform 80ms ease",
                    }}
                  >
                    {mutDetails.isPending ? "Updating..." : done ? "Updated!" : "Update Task"}
                  </Button>
                </div>
              </Card>
            </Col>
          </Row>
        </Form>
      </div>

      <Modal
        open={resultOpen}
        closable={false}
        maskClosable={false}
        onCancel={handleContinueEdit}
        title={<Space><CheckCircleTwoTone twoToneColor="#52c41a" /><Text strong style={{ fontSize: 18 }}>Task updated successfully</Text></Space>}
        footer={[
          <Button key="continue" onClick={handleContinueEdit}>
            Continue Editing Task
          </Button>,
          <Button key="tasks" type="primary" onClick={handleGoTasks}>
            Go to Tasks ({countdown}s)
          </Button>,
        ]}
        styles={{ body: { fontSize: 16, lineHeight: 1.8 } }}
      >
        <Text type="secondary">The following task has been updated successfully:</Text>
        <Divider style={{ margin: "12px 0" }} />
        <div style={{ lineHeight: 1.9 }}>
          <div><Text strong>Title:</Text> <Text style={{ fontSize: 16 }}>{updatedTask?.title ?? form.getFieldValue("title")}</Text></div>
          { (updatedTask?.description || form.getFieldValue("description")) && (
            <div><Text strong>Description:</Text> <Text style={{ fontSize: 16 }}>{updatedTask?.description ?? form.getFieldValue("description")}</Text></div>
          )}
          <div><Text strong>Status:</Text> <Text style={{ fontSize: 16 }}>{updatedTask?.statusName}</Text></div>
          <div><Text strong>Priority:</Text> <Text style={{ fontSize: 16 }}>{updatedTask?.priorityName}</Text></div>
          { updatedTask?.projectName && (
            <div><Text strong>Project:</Text> <Text style={{ fontSize: 16 }}>{updatedTask.projectName}</Text></div>
          )}
          { updatedTask?.epicName && (
            <div><Text strong>Epic:</Text> <Text style={{ fontSize: 16 }}>{updatedTask.epicName}</Text></div>
          )}
          { updatedTask?.startDate && (
            <div><Text strong>Start Date:</Text> <Text style={{ fontSize: 16 }}>{updatedTask.startDate}</Text></div>
          )}
          { updatedTask?.dueDate && (
            <div><Text strong>Due Date:</Text> <Text style={{ fontSize: 16 }}>{updatedTask.dueDate}</Text></div>
          )}
          { updatedTask?.assigneeNames && updatedTask.assigneeNames.length > 0 && (
            <div><Text strong>Assignees:</Text> <Text style={{ fontSize: 16 }}>{updatedTask.assigneeNames.join(", ")}</Text></div>
          )}
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <Text type="secondary">No action? Redirecting to Tasks in <Text strong>{countdown}</Text> seconds…</Text>
      </Modal>
    </div>
  );
}
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useMemo } from "react";
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
  App,
} from "antd";
import {
  CalendarOutlined,
  UserOutlined,
  FlagOutlined,
  ProjectOutlined,
  FileTextOutlined,
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
  const { message } = App.useApp();
  const [form] = Form.useForm();

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
      return updateTask(taskId, {
        id: task!.id,
        version: latestVersion(),
        title: v.title?.trim(),
        description: v.description?.trim() || undefined,
        priorityId: v.priorityId,
        epicId: v.epicId,
      });
    },
    onSuccess: (data) => {
      qc.setQueryData(["task", taskId], data);
      message.success("Task details saved");
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Failed to save details"),
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

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f9fa",
      padding: 0,
    }}>
      <PageHeaderIcon title={`Edit Task #${taskId}`} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Form form={form} layout="vertical" disabled={loading} validateTrigger={["onBlur", "onChange"]}>
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
              <Card styles={{ body: { padding: 16 } }} style={{ marginTop: 16, borderRadius: 8, border: "1px solid #e5e7eb" }}>
                <Space>
                  <Button onClick={() => nav(-1)}>Cancel</Button>
                  <Button
                    type="primary"
                    onClick={async () => {
                      try {
                        const v = await form.validateFields();
                        mutDetails.mutate(v);
                      } catch {
                        /* validation error */
                      }
                    }}
                    loading={mutDetails.isPending}
                  >
                    Save
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
}
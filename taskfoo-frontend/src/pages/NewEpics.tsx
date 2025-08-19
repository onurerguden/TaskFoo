import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Select, DatePicker, Button, Card, Typography, Row, Col, Space, Modal, Divider, message as antdMessage } from "antd";
import type { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import { createEpic } from "../api/epics";
import { FileTextOutlined, ProjectOutlined, CalendarOutlined, SaveOutlined, CloseOutlined, CheckOutlined, CheckCircleTwoTone } from "@ant-design/icons";
import PageHeaderIcon from "../components/PageHeaderIcon";
import { useState, useRef, useEffect } from "react";

const { Text } = Typography;
const { RangePicker } = DatePicker;

type FormValues = {
  name: string;
  description?: string;
  projectId: number;
  dates?: [Dayjs, Dayjs];
};

export default function NewEpic() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const message = antdMessage; // use global message API to ensure popups even without <App> provider
  const [done, setDone] = useState(false);
  const hasNavigatedRef = useRef(false);
  const submittedRef = useRef(false);

  const [resultOpen, setResultOpen] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [createdEpic, setCreatedEpic] = useState<{ 
    id?: number; 
    name: string; 
    description?: string; 
    projectId: number;
    startDate?: string;
    dueDate?: string;
    projectName?: string;
  } | null>(null);

  const { data: projects = [], isLoading: pjL } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const mut = useMutation({
    mutationFn: async (v: FormValues) => {
      const [s, d] = v.dates ?? [];
      const res = await createEpic({
        name: v.name,
        description: v.description,
        projectId: v.projectId,
        startDate: s ? s.format("YYYY-MM-DD") : "",
        dueDate: d ? d.format("YYYY-MM-DD") : "",
      });
      return res; // assume API returns created epic object
    },
    retry: false,
    onMutate: async () => {
      message.open({ type: "loading", content: "Creating epic...", key: "createEpic", duration: 0 });
    },
    onSuccess: async (data: any) => {
      await qc.invalidateQueries({ queryKey: ["epics"] });
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      message.open({ type: "success", content: "Epic created", key: "createEpic", duration: 0.6 });
      setDone(true);
      
      // Get project name for display
      const selectedProject = projects.find((p: { id: number; name: string }) => p.id === form.getFieldValue("projectId"));
      setCreatedEpic({
        ...data,
        projectName: selectedProject?.name || "Unknown Project"
      });
      setCountdown(8);
      setResultOpen(true);
    },
    onError: (e: any) => {
      message.open({
        type: "error",
        content: e?.response?.data?.message ?? "Failed to create epic",
        key: "createEpic",
        duration: 2.5,
      });
      submittedRef.current = false; // allow retry after error
    },
    onSettled: () => {
      // mutation finished; button spinner handled by isPending
    },
  });

  const loading = mut.isPending;

  const onFinishFailed = () => {
    message.warning("Please fill the required fields");
  };

  const handleFinish = async (v: FormValues) => {
    if (mut.isPending || submittedRef.current) return; // ignore rapid double-clicks
    submittedRef.current = true;
    try {
      await mut.mutateAsync(v);
    } catch {
      // onError will reset submittedRef
    }
  };

  const handleContinueCreate = () => {
    setResultOpen(false);
    setDone(false);
    setCreatedEpic(null);
    setTimeout(() => setCountdown(8), 0);
    hasNavigatedRef.current = false;
    submittedRef.current = false;
    form.resetFields();
    // Focus first field for faster entry
    setTimeout(() => {
      const first = document.querySelector<HTMLInputElement>('input[name="name"]');
      first?.focus();
    }, 0);
  };

  const handleGoEpics = () => {
    setResultOpen(false);
    nav("/epics", { replace: true });
  };

  // Auto-redirect countdown when modal is open
  useEffect(() => {
    if (!resultOpen) return;
    setCountdown(8);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          handleGoEpics();
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resultOpen]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <PageHeaderIcon title="Create New Epic" />

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish} onFinishFailed={onFinishFailed} disabled={loading}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <FileTextOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Basic Information</Text>
                  </Space>
                }
                style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                styles={{ header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }, body: { padding: 24 } }}
              >
                <Form.Item
                  name="name"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Epic Name</Text>}
                  rules={[{ required: true, message: "Epic name is required" }]}
                >
                  <Input placeholder="e.g. User Management" size="large" style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>

                <Form.Item name="description" label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Description</Text>}>
                  <Input.TextArea rows={6} placeholder="Describe the epic..." style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={
                  <Space>
                    <ProjectOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Project</Text>
                  </Space>
                }
                style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                styles={{ header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }, body: { padding: 24 } }}
              >
                <Form.Item
                  name="projectId"
                  label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Select Project</Text>}
                  rules={[{ required: true, message: "Project is required" }]}
                >
                  <Select
                    placeholder="Select project"
                    loading={pjL}
                    size="large"
                    options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
                    style={{ borderRadius: 6 }}
                  />
                </Form.Item>

                <Card
                  title={
                    <Space>
                      <CalendarOutlined style={{ color: "#1e40af" }} />
                      <Text strong style={{ color: "#1f2937", fontSize: 18 }}>Timeline</Text>
                    </Space>
                  }
                  style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginTop: 16 }}
                  styles={{ header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }, body: { padding: 16 } }}
                >
                  <Form.Item
                    name="dates"
                    label={<Text strong style={{ color: "#374151", fontSize: 16 }}>Start / Due</Text>}
                    rules={[{ required: true, message: "Start and Due dates are required" }]}
                  >
                    <RangePicker style={{ width: "100%", borderColor: "#d1d5db", borderRadius: 6 }} size="large" format="DD/MM/YYYY" />
                  </Form.Item>
                </Card>
              </Card>
            </Col>
          </Row>

          <Card style={{ marginTop: 24, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8f9fa", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} styles={{ body: { padding: 16 } }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button 
                disabled={loading} 
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
                loading={loading}
                size="large"
                icon={done ? <CheckOutlined /> : <SaveOutlined />}
                aria-busy={loading}
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
                {loading ? "Saving..." : done ? "Saved!" : "Save"}
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
        title={<Space><CheckCircleTwoTone twoToneColor="#52c41a" /><Text strong style={{ fontSize: 18 }}>Epic created successfully</Text></Space>}
        footer={[
          <Button key="continue" onClick={handleContinueCreate}>
            Continue Creating Epic
          </Button>,
          <Button key="epics" type="primary" onClick={handleGoEpics}>
            Go to Epics ({countdown}s)
          </Button>,
        ]}
        styles={{ body: { fontSize: 16, lineHeight: 1.8 } }}
      >
        <Text type="secondary">The following epic has been added successfully:</Text>
        <Divider style={{ margin: "12px 0" }} />
        <div style={{ lineHeight: 1.9 }}>
          <div><Text strong>Name:</Text> <Text style={{ fontSize: 16 }}>{createdEpic?.name ?? form.getFieldValue("name")}</Text></div>
          { (createdEpic?.description || form.getFieldValue("description")) && (
            <div><Text strong>Description:</Text> <Text style={{ fontSize: 16 }}>{createdEpic?.description ?? form.getFieldValue("description")}</Text></div>
          )}
          <div><Text strong>Project:</Text> <Text style={{ fontSize: 16 }}>{createdEpic?.projectName}</Text></div>
          { createdEpic?.startDate && (
            <div><Text strong>Start Date:</Text> <Text style={{ fontSize: 16 }}>{createdEpic.startDate}</Text></div>
          )}
          { createdEpic?.dueDate && (
            <div><Text strong>Due Date:</Text> <Text style={{ fontSize: 16 }}>{createdEpic.dueDate}</Text></div>
          )}
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <Text type="secondary">No action? Redirecting to Epics in <Text strong>{countdown}</Text> seconds…</Text>
      </Modal>
    </div>
  );
}
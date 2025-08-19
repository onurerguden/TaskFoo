import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Select, DatePicker, Button, Card, Typography, App, Row, Col, Space } from "antd";
import type { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import { createEpic } from "../api/epics";
import { FileTextOutlined, ProjectOutlined, CalendarOutlined, SaveOutlined, CloseOutlined } from "@ant-design/icons";
import PageHeaderIcon from "../components/PageHeaderIcon";

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
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const { data: projects = [], isLoading: pjL } = useQuery({
    queryKey: ["projects"],
    queryFn: listProjects,
  });

  const mut = useMutation({
    mutationFn: async (v: FormValues) => {
      const [s, d] = v.dates ?? [];
      return await createEpic({
        name: v.name,
        description: v.description,
        projectId: v.projectId,                 // <-- use projectId
        startDate: s ? s.format("YYYY-MM-DD") : "",
        dueDate: d ? d.format("YYYY-MM-DD") : "",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["epics"] });
      message.success("✅ Epic created successfully");
      nav(-1);
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Failed to create epic"),
  });

  const loading = mut.isPending;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <PageHeaderIcon title="Create New Epic" />

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Form form={form} layout="vertical" onFinish={(v) => mut.mutate(v)} disabled={loading}>
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
              <Button size="large" onClick={() => nav(-1)} icon={<CloseOutlined />} style={{ minWidth: 140, borderColor: "#d1d5db", color: "#374151", borderRadius: 6 }} disabled={loading}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} size="large" icon={<SaveOutlined />} style={{ minWidth: 160, background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", border: "none", borderRadius: 6, boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)" }}>
                Save
              </Button>
            </div>
          </Card>
        </Form>
      </div>
    </div>
  );
}
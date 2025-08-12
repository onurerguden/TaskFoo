import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, DatePicker, Button, Card, Typography, App, Row, Col, Space } from "antd";
import { Dayjs } from "dayjs";
import { useNavigate } from "react-router-dom";
import { createProject } from "../api/projects";
import { FileTextOutlined, CalendarOutlined, SaveOutlined, CloseOutlined, PlusCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

type FormValues = {
  name: string;
  description?: string;
  dates?: [Dayjs, Dayjs];
};

export default function NewProject() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const mut = useMutation({
    mutationFn: async (v: FormValues) => {
      const [s, d] = v.dates ?? [];
      return await createProject({
        name: v.name,
        description: v.description,
        startDate: s ? s.format("YYYY-MM-DD") : undefined,
        dueDate: d ? d.format("YYYY-MM-DD") : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      message.success("✅ Project created successfully");
      nav(-1);
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Failed to create project"),
  });

  const loading = mut.isPending;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", padding: "1px 1px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title level={1} style={{ textAlign: "left", color: "white", margin: 0, fontSize: 20, fontWeight: 600 }}>
            <PlusCircleOutlined style={{ marginRight: 12 }} />
            Create New Project
          </Title>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Form form={form} layout="vertical" onFinish={(v) => mut.mutate(v)} disabled={loading}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={<Space><FileTextOutlined style={{ color: "#1e40af" }} /><Text strong style={{ color: "#1f2937" }}>Basic Information</Text></Space>}
                style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: 24 }}
              >
                <Form.Item name="name" label={<Text strong style={{ color: "#374151" }}>Project Name</Text>} rules={[{ required: true, message: "Project name is required" }]}>
                  <Input placeholder="e.g. Taskfoo Alpha" size="large" style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>

                <Form.Item name="description" label={<Text strong style={{ color: "#374151" }}>Description</Text>}>
                  <Input.TextArea rows={6} placeholder="Describe the project..." style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={<Space><CalendarOutlined style={{ color: "#1e40af" }} /><Text strong style={{ color: "#1f2937" }}>Timeline</Text></Space>}
                style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: 24 }}
              >
                <Form.Item name="dates" label={<Text strong style={{ color: "#374151" }}>Start / Due</Text>}>
                  <RangePicker style={{ width: "100%", borderColor: "#d1d5db", borderRadius: 6 }} size="large" format="DD/MM/YYYY" />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Card style={{ marginTop: 24, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8f9fa", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button size="large" onClick={() => nav(-1)} icon={<CloseOutlined />} style={{ minWidth: 120, borderColor: "#d1d5db", color: "#374151", borderRadius: 6 }}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} size="large" icon={<SaveOutlined />} style={{ minWidth: 120, background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", border: "none", borderRadius: 6, boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)" }}>
                Save
              </Button>
            </div>
          </Card>
        </Form>
      </div>
    </div>
  );
}
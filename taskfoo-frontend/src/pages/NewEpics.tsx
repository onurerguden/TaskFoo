import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Select, Button, Card, Typography, App, Row, Col, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { listProjects } from "../api/projects";
import { createEpic } from "../api/epics";
import { FileTextOutlined, ProjectOutlined, SaveOutlined, CloseOutlined, PlusCircleOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

type FormValues = {
  name: string;
  description?: string;
  projectId: number;
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
    mutationFn: async (v: FormValues) =>
      createEpic({ name: v.name, description: v.description, project: { id: v.projectId } }),
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
      <div style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", padding: "1px 1px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title level={1} style={{ textAlign: "left", color: "white", margin: 0, fontSize: 20, fontWeight: 600 }}>
            <PlusCircleOutlined style={{ marginRight: 12 }} />
            Create New Epic
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
                <Form.Item name="name" label={<Text strong style={{ color: "#374151" }}>Epic Name</Text>} rules={[{ required: true, message: "Epic name is required" }]}>
                  <Input placeholder="e.g. User Management" size="large" style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>

                <Form.Item name="description" label={<Text strong style={{ color: "#374151" }}>Description</Text>}>
                  <Input.TextArea rows={6} placeholder="Describe the epic..." style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card
                title={<Space><ProjectOutlined style={{ color: "#1e40af" }} /><Text strong style={{ color: "#1f2937" }}>Project</Text></Space>}
                style={{ borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: 24 }}
              >
                <Form.Item name="projectId" label={<Text strong style={{ color: "#374151" }}>Select Project</Text>} rules={[{ required: true, message: "Project is required" }]}>
                  <Select
                    placeholder="Select project"
                    loading={pjL}
                    size="large"
                    options={projects.map((p: any) => ({ value: p.id, label: p.name }))}
                    style={{ borderRadius: 6 }}
                  />
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
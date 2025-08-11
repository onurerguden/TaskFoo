import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Button, Card, Typography, App, Row, Col, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { createUser } from "../api/users";
import { SaveOutlined, CloseOutlined, PlusCircleOutlined, UserOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

type FormValues = {
  name: string;
  surname?: string;
  role?: string;
};

export default function NewUser() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();

  const mut = useMutation({
    mutationFn: (v: FormValues) => createUser({ name: v.name, surname: v.surname, role: v.role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      message.success("✅ User created successfully");
      nav(-1);
    },
    onError: (e: any) => message.error(e?.response?.data?.message ?? "Failed to create user"),
  });

  const loading = mut.isPending;

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <Title level={1} style={{ textAlign: "center", color: "white", margin: 0, fontSize: 28, fontWeight: 600 }}>
            <PlusCircleOutlined style={{ marginRight: 12 }} />
            Create New User
          </Title>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Form form={form} layout="vertical" onFinish={(v) => mut.mutate(v)} disabled={loading}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={<Space><UserOutlined style={{ color: "#1e40af" }} /><Text strong style={{ color: "#1f2937" }}>User Information</Text></Space>}
                style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
                bodyStyle={{ padding: 24 }}
              >
                <Form.Item name="name" label={<Text strong style={{ color: "#374151" }}>Name</Text>} rules={[{ required: true, message: "Name is required" }]}>
                  <Input placeholder="e.g. Onur" size="large" style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>

                <Form.Item name="surname" label={<Text strong style={{ color: "#374151" }}>Surname</Text>}>
                  <Input placeholder="e.g. Ergüden" size="large" style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
                </Form.Item>

                <Form.Item name="role" label={<Text strong style={{ color: "#374151" }}>Role</Text>}>
                  <Input placeholder="e.g. Software Engineer" size="large" style={{ borderColor: "#d1d5db", borderRadius: 6 }} />
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
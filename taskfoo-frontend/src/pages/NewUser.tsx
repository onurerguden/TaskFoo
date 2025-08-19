import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Form, Input, Button, Card, Typography, Row, Col, Space, Modal, Divider, message as antdMessage } from "antd";
import { useNavigate } from "react-router-dom";
import { createUser } from "../api/users";
import { SaveOutlined, CloseOutlined, UserOutlined, CheckOutlined, CheckCircleTwoTone } from "@ant-design/icons";
import PageHeaderIcon from "../components/PageHeaderIcon";
import { useState, useRef, useEffect } from "react";

const { Text } = Typography;

type FormValues = {
  name: string;
  surname?: string;
  role?: string;
};

export default function NewUser() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [form] = Form.useForm<FormValues>();
  const message = antdMessage; // use global message API to ensure popups even without <App> provider
  const [done, setDone] = useState(false);
  const hasNavigatedRef = useRef(false);
  const submittedRef = useRef(false);

  const [resultOpen, setResultOpen] = useState(false);
  const [countdown, setCountdown] = useState(8);
  const [createdUser, setCreatedUser] = useState<{ id?: number; name: string; surname?: string; role?: string } | null>(null);

  const mut = useMutation({
    mutationFn: async (v: FormValues) => {
      const res = await createUser({ name: v.name, surname: v.surname, role: v.role });
      return res; // assume API returns created user object
    },
    retry: false,
    onMutate: async () => {
      message.open({ type: "loading", content: "Creating user...", key: "createUser", duration: 0 });
    },
    onSuccess: async (data: any) => {
      await qc.invalidateQueries({ queryKey: ["users"] });
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      message.open({ type: "success", content: "User created", key: "createUser", duration: 0.6 });
      setDone(true);
      setCreatedUser(data ?? null);
      setCountdown(8);
      setResultOpen(true);
    },
    onError: (e: any) => {
      message.open({
        type: "error",
        content: e?.response?.data?.message ?? "Failed to create user",
        key: "createUser",
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
    setCreatedUser(null);
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

  const handleGoUsers = () => {
    setResultOpen(false);
    nav("/users", { replace: true });
  };

  // Auto-redirect countdown when modal is open
  useEffect(() => {
    if (!resultOpen) return;
    setCountdown(8);
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          handleGoUsers();
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
      <PageHeaderIcon title="Create New User" />
      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <Form form={form} layout="vertical" onFinish={handleFinish} onFinishFailed={onFinishFailed} disabled={loading}>
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={16}>
              <Card
                title={
                  <Space>
                    <UserOutlined style={{ color: "#1e40af" }} />
                    <Text strong style={{ color: "#1f2937" }}>User Information</Text>
                  </Space>
                }
                style={{ marginBottom: 24, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
                styles={{
                  header: { background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" },
                  body: { padding: 24 },
                }}
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

          <Card style={{ marginTop: 24, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f8f9fa", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }} styles={{ body: { padding: 16 } }}>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <Button disabled={loading} size="large" onClick={() => nav("/users", { replace: true })} icon={<CloseOutlined />} style={{ minWidth: 120, borderColor: "#d1d5db", color: "#374151", borderRadius: 6 }}>
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
                  minWidth: 140,
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
        title={<Space><CheckCircleTwoTone twoToneColor="#52c41a" /><Text strong>User created successfully</Text></Space>}
        footer={[
          <Button key="continue" onClick={handleContinueCreate}>
            Continue creating user
          </Button>,
          <Button key="users" type="primary" onClick={handleGoUsers}>
            Go to Users ({countdown}s)
          </Button>,
        ]}
      >
        <Text type="secondary">Aşağıdaki kullanıcı başarıyla eklendi:</Text>
        <Divider style={{ margin: "12px 0" }} />
        <div style={{ lineHeight: 1.9 }}>
          <div><Text strong>Name:</Text> {createdUser?.name ?? form.getFieldValue("name")}</div>
          { (createdUser?.surname || form.getFieldValue("surname")) && (
            <div><Text strong>Surname:</Text> {createdUser?.surname ?? form.getFieldValue("surname")}</div>
          )}
          { (createdUser?.role || form.getFieldValue("role")) && (
            <div><Text strong>Role:</Text> {createdUser?.role ?? form.getFieldValue("role")}</div>
          )}
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <Text type="secondary">No action? Automatically redirecting to Users in <Text strong>{countdown}</Text> seconds…</Text>
      </Modal>
    </div>
  );
}
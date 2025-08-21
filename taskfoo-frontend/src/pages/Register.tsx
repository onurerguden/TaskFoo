import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  message,
  Divider,
} from "antd";
import {
  UserAddOutlined,
  LoginOutlined,
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
} from "@ant-design/icons";
import { register, login } from "../api/auth";

const { Title, Text } = Typography;

interface RegisterFormValues {
  name: string;
  surname: string;
  email: string;
  password: string;
}

export default function Register() {
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterFormValues>();
  const [loading, setLoading] = useState(false);

  const cardStyle: React.CSSProperties = {
    maxWidth: 420,
    width: "100%",
    borderRadius: 16,
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
    border: "1px solid #f0f0f0",
    background: "#ffffff",
  };

  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
    padding: "20px",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: 32,
    padding: "0 8px",
  };

  const titleStyle: React.CSSProperties = {
    color: "#1f2937",
    fontWeight: 700,
    fontSize: 28,
    marginBottom: 8,
    lineHeight: 1.2,
  };

  const subtitleStyle: React.CSSProperties = {
    color: "#64748b",
    fontSize: 15,
    fontWeight: 400,
    margin: 0,
  };

  const onFinish = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      // 1) Register
      await register(values);

      // 2) Auto-login
      const res = await login(values.email, values.password);
      if (res?.token || res?.accessToken) {
        message.success({
          content: "Your account is ready! Redirecting...",
          duration: 1.5,
          style: { marginTop: "20px" },
        });
        setTimeout(() => navigate("/"), 800);
      }
    } catch (err: any) {
      message.error(
        err?.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 15,
  };

  return (
    <div style={containerStyle}>
      <Card style={cardStyle} bordered={false}>
        {/* Header Section */}
        <div style={headerStyle}>
          <Title level={2} style={titleStyle}>
            Create your account
          </Title>
          <Text style={subtitleStyle}>Join TaskFoo in seconds</Text>
        </div>

        {/* Register Form */}
        <Form<RegisterFormValues>
          form={form}
          name="registerForm"
          layout="vertical"
          onFinish={onFinish}
          size="large"
          requiredMark={false}
          scrollToFirstError
        >
          <Form.Item
            name="name"
            label={<Text strong style={{ color: "#374151" }}>First Name</Text>}
            rules={[{ required: true, message: "Please enter your first name" }]}
          >
            <Input
              placeholder="Enter your first name"
              prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="surname"
            label={<Text strong style={{ color: "#374151" }}>Last Name</Text>}
            rules={[{ required: true, message: "Please enter your last name" }]}
          >
            <Input
              placeholder="Enter your last name"
              prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<Text strong style={{ color: "#374151" }}>Email</Text>}
            rules={[
              { required: true, message: "Please enter your email" },
              { type: "email", message: "Please enter a valid email address" },
            ]}
          >
            <Input
              placeholder="Enter your email"
              prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<Text strong style={{ color: "#374151" }}>Password</Text>}
            rules={[
              { required: true, message: "Please create a password" },
              { min: 6, message: "Password must be at least 6 characters" },
            ]}
            hasFeedback
          >
            <Input.Password
              placeholder="Create a password"
              prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              style={inputStyle}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 20 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={!loading ? <UserAddOutlined /> : undefined}
              style={{
                height: 48,
                borderRadius: 8,
                background: "#3092B9",
                borderColor: "#3092B9",
                fontSize: 16,
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(48, 146, 185, 0.3)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </Form.Item>

          <Divider style={{ margin: "24px 0", color: "#9ca3af", fontSize: 13 }}>
            <Text type="secondary">or</Text>
          </Divider>

          {/* Login Link */}
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <Text style={{ color: "#6b7280", fontSize: 15 }}>
              Already have an account?{" "}
              <Button
                type="link"
                onClick={() => navigate("/login")}
                style={{
                  padding: 0,
                  color: "#3092B9",
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: "none",
                }}
                icon={<LoginOutlined style={{ fontSize: 14 }} />}
              >
                Sign In
              </Button>
            </Text>
          </div>
        </Form>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 24,
            paddingTop: 16,
            borderTop: "1px solid #f0f0f0",
          }}
        >
          <Text type="secondary" style={{ fontSize: 13 }}>
            Welcome to TaskFoo — let’s get you set up
          </Text>
        </div>
      </Card>
    </div>
  );
}
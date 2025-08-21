// src/pages/Login.tsx (Ant Design style, aligned with Register)
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { login } from "../api/auth";

const { Title } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success("Login successful! Redirecting...");
      navigate("/");
    } catch (e: any) {
      message.error(e?.response?.data?.message || e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-md rounded-2xl">
        <Title level={3} className="text-center">Login</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item
            label="Email / Username"
            name="email"
            rules={[{ required: true, message: "Please enter your email or username" }]}
          >
            <Input placeholder="onur@taskfoo.dev" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: "Please enter your password" }, { min: 6, message: "At least 6 characters" }]}
          >
            <Input.Password placeholder="Your password" />
          </Form.Item>

          <Button type="primary" htmlType="submit" block loading={loading}>
            Login
          </Button>

          <div className="mt-3 text-center">
            Don't have an account?{" "}
            <a onClick={() => navigate("/register")}>Register</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { register, login } from "../api/auth";

const { Title } = Typography;

export default function Register() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    name: string;
    surname: string;
    email: string;
    password: string;
  }) => {
    setLoading(true);
    try {
      // önce register
      await register(values);

      // register başarılı ise otomatik login
      const res = await login(values.email, values.password);
      if (res?.token || res?.accessToken) {
        message.success("Registration successful! Redirecting...");
        navigate("/");
      }
    } catch (err: any) {
      message.error(err?.response?.data?.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-md rounded-2xl">
        <Title level={3} className="text-center">Register</Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item label="First Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="Enter your first name" />
          </Form.Item>
          <Form.Item label="Last Name" name="surname" rules={[{ required: true }]}>
            <Input placeholder="Enter your last name" />
          </Form.Item>
          <Form.Item label="Email" name="email" rules={[{ required: true, type: "email" }]}>
            <Input placeholder="Enter your email" />
          </Form.Item>
          <Form.Item label="Password" name="password" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="Enter a password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Register
          </Button>
          <div className="mt-3 text-center">
            Already have an account?{" "}
            <a onClick={() => navigate("/login")}>Login</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}
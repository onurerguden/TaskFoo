import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  message, 
  Divider
} from "antd";
import { 
  UserOutlined, 
  LockOutlined, 
  EyeInvisibleOutlined, 
  EyeTwoTone,
  LoginOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { login } from "../api/auth";

const { Title, Text } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleFinish = async (values: LoginFormValues) => {
    setLoading(true);
    
    try {
      await login(values.email, values.password);

      message.success({
        content: "Welcome back! Redirecting to dashboard...",
        duration: 1.5,
        style: { marginTop: '20px' }
      });

      // Small delay for better UX
      setTimeout(() => {
        navigate("/");
      }, 800);

    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          "Login failed. Please check your credentials.";
      
      message.error({
        content: errorMessage,
        duration: 4,
        style: { marginTop: '20px' }
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate("/register");
  };

  const cardStyle: React.CSSProperties = {
    maxWidth: 420,
    width: '100%',
    borderRadius: 16,
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    border: '1px solid #f0f0f0',
    background: '#ffffff'
  };

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    marginBottom: 32,
    padding: '0 8px'
  };

  const titleStyle: React.CSSProperties = {
    color: '#1f2937',
    fontWeight: 700,
    fontSize: 28,
    marginBottom: 8,
    lineHeight: 1.2
  };

  const subtitleStyle: React.CSSProperties = {
    color: '#64748b',
    fontSize: 15,
    fontWeight: 400,
    margin: 0
  };

  return (
    <div style={containerStyle}>
      <Card style={cardStyle} bordered={false}>
        {/* Header Section */}
        <div style={headerStyle}>
          <Title level={2} style={titleStyle}>
            Welcome Back
          </Title>
          <Text style={subtitleStyle}>
            Sign in to your TaskFoo account
          </Text>
        </div>

        {/* Login Form */}
        <Form
          form={form}
          name="loginForm"
          layout="vertical"
          onFinish={handleFinish}
          size="large"
          requiredMark={false}
        >
          <Form.Item
            name="email"
            label={
              <Text strong style={{ color: '#374151' }}>
                Email / Username
              </Text>
            }
            rules={[
              { required: true, message: 'Please enter your email or username' },
              { min: 3, message: 'At least 3 characters required' }
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Enter your email or username"
              style={{ 
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 15
              }}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              <Text strong style={{ color: '#374151' }}>
                Password
              </Text>
            }
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Enter your password"
              iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              style={{ 
                borderRadius: 8,
                border: '1px solid #d1d5db',
                fontSize: 15
              }}
              onPressEnter={() => form.submit()}
            />
          </Form.Item>

          {/* Login Button */}
          <Form.Item style={{ marginBottom: 20 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              size="large"
              icon={!loading ? <LoginOutlined /> : undefined}
              style={{
                height: 48,
                borderRadius: 8,
                background: '#3092B9',
                borderColor: '#3092B9',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(48, 146, 185, 0.3)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </Form.Item>

          <Divider style={{ margin: '24px 0', color: '#9ca3af', fontSize: 13 }}>
            <Text type="secondary">or</Text>
          </Divider>

          {/* Register Link */}
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text style={{ color: '#6b7280', fontSize: 15 }}>
              Don't have an account?{' '}
              <Button
                type="link"
                onClick={handleRegisterClick}
                style={{ 
                  padding: 0, 
                  color: '#3092B9',
                  fontWeight: 600,
                  fontSize: 15,
                  textDecoration: 'none'
                }}
                icon={<UserAddOutlined style={{ fontSize: 14 }} />}
              >
                Create Account
              </Button>
            </Text>
          </div>
        </Form>

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: 24,
          paddingTop: 16,
          borderTop: '1px solid #f0f0f0'
        }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Secure login powered by TaskFoo
          </Text>
        </div>
      </Card>
    </div>
  );
}
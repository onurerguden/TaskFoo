import { useState, useRef, useLayoutEffect, useEffect } from "react";
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
import headerLogo from "../assets/header-logo.png";
import sideArt from "../assets/login-side.png"; // <-- NEW: left visual
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

  const wrapperRef = useRef<HTMLDivElement>(null);
  const [sideSize, setSideSize] = useState<number | undefined>(undefined);
  const [sideWidth, setSideWidth] = useState<number>(0);     // animated width of the left square
  const [phase, setPhase] = useState<0 | 1 | 2>(0);          // 0: only card, 1: card nudges right, 2: left square expands

  // measure the card height to sync the square visual
  useLayoutEffect(() => {
    const measure = () => {
      if (wrapperRef.current) {
        setSideSize(wrapperRef.current.offsetHeight);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Animation sequence: 0 -> 1 (card moves right) -> 2 (left promo expands)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120);              // nudge card to the right
    const t2 = setTimeout(() => setPhase(2), 420);              // then expand promo
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // When entering phase 2, animate the left square width from 0 to measured height
  useEffect(() => {
    if (phase === 2 && sideSize) {
      // start from 0 -> sideSize
      requestAnimationFrame(() => setSideWidth(sideSize));
    }
  }, [phase, sideSize]);

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

 
  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    padding: '20px'
  };

  const rowStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 1000,
    display: 'flex',
    gap: 0,
    alignItems: 'stretch',
    justifyContent: 'center'
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

  const wrapperStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 420,
  borderRadius: 16,            // tüm kart için yuvarlak kenar
  boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
  overflow: 'hidden',          // şapkanın üst köşe yuvarlakları görünür
  background: '#ffffff',
  borderTopLeftRadius: 0,
  borderBottomLeftRadius: 0,
};

const capStyle: React.CSSProperties = {
  height: 88,                  // sabit şapka yüksekliği
  background: '#062B43',       // koyu mavi (uygulamadaki ton)
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderTopLeftRadius: 0,     // üst köşeleri burada da ver
  borderTopRightRadius: 16,
  position: 'relative'
};

const cardStyle: React.CSSProperties = {
  width: '100%',
  borderBottomLeftRadius: 0,
  borderBottomRightRadius: 16,
  borderTopLeftRadius: 0,      // şapkanın altına düz otursun
  borderTopRightRadius: 0,
  border: '1px solid #f0f0f0',
  borderTop: 'none',           // üstte beyaz çizgi görünmesin
  background: '#ffffff',
  borderLeft: 'none'
};
  
  const sideStyle: React.CSSProperties = {
    height: sideSize,          // matches card height
    width: sideWidth,          // animated width
    borderRadius: 16,
    overflow: 'hidden',
    background: '#062B43',
    border: '1px solid #0b3a57',
    boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRight: 'none',
    opacity: sideWidth > 0 ? 1 : 0,
    transform: sideWidth > 0 ? 'translateX(0)' : 'translateX(16px)',
    transition: 'width 480ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease, transform 300ms ease',
    willChange: 'width, transform, opacity'
  };

  const sideImgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'fill',
    display: 'block',
    transform: 'scale(1.0)'
  };

  

  return (
    <>
      <div style={containerStyle}>
        <div style={rowStyle}>
          {/* Left promo square (initially collapsed) */}
          <div className="auth-side" style={sideStyle}>
            <img src={sideArt} alt="Taskfoo promo" style={sideImgStyle} />
          </div>

          {/* Right: the actual login card; nudge right on phase 1+ */}
          <div
            ref={wrapperRef}
            style={{
              ...wrapperStyle,
              transform: phase >= 1 ? 'translateX(16px)' : 'translateX(0)',
              transition: 'transform 320ms cubic-bezier(0.4,0,0.2,1)'
            }}
          >
            <div style={capStyle}>
              <img
                src={headerLogo}
                alt="Taskfoo Logo"
                style={{
                  height: 356,
                  objectFit: 'contain',
                  transform: 'translateY(22px)'
                }}
              />
            </div>

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
        </div>
        <style>
          {`
            @media (max-width: 900px) {
              .auth-side { display: none; }
            }
          `}
        </style>
      </div>
    </>
  );
}
import { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
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
import turtle from "../assets/turtle.png"; // small falling turtle
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

  // Idle-driven "screensaver" turtles
  const [isIdle, setIsIdle] = useState(false);
  const idleTimer = useRef<number | null>(null);

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

  // --- Idle detection: 15s of no interaction → start turtle rain
  useEffect(() => {
    const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel", "scroll"];
    const clearIdleTimer = () => {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    };
    const startIdleTimer = () => {
      clearIdleTimer();
      idleTimer.current = window.setTimeout(() => setIsIdle(true), 15000); // 15s
    };
    const onActivity = () => {
      if (isIdle) setIsIdle(false);
      startIdleTimer();
    };

    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, onActivity, { passive: true }));
    // start timer on mount
    startIdleTimer();

    // visibility change: if user comes back, reset timer and stop turtles
    const onVis = () => {
      if (!document.hidden) {
        setIsIdle(false);
        startIdleTimer();
      } else {
        // when tab hidden, stop rendering turtles to save work
        setIsIdle(false);
        clearIdleTimer();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, onActivity));
      document.removeEventListener("visibilitychange", onVis);
      clearIdleTimer();
    };
  }, [isIdle]);

  type TurtleConf = {
    left: number;  // vw
    size: number;  // px
    fall: number;  // s
    spin: number;  // s
    sway: number;  // s
    delay: number; // s
  };

  const backConfigs = useMemo<TurtleConf[]>(() => {
    const COUNT = 16; // reduced for performance
    const arr: TurtleConf[] = [];
    for (let i = 0; i < COUNT; i++) {
      const baseSize = 58;
      const jitterSize = (Math.random() * 10) - 5;  // -5..+5
      const size = baseSize + jitterSize;

      const jitterX = (Math.random() * 6) - 3;      // -3..+3 vw
      const left = ((i + 0.5) / COUNT) * 100 + jitterX;

      const fall = 18 + (i % 5);                    // 18–22s
      const spin = 18 + (i % 6);                    // 18–23s
      const sway = 10 + (i % 5);                    // 10–14s
      const delay = i * 0.8;                        // stagger, positive

      arr.push({ left, size, fall, spin, sway, delay });
    }
    return arr;
  }, []);

  const frontConfigs = useMemo<TurtleConf[]>(() => {
    const COUNT = 10; // reduced for performance
    const arr: TurtleConf[] = [];
    for (let i = 0; i < COUNT; i++) {
      const baseSize = 84;
      const jitterSize = (Math.random() * 14) - 7;  // -7..+7
      const size = baseSize + jitterSize;

      const jitterX = (Math.random() * 6) - 3;
      const left = ((i + 0.5) / COUNT) * 100 + jitterX;

      const fall = 16 + (i % 5);                    // 16–20s
      const spin = 20 + (i % 6);                    // 20–25s
      const sway = 12 + (i % 5);                    // 12–16s
      const delay = i * 0.75;

      arr.push({ left, size, fall, spin, sway, delay });
    }
    return arr;
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
    position: 'relative',
    overflow: 'hidden',
    padding: '20px'
  };

  const rowStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: 1000,
    display: 'flex',
    gap: 0,
    alignItems: 'stretch',
    justifyContent: 'center',
    position: 'relative',
    zIndex: 2
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
      <div className="login-bg" style={containerStyle}>
          {/* Animated background blobs (more, faster) */}
          <div className="bg-blob blob1" />
          <div className="bg-blob blob2" />
          <div className="bg-blob blob3" />
          <div className="bg-blob blob4" />
          <div className="bg-blob blob5" />
          <div className="bg-blob blob6" />
          {/* Turtle rain only when idle (screensaver mode) */}
          {isIdle && (
            <>
              <div className="turtle-rain-back">
                {backConfigs.map((c, i) => (
                  <span
                    key={`back-${i}`}
                    style={{
                      left: `${c.left}vw`,
                      width: c.size,
                      height: c.size,
                      backgroundImage: `url(${turtle})`,
                      animation: `turtleFall ${c.fall}s linear infinite, turtleSway ${c.sway}s ease-in-out infinite, turtleSpin ${c.spin}s linear infinite`,
                      animationDelay: `${c.delay}s, ${c.delay / 2}s, ${c.delay / 3}s`,
                      opacity: 1
                    } as React.CSSProperties}
                  />
                ))}
              </div>

              <div className="turtle-rain-front">
                {frontConfigs.map((c, i) => (
                  <span
                    key={`front-${i}`}
                    style={{
                      left: `${c.left}vw`,
                      width: c.size,
                      height: c.size,
                      backgroundImage: `url(${turtle})`,
                      animation: `turtleFall ${c.fall}s linear infinite, turtleSway ${c.sway}s ease-in-out infinite, turtleSpin ${c.spin}s linear infinite`,
                      animationDelay: `${c.delay}s, ${c.delay / 2}s, ${c.delay / 3}s`,
                      /* drop-shadow is expensive; skip for perf */
                      opacity: 1
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            </>
          )}
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
            /* --- Turtle rain (two layers: back & front) --- */
            .turtle-rain-back,
            .turtle-rain-front {
              position: fixed;
              inset: 0;
              pointer-events: none;
            }
            .turtle-rain-back { z-index: 0; }   /* behind the row/card (row has z-index:2) */
            .turtle-rain-front { z-index: 3; }  /* above the row/card */

            .turtle-rain-back span,
            .turtle-rain-front span {
              position: absolute;
              top: -110px;                      /* start slightly above the viewport */
              background-size: contain;
              background-position: center;
              background-repeat: no-repeat;
              will-change: transform;
              transform: translateZ(0);         /* promote to its own layer */
              image-rendering: -webkit-optimize-contrast;
              opacity: 1;
            }

            @keyframes turtleFall {
              0%   { transform: translate3d(0, -140px, 0); }
              100% { transform: translate3d(0, 120vh, 0); }
            }
            @keyframes turtleSway {
              0%   { margin-left: -20px; }
              50%  { margin-left:  20px; }
              100% { margin-left: -20px; }
            }
            @keyframes turtleSpin {
              0%   { rotate: 0deg;    }
              100% { rotate: 360deg;  }
            }
            .login-bg {
              min-height: 100vh;
              position: relative;
              /* corner glows + base gradient (very light blue, not pure white) */
              background:
                radial-gradient(900px 700px at 0% 0%,     rgba(48,146,185,0.20), transparent 60%),
                radial-gradient(900px 700px at 100% 0%,   rgba(15,76,129,0.16),  transparent 60%),
                radial-gradient(900px 700px at 0% 100%,   rgba(39,120,198,0.16), transparent 60%),
                radial-gradient(900px 700px at 100% 100%, rgba(167,216,255,0.14), transparent 60%),
                linear-gradient(135deg, #0F5F8F, #2FA4FF, #E9F5FF, #2FA4FF, #0F5F8F);
              background-size: 100% 100%, 100% 100%, 100% 100%, 100% 100%, 700% 700%;
              background-blend-mode: screen, screen, screen, screen, normal;
              animation: gradientDrift 7s ease-in-out infinite alternate;
            }

            /* extra drifting layers to add side-to-side wave parallax */
            .login-bg::before,
            .login-bg::after {
              content: "";
              position: absolute;
              inset: -10% -10% -10% -10%;
              pointer-events: none;
              mix-blend-mode: screen;
              opacity: 0.35;
            }
            .login-bg::before {
              background:
                radial-gradient(70% 50% at 15% 30%, rgba(47,164,255,0.25), transparent 70%),
                radial-gradient(60% 45% at 85% 70%, rgba(14,107,168,0.22), transparent 70%);
              animation: waveLeftRight 9s cubic-bezier(.4,0,.2,1) infinite alternate;
            }
            .login-bg::after {
              background:
                radial-gradient(65% 55% at 80% 20%, rgba(167,216,255,0.25), transparent 70%),
                radial-gradient(60% 50% at 20% 80%, rgba(233,245,255,0.28), transparent 70%);
              animation: waveRightLeft 10.5s cubic-bezier(.4,0,.2,1) infinite alternate;
            }

            /* Floating color blobs — pushed to corners, each with unique timing */
            .bg-blob {
              position: absolute;
              width: 34vmax;
              height: 34vmax;
              border-radius: 50%;
              filter: blur(36px);
              opacity: 0.5;
              mix-blend-mode: screen;
              pointer-events: none;
            }
            /* Top-left */
            .bg-blob.blob1 {
              top: -16%;
              left: -14%;
              background: radial-gradient(circle at 30% 30%, #2FA4FF 0%, rgba(47,164,255,0.7) 35%, rgba(47,164,255,0) 70%);
              animation: b1 6.8s ease-in-out infinite alternate;
            }
            /* Top-right */
            .bg-blob.blob2 {
              top: -14%;
              right: -14%;
              background: radial-gradient(circle at 60% 40%, #73C2FB 0%, rgba(115,194,251,0.7) 35%, rgba(115,194,251,0) 70%);
              animation: b2 7.2s ease-in-out infinite alternate;
            }
            /* Bottom-left */
            .bg-blob.blob3 {
              bottom: -16%;
              left: -12%;
              background: radial-gradient(circle at 50% 50%, #0E6BA8 0%, rgba(14,107,168,0.7) 35%, rgba(14,107,168,0) 70%);
              animation: b3 7.6s ease-in-out infinite alternate;
            }
            /* Bottom-right (light blue-white) */
            .bg-blob.blob4 {
              bottom: -14%;
              right: -12%;
              background: radial-gradient(circle at 50% 50%, rgba(233,245,255,0.9) 0%, rgba(233,245,255,0.55) 35%, rgba(233,245,255,0) 70%);
              animation: b4 6.4s ease-in-out infinite alternate;
            }
            /* Near top edge, slightly left */
            .bg-blob.blob5 {
              top: -8%;
              left: 10%;
              background: radial-gradient(circle at 40% 40%, #A7D8FF 0%, rgba(167,216,255,0.7) 35%, rgba(167,216,255,0) 70%);
              animation: b5 7.8s ease-in-out infinite alternate;
            }
            /* Near bottom edge, slightly right */
            .bg-blob.blob6 {
              bottom: -8%;
              right: 10%;
              background: radial-gradient(circle at 60% 60%, rgba(233,245,255,0.9) 0%, rgba(233,245,255,0.5) 35%, rgba(233,245,255,0) 70%);
              animation: b6 6.9s ease-in-out infinite alternate;
            }

            /* Slower master gradient with side-to-side drift that lingers on blue */
            @keyframes gradientDrift {
              0%   { background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0% 50%; }
              40%  { background-position: 28% 12%, 72% 88%, 12% 68%, 84% 24%, 42% 46%; }
              60%  { background-position: 30% 14%, 70% 86%, 14% 66%, 80% 20%, 58% 54%; }
              100% { background-position: 100% 50%, 0% 50%, 50% 0%, 0% 50%, 100% 50%; }
            }

            /* Two extra parallax waves for ::before / ::after */
            @keyframes waveLeftRight {
              0%   { transform: translateX(-2%) translateY(-1%) scale(1.02); filter: blur(0px); }
              50%  { transform: translateX(2%) translateY(1%)  scale(1.04); filter: blur(1px); }
              100% { transform: translateX(4%) translateY(-2%) scale(1.03); filter: blur(0px); }
            }
            @keyframes waveRightLeft {
              0%   { transform: translateX(2%) translateY(1%)  scale(1.01); filter: blur(0px); }
              50%  { transform: translateX(-2%) translateY(-1%) scale(1.03); filter: blur(1px); }
              100% { transform: translateX(-4%) translateY(2%) scale(1.02); filter: blur(0px); }
            }

            /* Blob motions (gentle but varied, slower) */
            @keyframes b1 { 0%{transform:translate(0,0) scale(.96)} 50%{transform:translate(8%,-7%) scale(1.05)} 100%{transform:translate(14%,6%) scale(1)} }
            @keyframes b2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-9%,6%) scale(1.05) rotate(2deg)} 100%{transform:translate(-15%,-7%) scale(1)} }
            @keyframes b3 { 0%{transform:translate(0,0) scale(.94)} 50%{transform:translate(-7%,9%) scale(1.04)} 100%{transform:translate(6%,-8%) scale(.98)} }
            @keyframes b4 { 0%{transform:translate(0,0) scale(.92)} 50%{transform:translate(-5%,-6%) scale(1.06)} 100%{transform:translate(4%,8%) scale(1)} }
            @keyframes b5 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(7%,-5%) scale(1.05) rotate(-2deg)} 100%{transform:translate(12%,5%) scale(1)} }
            @keyframes b6 { 0%{transform:translate(0,0) scale(.96)} 50%{transform:translate(-8%,4%) scale(1.04)} 100%{transform:translate(6%,-6%) scale(.98)} }

            /* Respect the user's reduced-motion preference */
            @media (prefers-reduced-motion: reduce) {
              .turtle-rain-back span,
              .turtle-rain-front span,
              .bg-blob,
              .login-bg,
              .login-bg::before,
              .login-bg::after {
                animation: none !important;
                transition: none !important;
              }
            }

            @media (max-width: 900px) {
              .auth-side { display: none; }
              .bg-blob { display: none; }
            }
          `}
        </style>
      </div>
    </>
  );
}
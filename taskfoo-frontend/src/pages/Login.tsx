import { useState, useRef, useLayoutEffect, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  UserOutlined,
  LockOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  LoginOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import headerLogo from "../assets/header-logo.png";
import sideArt from "../assets/login-side.png"; // left/right visual
import turtle from "../assets/turtle.png"; // falling turtle
import { login, register } from "../api/auth";

const { Title, Text } = Typography;

type Mode = "login" | "register";

interface LoginFormValues {
  email: string;
  password: string;
}
interface RegisterFormValues {
  name: string;
  surname: string;
  email: string;
  password: string;
}

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialMode: Mode = location.pathname.toLowerCase().includes("register")
    ? "register"
    : "login";

  // --- Global UI state ---
  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);

  // Idle-driven "screensaver" turtles
  const [turtlesOn, setTurtlesOn] = useState(false);      // renders turtle layers
  const [turtlesVisible, setTurtlesVisible] = useState(false); // opacity state (fade in/out)
  const idleTimer = useRef<number | null>(null);
  const fadeTimer = useRef<number | null>(null);

  // Card & side visuals sizing/animation
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number | undefined>(undefined);
  const [leftSideW, setLeftSideW] = useState(0);
  const [rightSideW, setRightSideW] = useState(0);
  const [phase, setPhase] = useState<0 | 1 | 2>(0);
  // Track open state of side panels
  const leftOpen = leftSideW > 0;
  const rightOpen = rightSideW > 0;

  // measure the card height to sync the side panels
  useLayoutEffect(() => {
    const measure = () => {
      if (wrapperRef.current) setCardHeight(wrapperRef.current.offsetHeight);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Initial intro: nudge card then expand the side of the current mode
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 120);
    const t2 = setTimeout(() => setPhase(2), 420);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Expand corresponding side when intro phase completes
  useEffect(() => {
    if (phase === 2 && cardHeight) {
      if (mode === "login") requestAnimationFrame(() => setLeftSideW(cardHeight));
      if (mode === "register")
        requestAnimationFrame(() => setRightSideW(cardHeight));
    }
  }, [phase, cardHeight, mode]);

  // --- Idle detection: 10s no interaction → turtle rain (with 2s fade-out on activity)
  useEffect(() => {
    const ACTIVITY_EVENTS = [
      "mousemove",
      "mousedown",
      "keydown",
      "touchstart",
      "wheel",
      "scroll",
    ];

    const clearIdleTimer = () => {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    };
    const clearFadeTimer = () => {
      if (fadeTimer.current !== null) {
        window.clearTimeout(fadeTimer.current);
        fadeTimer.current = null;
      }
    };

    const startIdleTimer = () => {
      clearIdleTimer();
      idleTimer.current = window.setTimeout(() => {
        // Show & fade-in turtles
        clearFadeTimer();
        setTurtlesOn(true);
        requestAnimationFrame(() => setTurtlesVisible(true));
      }, 5000); // 5 seconds
    };

    const onActivity = () => {
      // Begin fade-out if turtles are showing
      if (turtlesOn) {
        setTurtlesVisible(false);
        clearFadeTimer();
        fadeTimer.current = window.setTimeout(() => {
          setTurtlesOn(false);
        }, 2000); // 2s fade out
      }
      startIdleTimer();
    };

    ACTIVITY_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onActivity, { passive: true })
    );
    startIdleTimer();

    const onVis = () => {
      if (!document.hidden) {
        // When coming back, ensure turtles are hidden and restart idle timer
        setTurtlesVisible(false);
        clearFadeTimer();
        setTurtlesOn(false);
        startIdleTimer();
      } else {
        clearIdleTimer();
        clearFadeTimer();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      ACTIVITY_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, onActivity)
      );
      document.removeEventListener("visibilitychange", onVis);
      clearIdleTimer();
      clearFadeTimer();
    };
  }, [turtlesOn]);

  // Turtle rain configs
  type TurtleConf = {
    left: number; // vw
    size: number; // px
    fall: number; // s
    spin: number; // s
    sway: number; // s
    delay: number; // s
  };
  const backConfigs = useMemo<TurtleConf[]>(() => {
    const COUNT = 16;
    const arr: TurtleConf[] = [];
    for (let i = 0; i < COUNT; i++) {
      const baseSize = 58;
      const size = baseSize + (Math.random() * 10 - 5);
      const left = ((i + 0.5) / COUNT) * 100 + (Math.random() * 6 - 3);
      const fall = 18 + (i % 5);
      const spin = 18 + (i % 6);
      const sway = 10 + (i % 5);
      const delay = i * 0.8;
      arr.push({ left, size, fall, spin, sway, delay });
    }
    return arr;
  }, []);
  const frontConfigs = useMemo<TurtleConf[]>(() => {
    const COUNT = 10;
    const arr: TurtleConf[] = [];
    for (let i = 0; i < COUNT; i++) {
      const baseSize = 84;
      const size = baseSize + (Math.random() * 14 - 7);
      const left = ((i + 0.5) / COUNT) * 100 + (Math.random() * 6 - 3);
      const fall = 16 + (i % 5);
      const spin = 20 + (i % 6);
      const sway = 12 + (i % 5);
      const delay = i * 0.75;
      arr.push({ left, size, fall, spin, sway, delay });
    }
    return arr;
  }, []);

  // --- Mode switch animation (login ⇄ register) ---
  const animateTo = (next: Mode) => {
    if (!cardHeight) {
      setMode(next);
      return;
    }
    if (next === "register") {
      // close left, switch, expand right
      setLeftSideW(0);
      setMode("register");
      requestAnimationFrame(() => setRightSideW(cardHeight));
      if (!location.pathname.toLowerCase().includes("/register")) {
        navigate("/register", { replace: false });
      }
    } else {
      // close right, switch, expand left
      setRightSideW(0);
      setMode("login");
      requestAnimationFrame(() => setLeftSideW(cardHeight));
      if (!location.pathname.toLowerCase().includes("/login")) {
        navigate("/login", { replace: false });
      }
    }
  };

  // --- Form handlers ---
  const onLoginFinish = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      message.success({
        content: "Welcome back! Redirecting to dashboard...",
        duration: 1.5,
        style: { marginTop: 20 },
      });
      setTimeout(() => navigate("/"), 800);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Login failed. Please check your credentials.";
      message.error({ content: errorMessage, duration: 4, style: { marginTop: 20 } });
    } finally {
      setLoading(false);
    }
  };

  const onRegisterFinish = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      await register(values);
      const res = await login(values.email, values.password);
      if (res?.token || res?.accessToken) {
        message.success({
          content: "Your account is ready! Redirecting...",
          duration: 1.5,
          style: { marginTop: 20 },
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

  // --- Shared styles ---
  const containerStyle: React.CSSProperties = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    overflow: "hidden",
    padding: "20px",
  };
  const rowStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 1000,
    display: "flex",
    gap: 0,
    alignItems: "stretch",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
  };

  const wrapperStyleBase: React.CSSProperties = {
    width: "100%",
    maxWidth: 420,
    borderRadius: 16,
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
    overflow: "hidden",
    background: "#ffffff",
    minHeight: 560,
  };
  const wrapperStyleLogin: React.CSSProperties = {
    ...wrapperStyleBase,
    // If the left promo is open, flatten left corners; otherwise, make all corners rounded
    borderTopLeftRadius: leftOpen ? 0 : 16,
    borderBottomLeftRadius: leftOpen ? 0 : 16,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    transform: phase >= 1 ? "translateX(16px)" : "translateX(0)",
    transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)",
  };
  const wrapperStyleRegister: React.CSSProperties = {
    ...wrapperStyleBase,
    // If the right promo is open, flatten right corners; otherwise, make all corners rounded
    borderTopRightRadius: rightOpen ? 0 : 16,
    borderBottomRightRadius: rightOpen ? 0 : 16,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    transform: phase >= 1 ? "translateX(-16px)" : "translateX(0)",
    transition: "transform 320ms cubic-bezier(0.4,0,0.2,1)",
  };

  const capCommon: React.CSSProperties = {
    height: 88,
    background: "#062B43",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  };
  const capLogin: React.CSSProperties = {
    ...capCommon,
    borderTopLeftRadius: leftOpen ? 0 : 16,
    borderTopRightRadius: 16,
  };
  const capRegister: React.CSSProperties = {
    ...capCommon,
    borderTopRightRadius: rightOpen ? 0 : 16,
    borderTopLeftRadius: 16,
  };

  const cardCommon: React.CSSProperties = {
    width: "100%",
    border: "1px solid #f0f0f0",
    borderTop: "none",
    background: "#ffffff",
  };
  const cardLogin: React.CSSProperties = {
    ...cardCommon,
    borderBottomLeftRadius: leftOpen ? 0 : 16,
    borderBottomRightRadius: 16,
    // Remove interior seam when the left side is open; restore if closed
    borderLeft: leftOpen ? "none" : "1px solid #f0f0f0",
  };
  const cardRegister: React.CSSProperties = {
    ...cardCommon,
    borderBottomRightRadius: rightOpen ? 0 : 16,
    borderBottomLeftRadius: 16,
    // Remove interior seam when the right side is open; restore if closed
    borderRight: rightOpen ? "none" : "1px solid #f0f0f0",
  };

  const sideBase: React.CSSProperties = {
    height: cardHeight,
    overflow: "hidden",
    background: "#062B43",
    border: "1px solid #0b3a57",
    boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 1,
    transition:
      "width 480ms cubic-bezier(0.4,0,0.2,1), opacity 300ms ease, transform 300ms ease",
    willChange: "width, transform, opacity",
  } as const;
  const leftSideStyle: React.CSSProperties = {
    ...sideBase,
    width: leftSideW,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    // Hide border and fade out fully when closed to avoid the 1px black line
    border: leftOpen ? "1px solid #0b3a57" : "none",
    opacity: leftOpen ? 1 : 0,
    transform: leftOpen ? "none" : "scaleX(0.96)",
  };
  const rightSideStyle: React.CSSProperties = {
    ...sideBase,
    width: rightSideW,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    // Hide border and fade out fully when closed to avoid the 1px black line
    border: rightOpen ? "1px solid #0b3a57" : "none",
    opacity: rightOpen ? 1 : 0,
    transform: rightOpen ? "none" : "scaleX(0.96)",
  };
  const sideImgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: "fill",
    display: "block",
    transform: "scale(1.0)",
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
  const inputStyle: React.CSSProperties = {
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 15,
  };
  const CONTENT_MIN_HEIGHT = 420; // keeps login/register body heights equal

  // --- Sub-forms ---
  const LoginForm = () => (
    <>
      <div style={headerStyle}>
        <Title level={2} style={titleStyle}>
          Welcome Back
        </Title>
        <Text style={subtitleStyle}>Sign in to your TaskFoo account</Text>
      </div>

      <Form<LoginFormValues>
        name="loginForm"
        layout="vertical"
        onFinish={onLoginFinish}
        size="large"
        requiredMark={false}
      >
        <Form.Item
          name="email"
          label={<Text strong style={{ color: "#374151" }}>Email / Username</Text>}
          rules={[
            { required: true, message: "Please enter your email or username" },
            { min: 3, message: "At least 3 characters required" },
          ]}
          style={{ marginBottom: 12 }}
        >
          <Input
            prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
            placeholder="Enter your email or username"
            style={inputStyle}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label={<Text strong style={{ color: "#374151" }}>Password</Text>}
          rules={[
            { required: true, message: "Please enter your password" },
            { min: 6, message: "Password must be at least 6 characters" },
          ]}
          style={{ marginBottom: 12 }}
        >
          <Input.Password
            prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
            placeholder="Enter your password"
            iconRender={(v) => (v ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            style={inputStyle}
          />
        </Form.Item>

        <div style={{ height: 52 }} />

        <Form.Item style={{ marginBottom: 52 }}>
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
              background: "#3092B9",
              borderColor: "#3092B9",
              fontSize: 16,
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(48, 146, 185, 0.3)",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </Form.Item>

        <Divider style={{ margin: "24px 0", color: "#9ca3af", fontSize: 13 }}>
          <Text type="secondary">or</Text>
        </Divider>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text style={{ color: "#6b7280", fontSize: 15 }}>
            Don&apos;t have an account?{" "}
            <Button
              type="link"
              onClick={() => animateTo("register")}
              style={{
                padding: 0,
                color: "#3092B9",
                fontWeight: 600,
                fontSize: 15,
                textDecoration: "none",
              }}
              icon={<UserAddOutlined style={{ fontSize: 14 }} />}
            >
              Create Account
            </Button>
          </Text>
        </div>
      </Form>
    </>
  );

  const RegisterForm = () => (
    <>
      <div style={headerStyle}>
        <Title level={2} style={titleStyle}>
          Create your account
        </Title>
        <Text style={subtitleStyle}>Join TaskFoo in seconds</Text>
      </div>

      <Form<RegisterFormValues>
        name="registerForm"
        layout="vertical"
        onFinish={onRegisterFinish}
        size="large"
        requiredMark={false}
        scrollToFirstError
      >
        <div style={{ display: "flex", gap: 12 }}>
          <Form.Item
            name="name"
            label={<Text strong style={{ color: "#374151" }}>First Name</Text>}
            rules={[{ required: true, message: "Please enter your first name" }]}
            style={{ flex: 1, marginBottom: 12 }}
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
            style={{ flex: 1, marginBottom: 12 }}
          >
            <Input
              placeholder="Enter your last name"
              prefix={<UserOutlined style={{ color: "#9ca3af" }} />}
              style={inputStyle}
            />
          </Form.Item>
        </div>

        <Form.Item
          name="email"
          label={<Text strong style={{ color: "#374151" }}>Email</Text>}
          rules={[
            { required: true, message: "Please enter your email" },
            { type: "email", message: "Please enter a valid email address" },
          ]}
          style={{ marginBottom: 12 }}
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
          style={{ marginBottom: 12 }}
        >
          <Input.Password
            placeholder="Create a password"
            prefix={<LockOutlined style={{ color: "#9ca3af" }} />}
            iconRender={(v) => (v ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
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
            }}
          >
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </Form.Item>

        <Divider style={{ margin: "24px 0", color: "#9ca3af", fontSize: 13 }}>
          <Text type="secondary">or</Text>
        </Divider>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text style={{ color: "#6b7280", fontSize: 15 }}>
            Already have an account?{" "}
            <Button
              type="link"
              onClick={() => animateTo("login")}
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
    </>
  );

  return (
    <>
      <div className="login-bg" style={containerStyle}>
        {/* Animated background blobs */}
        <div className="bg-blob blob1" />
        <div className="bg-blob blob2" />
        <div className="bg-blob blob3" />
        <div className="bg-blob blob4" />
        <div className="bg-blob blob5" />
        <div className="bg-blob blob6" />

        {/* Turtle rain (BACK layer) — behind the UI */}
        {turtlesOn && (
          <div className={`turtle-wrap-back ${turtlesVisible ? "show" : "hide"}`}>
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
                    opacity: 1,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        )}

        <div style={rowStyle}>
          {/* Left promo (login mode) */}
          <div
            className="auth-side-left"
            style={leftSideStyle}
          >
            <img src={sideArt} alt="Taskfoo promo" style={sideImgStyle} />
          </div>

          {/* Card center */}
          <div
            ref={wrapperRef}
            style={mode === "login" ? wrapperStyleLogin : wrapperStyleRegister}
          >
            <div style={mode === "login" ? capLogin : capRegister}>
              <img
                src={headerLogo}
                alt="Taskfoo Logo"
                style={{
                  height: 356,
                  objectFit: "contain",
                  transform: "translateY(22px)",
                }}
              />
            </div>

            <Card
              style={mode === "login" ? cardLogin : cardRegister}
              bordered={false}
              bodyStyle={{ padding: 20, minHeight: CONTENT_MIN_HEIGHT, display: "flex", flexDirection: "column" }}
            >
              <div style={{ flex: 1, overflowY: "auto" }}>
                {mode === "login" ? <LoginForm /> : <RegisterForm />}
              </div>

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
                  {mode === "login"
                    ? "Secure login powered by TaskFoo"
                    : "Welcome to TaskFoo — let’s get you set up"}
                </Text>
              </div>
            </Card>
          </div>

          {/* Right promo (register mode) */}
          <div
            className="auth-side-right"
            style={rightSideStyle}
          >
            <img src={sideArt} alt="Taskfoo promo" style={sideImgStyle} />
          </div>
        </div>

        {/* Turtle rain (FRONT layer) — above the UI */}
        {turtlesOn && (
          <div className={`turtle-wrap-front ${turtlesVisible ? "show" : "hide"}`}>
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
                    opacity: 1,
                  } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        )}

        {/* Styles */}
        <style>
          {`
          .turtle-wrap-back, .turtle-wrap-front { position: fixed; inset: 0; pointer-events: none; opacity: 0; transition: opacity 2s ease; }
          .turtle-wrap-back.show, .turtle-wrap-front.show { opacity: 1; }
          .turtle-wrap-back.hide, .turtle-wrap-front.hide { opacity: 0; }

          /* Layering relative to the rest of the UI */
          .turtle-wrap-back { z-index: 1; }   /* behind row/card (row has z-index:2) */
          .turtle-wrap-front { z-index: 1000; } /* above everything interactive */

          /* Turtle layers (structure stays same) */
          .turtle-rain-back, .turtle-rain-front { position: fixed; inset: 0; pointer-events: none; }
          .turtle-rain-back { /* stays behind */ }
          .turtle-rain-front { /* stays above */ }
          .turtle-rain-back span, .turtle-rain-front span {
            position: absolute; top: -110px; background-size: contain; background-position: center;
            background-repeat: no-repeat; will-change: transform; transform: translateZ(0);
            image-rendering: -webkit-optimize-contrast; opacity: 1;
          }
          /* Subtle depth cues */
          .turtle-rain-back span { filter: blur(0.4px); }
          .turtle-rain-front span { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.25)); }
          @keyframes turtleFall { 0% { transform: translate3d(0, -140px, 0); } 100% { transform: translate3d(0, 120vh, 0); } }
          @keyframes turtleSway { 0% { margin-left: -20px; } 50% { margin-left: 20px; } 100% { margin-left: -20px; } }
          @keyframes turtleSpin { 0% { rotate: 0deg; } 100% { rotate: 360deg; } }

          /* Gradient + blobs */
          .login-bg {
            min-height: 100vh; position: relative;
            background:
              radial-gradient(900px 700px at 0% 0%, rgba(48,146,185,0.20), transparent 60%),
              radial-gradient(900px 700px at 100% 0%, rgba(15,76,129,0.16), transparent 60%),
              radial-gradient(900px 700px at 0% 100%, rgba(39,120,198,0.16), transparent 60%),
              radial-gradient(900px 700px at 100% 100%, rgba(167,216,255,0.14), transparent 60%),
              linear-gradient(135deg, #0F5F8F, #2FA4FF, #E9F5FF, #2FA4FF, #0F5F8F);
            background-size: 100% 100%, 100% 100%, 100% 100%, 100% 100%, 700% 700%;
            background-blend-mode: screen, screen, screen, screen, normal;
            animation: gradientDrift 7s ease-in-out infinite alternate;
          }
          .login-bg::before, .login-bg::after {
            content: ""; position: absolute; inset: -10% -10% -10% -10%; pointer-events: none;
            mix-blend-mode: screen; opacity: 0.35;
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
          .bg-blob { position: absolute; width: 34vmax; height: 34vmax; border-radius: 50%; filter: blur(36px); opacity: 0.5; mix-blend-mode: screen; pointer-events: none; }
          .bg-blob.blob1 { top: -16%; left: -14%; background: radial-gradient(circle at 30% 30%, #2FA4FF 0%, rgba(47,164,255,0.7) 35%, rgba(47,164,255,0) 70%); animation: b1 6.8s ease-in-out infinite alternate; }
          .bg-blob.blob2 { top: -14%; right: -14%; background: radial-gradient(circle at 60% 40%, #73C2FB 0%, rgba(115,194,251,0.7) 35%, rgba(115,194,251,0) 70%); animation: b2 7.2s ease-in-out infinite alternate; }
          .bg-blob.blob3 { bottom: -16%; left: -12%; background: radial-gradient(circle at 50% 50%, #0E6BA8 0%, rgba(14,107,168,0.7) 35%, rgba(14,107,168,0) 70%); animation: b3 7.6s ease-in-out infinite alternate; }
          .bg-blob.blob4 { bottom: -14%; right: -12%; background: radial-gradient(circle at 50% 50%, rgba(233,245,255,0.9) 0%, rgba(233,245,255,0.55) 35%, rgba(233,245,255,0) 70%); animation: b4 6.4s ease-in-out infinite alternate; }
          .bg-blob.blob5 { top: -8%; left: 10%; background: radial-gradient(circle at 40% 40%, #A7D8FF 0%, rgba(167,216,255,0.7) 35%, rgba(167,216,255,0) 70%); animation: b5 7.8s ease-in-out infinite alternate; }
          .bg-blob.blob6 { bottom: -8%; right: 10%; background: radial-gradient(circle at 60% 60%, rgba(233,245,255,0.9) 0%, rgba(233,245,255,0.5) 35%, rgba(233,245,255,0) 70%); animation: b6 6.9s ease-in-out infinite alternate; }

          @keyframes gradientDrift {
            0% { background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0% 50%; }
            40% { background-position: 28% 12%, 72% 88%, 12% 68%, 84% 24%, 42% 46%; }
            60% { background-position: 30% 14%, 70% 86%, 14% 66%, 80% 20%, 58% 54%; }
            100% { background-position: 100% 50%, 0% 50%, 50% 0%, 0% 50%, 100% 50%; }
          }
          @keyframes waveLeftRight {
            0% { transform: translateX(-2%) translateY(-1%) scale(1.02); filter: blur(0px); }
            50% { transform: translateX(2%) translateY(1%) scale(1.04); filter: blur(1px); }
            100% { transform: translateX(4%) translateY(-2%) scale(1.03); filter: blur(0px); }
          }
          @keyframes waveRightLeft {
            0% { transform: translateX(2%) translateY(1%) scale(1.01); filter: blur(0px); }
            50% { transform: translateX(-2%) translateY(-1%) scale(1.03); filter: blur(1px); }
            100% { transform: translateX(-4%) translateY(2%) scale(1.02); filter: blur(0px); }
          }
          @keyframes b1 { 0%{transform:translate(0,0) scale(.96)} 50%{transform:translate(8%,-7%) scale(1.05)} 100%{transform:translate(14%,6%) scale(1)} }
          @keyframes b2 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(-9%,6%) scale(1.05) rotate(2deg)} 100%{transform:translate(-15%,-7%) scale(1)} }
          @keyframes b3 { 0%{transform:translate(0,0) scale(.94)} 50%{transform:translate(-7%,9%) scale(1.04)} 100%{transform:translate(6%,-8%) scale(.98)} }
          @keyframes b4 { 0%{transform:translate(0,0) scale(.92)} 50%{transform:translate(-5%,-6%) scale(1.06)} 100%{transform:translate(4%,8%) scale(1)} }
          @keyframes b5 { 0%{transform:translate(0,0) scale(1)} 50%{transform:translate(7%,-5%) scale(1.05) rotate(-2deg)} 100%{transform:translate(12%,5%) scale(1)} }
          @keyframes b6 { 0%{transform:translate(0,0) scale(.96)} 50%{transform:translate(-8%,4%) scale(1.04)} 100%{transform:translate(6%,-6%) scale(.98)} }

          @media (prefers-reduced-motion: reduce) {
            .turtle-rain-back span, .turtle-rain-front span,
            .bg-blob, .login-bg, .login-bg::before, .login-bg::after {
              animation: none !important; transition: none !important;
            }
          }
          @media (max-width: 900px) {
            .auth-side-left, .auth-side-right, .bg-blob { display: none; }
          }
        `}
        </style>
      </div>
    </>
  );
}
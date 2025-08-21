// src/App.tsx
import { useEffect, useState, type JSX } from "react";
import { Layout, theme, Dropdown, Avatar, Space, Tooltip } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Board from "./pages/Board";
import NewTask from "./pages/NewTask";
import NewProject from "./pages/NewProject";
import NewEpic from "./pages/NewEpics";
import NewUser from "./pages/NewUser";
import Users from "./pages/Users";
import Epics from "./pages/Epics";
import Projects from "./pages/Projects";
import TasksGantt from "./pages/TasksGantt";
import TaskEdit from "./pages/TaskEdit";
import Login from "./pages/Login"; // <= Login sayfası

import Sidebar from "./components/Sidebar";
import headerLogo from "./assets/header-logo.png";

import { connectWebSocket, disconnectWebSocket, initTaskWs } from "./ws/client";
import { me, logout } from "./api/auth";
import Register from "./pages/Register";

const { Header, Content } = Layout;

/** Basit koruma: token yoksa /login */
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

/** Korumalı shell: Sidebar + Header + Content; WS sadece burada bağlanır */
function AppShell({ children }: { children: JSX.Element }) {
  const { token: antToken } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  const [currentUser, setCurrentUser] = useState<null | {
    name: string;
    surname: string;
    email: string;
  }>(null);

  // Aynı kullanıcı için stabil arka plan rengi (avatar) üret
  const colorFromString = (seed: string) => {
    const str = seed || "user";
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0; // 32-bit
    }
    // 0-360 derece arası bir hue
    const hue = Math.abs(hash) % 360;
    // Ant tasarımına uygun, doygunluğu kısık ve açık bir ton
    return `hsl(${hue} 70% 45%)`;
  };

  // Kullanıcı baş harfleri
  const initials = (u: { name?: string; surname?: string; email?: string }) => {
    const n = (u.name ?? "").trim();
    const s = (u.surname ?? "").trim();
    if (n || s) {
      return `${n.charAt(0)}${s.charAt(0)}`.toUpperCase() || "U";
    }
    // name/surname yoksa email'in ilk harfi
    return (u.email?.charAt(0) ?? "U").toUpperCase();
  };

  useEffect(() => {
    // sadece login'li kullanıcıdayken çağrılır (ProtectedRoute sayesinde)
    connectWebSocket();
    initTaskWs();

    // Kullanıcı bilgisini al
    (async () => {
      try {
        const data = await me();
        setCurrentUser({
          name: data.name,
          surname: data.surname,
          email: data.email,
        });
      } catch {
        // Token bozuksa otomatik çıkış
        logout();
      }
    })();

    return () => disconnectWebSocket();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
      <Layout>
        <Header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: 40,
            position: "relative",
          }}
        >
          <div style={{ margin: `${collapsed ? 16 : 35}px 1px 1px` }}>
            <img
              src={headerLogo}
              alt="Taskfoo Project Management Web Application"
              style={{ height: "300px", objectFit: "contain" }}
            />
          </div>

          {/* Sağ üst kullanıcı kartı (daha belirgin) */}
          <div
            style={{
              position: "absolute",
              right: 16,
              top: 0,
              height: "100%",
              display: "flex",
              alignItems: "center",
            }}
          >
            {currentUser && (
              <Dropdown
                placement="bottomRight"
                overlayStyle={{ minWidth: 240 }}
                menu={{
                  items: [
                    {
                      key: "email",
                      disabled: true,
                      label: <div style={{ opacity: 0.85 }}>{currentUser.email}</div>,
                    },
                    { type: "divider" },
                    {
                      key: "logout",
                      label: "Logout",
                      onClick: () => logout(),
                    },
                  ],
                }}
              >
                <div
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    height: 40,
                    padding: "6px 12px",
                    borderRadius: 4,
                    background: "rgba(6, 43, 67, 0.85)", // koyu mavi-cam efekt
                    border: "1px solid rgba(255,255,255,0.08)",
                    boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
                    color: "#e6f4ff",
                    transition: "transform .12s ease, box-shadow .12s ease",
                  }}
                >
                  <div style={{ position: "relative", lineHeight: 0 }}>
                    <Tooltip title={`${currentUser.name} ${currentUser.surname}`}>
                      <Avatar
                        size={36}
                        style={{
                          backgroundColor: colorFromString(
                            currentUser.email || currentUser.name || "user"
                          ),
                          color: "#fff",
                          fontWeight: 700,
                        }}
                      >
                        {initials(currentUser)}
                      </Avatar>
                    </Tooltip>
                    <span
                      style={{
                        position: "absolute",
                        right: -2,
                        bottom: -2,
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        background: "#52c41a", // online dot
                        border: "2px solid #0b1b29",
                      }}
                    />
                  </div>

                  <div style={{ lineHeight: 1.1, display: "flex", flexDirection: "column" }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        letterSpacing: 0.2,
                        color: "#e6f4ff",
                      }}
                    >
                      {currentUser.name} {currentUser.surname}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        opacity: 0.75,
                        color: "#c8d1da",
                      }}
                    >
                      {currentUser.email}
                    </span>
                  </div>
                </div>
              </Dropdown>
            )}
          </div>
        </Header>

        <Content style={{ padding: 0, background: antToken.colorBgContainer }}>
          <style>{`
            .ant-menu-dark .ant-menu-item-selected {
              background-color: #3092B9 !important;
            }
          `}</style>

          {children}
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      {/* public */}
      <Route path="/login" element={<Login />} />

      {/* redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* protected */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppShell>
              <Dashboard />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <ProtectedRoute>
            <AppShell>
              <Tasks />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/board"
        element={
          <ProtectedRoute>
            <AppShell>
              <Board />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/new"
        element={
          <ProtectedRoute>
            <AppShell>
              <NewTask />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects/new"
        element={
          <ProtectedRoute>
            <AppShell>
              <NewProject />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/epics/new"
        element={
          <ProtectedRoute>
            <AppShell>
              <NewEpic />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/new"
        element={
          <ProtectedRoute>
            <AppShell>
              <NewUser />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <ProtectedRoute>
            <AppShell>
              <Users />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/epics"
        element={
          <ProtectedRoute>
            <AppShell>
              <Epics />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <AppShell>
              <Projects />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/gantt"
        element={
          <ProtectedRoute>
            <AppShell>
              <TasksGantt />
            </AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/tasks/:id/edit"
        element={
          <ProtectedRoute>
            <AppShell>
              <TaskEdit />
            </AppShell>
          </ProtectedRoute>
        }
      />

      {/* bilinmeyen route → dashboard'a */}
      <Route path="*" element={<Navigate to="/board" replace />} />

     


<Route path="/register" element={<Register />} />
    </Routes>
  );
}
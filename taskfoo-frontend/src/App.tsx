// src/App.tsx
import { Layout, theme } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Sidebar from "./components/Sidebar";
import Board from "./pages/Board";
import NewTask from "./pages/NewTask";
import NewProject from "./pages/NewProject";
import NewEpic from "./pages/NewEpics";
import NewUser from "./pages/NewUser";
import Users from "./pages/Users";
import Epics from "./pages/Epics";
import Projects from "./pages/Projects";
import headerLogo from "./assets/header-logo.png";
import TaskEdit from "./pages/TaskEdit";

import { useEffect, useState } from "react";
import { connectWebSocket, disconnectWebSocket, initTaskWs } from "./ws/client"; // 👈
import TasksGantt from "./pages/TasksGantt";

const { Header, Content } = Layout;

export default function App() {
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  // Uygulama ayağa kalkınca WS bağlan + topic init; unmount'ta kopar
  useEffect(() => {
    connectWebSocket();
    initTaskWs();

    return () => {
      disconnectWebSocket();
    };
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
          }}
        >
          <div style={{ margin: `${collapsed ? 16 : 35}px 1px 1px` }}>
            <img
              src={headerLogo}
              alt="Taskfoo Project Management Web Application"
              style={{ height: "300px", objectFit: "contain" }}
            />
          </div>
        </Header>

        <Content style={{ padding: 0, background: token.colorBgContainer }}>
          <style>{`
            .ant-menu-dark .ant-menu-item-selected {
              background-color: #3092B9 !important;
            }
          `}</style>

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/board" element={<Board />} />
            <Route path="/tasks/new" element={<NewTask />} />
            <Route path="/projects/new" element={<NewProject />} />
            <Route path="/epics/new" element={<NewEpic />} />
            <Route path="/users/new" element={<NewUser />} />
            <Route path="/users" element={<Users />} />
            <Route path="/epics" element={<Epics />} />
            <Route path="/projects" element={<Projects />} />        
            <Route path="/gantt" element={<TasksGantt />} />
            <Route path="/tasks/:id/edit" element={<TaskEdit />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
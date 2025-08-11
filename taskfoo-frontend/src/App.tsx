// src/App.tsx
import { Layout, theme } from "antd";
import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import Sidebar from "./components/Sidebar";
import Board from "./pages/Board";


import { useState } from "react";

const { Header, Content } = Layout;

export default function App() {
  const { token } = theme.useToken();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />

      <Layout>
        <Header style={{ color: "#fff" }}>TaskFoo</Header>
        <Content style={{ padding: 24, background: token.colorBgContainer }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/board" element={<Board />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
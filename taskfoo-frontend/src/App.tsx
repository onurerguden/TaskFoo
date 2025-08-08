import { Layout, Menu, theme } from "antd";
import { Routes, Route, Link } from "react-router-dom";
import Dashboard from "./pages/Dashboard";

const { Header, Sider, Content } = Layout;

export default function App() {
  const { token } = theme.useToken();

  return (
    <Layout style={{ minHeight: "100vh" }}>
      <Sider>
        <Menu
          theme="dark"
          items={[
            { key: "dash", label: <Link to="/">Dashboard</Link> },
            { key: "tasks", label: <Link to="/tasks">Tasks</Link> },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ color: "#fff" }}>TaskFoo</Header>
        <Content style={{ padding: 24, background: token.colorBgContainer }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tasks" element={<Dashboard />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
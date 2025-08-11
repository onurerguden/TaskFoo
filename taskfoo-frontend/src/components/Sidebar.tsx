// src/components/Sidebar.tsx
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import {
  DashboardOutlined,
  ProfileOutlined,
  AppstoreOutlined,
  PlusOutlined,
  ProjectOutlined,
  FlagOutlined,
  TeamOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";

import logo from "../assets/taskfoo-logo.png"; // Logo yolu

const { Sider } = Layout;

const items: MenuProps["items"] = [
  { key: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { key: "/board", label: "Board", icon: <AppstoreOutlined /> },

  // Tasks
  { key: "/tasks", label: "Tasks", icon: <ProfileOutlined /> },
  { key: "/tasks/new", label: "New Task", icon: <PlusOutlined /> },

  { type: "divider" },

  // Projects
  { key: "/projects", label: "Projects", icon: <UnorderedListOutlined /> },
  { key: "/projects/new", label: "New Project", icon: <ProjectOutlined /> },

  // Epics
  { key: "/epics", label: "Epics", icon: <UnorderedListOutlined /> },
  { key: "/epics/new", label: "New Epic", icon: <FlagOutlined /> },

  // Users
  { key: "/users", label: "Users", icon: <UnorderedListOutlined /> },
  { key: "/users/new", label: "New User", icon: <TeamOutlined /> },
];

type Props = {
  collapsed?: boolean;
  onCollapse?: (v: boolean) => void;
};

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const keys: string[] = (items ?? [])
    .map((it) => {
      const k = (it as any)?.key;
      return typeof k === "string" ? k : null;
    })
    .filter((k): k is string => !!k);

  const exact = keys.find((k) => k === pathname);
  const longestPrefix = keys
    .filter((k) => pathname.startsWith(k))
    .sort((a, b) => b.length - a.length)[0];

  const selectedKey = exact ?? longestPrefix ?? pathname;

  return (
    <Sider collapsible collapsed={collapsed} onCollapse={onCollapse} breakpoint="lg">
      {/* Logo Alanı */}
      <div
        onClick={() => navigate("/dashboard")}
        style={{
          height: 56,
          margin: 12,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          padding: "8px 10px",
          background: "rgba(255,255,255,0.06)",
        }}
      >
        <img
          src={logo}
          alt="TaskFoo"
          style={{
            width: 28,
            height: 28,
            objectFit: "contain",
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,.15))",
          }}
        />
        {!collapsed && (
          <span style={{ color: "#fff", fontWeight: 600, letterSpacing: 0.3 }}>
            TaskFoo
          </span>
        )}
      </div>

      {/* Menü */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={items}
        onClick={(e) => navigate(e.key)}
      />
    </Sider>
  );
}
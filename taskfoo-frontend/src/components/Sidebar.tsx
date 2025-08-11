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
} from "@ant-design/icons";

const { Sider } = Layout;

// Define menu items (path = key)
const items: MenuProps["items"] = [
  { key: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { key: "/tasks", label: "Tasks", icon: <ProfileOutlined /> },
  { key: "/tasks/new", label: "New Task", icon: <PlusOutlined /> },
  { key: "/board", label: "Board", icon: <AppstoreOutlined /> },
  { type: "divider" },
  { key: "/projects/new", label: "New Project", icon: <ProjectOutlined /> },
  { key: "/epics/new", label: "New Epic", icon: <FlagOutlined /> },
  { key: "/users/new", label: "New User", icon: <TeamOutlined /> },
];

type Props = {
  collapsed?: boolean;
  onCollapse?: (v: boolean) => void;
};

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // collect only string keys from items (skip dividers, groups, etc.)
  const keys: string[] = (items ?? [])
    .map((it) => {
      const k = (it as any)?.key;
      return typeof k === "string" ? k : null;
    })
    .filter((k): k is string => !!k);

  // 1) exact match wins
  const exact = keys.find((k) => k === pathname);

  // 2) otherwise, choose the longest prefix match (/tasks/new -> /tasks/new > /tasks)
  const longestPrefix =
    keys
      .filter((k) => pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];

  const selectedKey = exact ?? longestPrefix ?? pathname;

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="lg"
    >
      {/* logo / brand area */}
      <div
        style={{
          height: 48,
          margin: 12,
          borderRadius: 6,
          background: "rgba(255,255,255,0.15)",
        }}
      />

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
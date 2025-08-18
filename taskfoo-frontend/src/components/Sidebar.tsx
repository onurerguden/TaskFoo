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
  BarChartOutlined,
} from "@ant-design/icons";

import logo from "../assets/taskfoo-logo.png"; // Logo yolu

const { Sider } = Layout;

const items: MenuProps["items"] = [
  { key: "/board", label: "Board", icon: <AppstoreOutlined /> },
  { key: "/gantt", label: "Gantt Chart", icon: <BarChartOutlined /> },
  { key: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  
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

// src/components/Sidebar.tsx

// ...
  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="lg"
      // İstersen Sider'a da minik üst padding verebilirsin
      // style={{ paddingTop: collapsed ? 8 : 12 }}
    >
      {/* Logo Alanı */}
      <div
        onClick={() => navigate("/board")}
        style={{
          // eski: margin: 12,
          // Üste extra boşluk:
          margin: `${collapsed ? 16 : 28}px 12px 12px`,
          height: 120,
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          background: "transparent",
          // sticker gibi dursun ve üst boşluk artsın diye üst padding de ekledim
          padding: `${collapsed ? 6 : 12}px 0 10px`,
        }}
      >
        <img
          src={logo}
          alt="TaskFoo"
          style={{
            width: collapsed ? 56 : "80%",
            height: "auto",
            objectFit: "contain",
            transition: "all 0.2s ease-in-out",
            filter: "drop-shadow(0 1px 1px rgba(0,0,0,.15))",
          }}
        />
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
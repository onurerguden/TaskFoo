// src/components/Sidebar.tsx
import { Layout, Menu } from "antd";
import type { MenuProps } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { DashboardOutlined, ProfileOutlined } from "@ant-design/icons";

const { Sider } = Layout;

// Menü öğelerini tek yerde topluyoruz (path = key)
const items: MenuProps["items"] = [
  { key: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
  { key: "/tasks",     label: "Tasks",     icon: <ProfileOutlined /> },
];

type Props = {
  collapsed?: boolean;
  onCollapse?: (v: boolean) => void;
};

export default function Sidebar({ collapsed, onCollapse }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Alt rota durumunda da doğru sekme seçilsin (örn. /tasks/123)
  const selectedKey =
    (items ?? [])
      .map(i => String(i?.key))
      .find(k => pathname === k || pathname.startsWith(k + "/")) ?? pathname;

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={onCollapse}
      breakpoint="lg"       // ekran küçülünce otomatik daralt
    >
      {/* logo/başlık alanı (istersen logonu koy) */}
      <div style={{
        height: 48, margin: 12, borderRadius: 6,
        background: "rgba(255,255,255,0.15)"
      }} />

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
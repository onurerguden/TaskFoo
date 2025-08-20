import { Button, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

type Props = {
  title: string;
  actionText: string;
  to: string; // navigate target
  style?: React.CSSProperties;
};

export default function PageHeader({ title, actionText, to, style }: Props) {
  const nav = useNavigate();
  return (
    <div
      style={{
        background: "#3092B9", 
        padding: "8px 16px",
        marginBottom: 12,
        ...style,
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Typography.Title
          level={1}
          style={{ color: "white", margin: 0, fontSize: 20, fontWeight: 600 }}
        >
          {title}
        </Typography.Title>
        <Button
  type="primary"
  onClick={() => nav(to)}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 14px",
    background: "white",
    color: "#1e40af",
    border: "none",
    borderRadius: 8,
    fontWeight: 600,
    boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
    whiteSpace: "nowrap", // küçülünce yazının taşmasını engeller
  }}
>
  <PlusOutlined style={{ fontSize: 16 }} />
  <span>{actionText}</span>
</Button>
      </div>
    </div>
  );
}
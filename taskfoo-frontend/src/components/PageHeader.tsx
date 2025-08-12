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
          icon={<PlusOutlined />}
          onClick={() => nav(to)}
          style={{ background: "white", color: "#1e40af", border: "none" }}
        >
          {actionText}
        </Button>
      </div>
    </div>
  );
}
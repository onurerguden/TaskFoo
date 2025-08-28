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
            padding: "8px 20px",
            background: "rgba(6, 43, 67, 0.85)",
            color: "white",
            border: "none",
            borderRadius: 999,
            fontWeight: 600,
            boxShadow: "0 2px 8px rgba(48,146,185,0.10)",
            whiteSpace: "nowrap",
            marginLeft: "auto",
            transition: "all 0.15s",
          }}
          onMouseOver={e => {
            (e.currentTarget as HTMLElement).style.background = "#fff";
            (e.currentTarget as HTMLElement).style.color = "#3092B9";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(48,146,185,0.13)";
          }}
          onMouseOut={e => {
            (e.currentTarget as HTMLElement).style.background = "rgba(6, 43, 67, 0.85)";
            (e.currentTarget as HTMLElement).style.color = "white";
            (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 8px rgba(48,146,185,0.10)";
          }}
        >
          <PlusOutlined style={{ fontSize: 16 }} />
          <span>{actionText}</span>
        </Button>
      </div>
    </div>
  );
}
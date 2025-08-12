import { Typography } from "antd";
import { PlusCircleOutlined } from "@ant-design/icons";

type Props = {
  title: string;
  icon?: React.ReactNode; // default PlusCircleOutlined
  style?: React.CSSProperties;
};

export default function PageHeaderIcon({ title, icon, style }: Props) {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
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
        {icon || <PlusCircleOutlined style={{ color: "white", fontSize: 20 }} />}
        <Typography.Title
          level={1}
          style={{
            color: "white",
            margin: 4,
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {title}
        </Typography.Title>
      </div>
    </div>
  );
}
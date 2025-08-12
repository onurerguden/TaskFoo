// src/components/PageHeaderJust.tsx
import { Typography } from "antd";

const { Title } = Typography;

type Props = {
  title: string;
  style?: React.CSSProperties;
};

export default function PageHeaderJust({ title, style }: Props) {
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
        <Title
          level={1}
          style={{
            color: "white",
            margin: 4,
            fontSize: 20,
            fontWeight: 600,
          }}
        >
          {title}
        </Title>
      </div>
    </div>
  );
}
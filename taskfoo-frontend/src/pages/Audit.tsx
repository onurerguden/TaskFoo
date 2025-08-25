import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  Input,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import dayjs, { Dayjs } from "dayjs";
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import api from "../api/client";
import PageHeaderIcon from "../components/PageHeaderIcon";
import { wsSubscribe } from "../ws/client";

const { Text } = Typography;
const { RangePicker } = DatePicker;

/** ----- Types (backend'le uyumlu) ----- */
type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGOUT";

type AuditEvent = {
  id: number;
  action: AuditAction;
  actorId?: number | null;
  actorName?: string | null;
  createdAt: string;
  entityId?: number | null;
  entityType?: string | null;
  pageContext?: string | null;
  ipAddress?: string | null;
  requestId?: string | null;
  clientChangeId?: string | null;
  metadata?: any;        // JSON (Map<String,Object>)
  changedFields?: any;   // JSON (Map<String,{from:any,to:any}> veya benzeri)
};

/** ----- helpers ----- */
const ACTION_COLORS: Record<AuditAction, { fg: string; bg: string; icon?: React.ReactNode }> = {
  CREATE:        { fg: "#16a34a", bg: "#f0fdf4", icon: <SafetyCertificateOutlined /> },
  UPDATE:        { fg: "#2563eb", bg: "#eff6ff", icon: <ThunderboltOutlined /> },
  DELETE:        { fg: "#dc2626", bg: "#fef2f2", icon: <CloseCircleOutlined /> },
  LOGIN_SUCCESS: { fg: "#10b981", bg: "#ecfdf5", icon: <CheckCircleOutlined /> },
  LOGIN_FAILURE: { fg: "#f59e0b", bg: "#fffbeb", icon: <ExclamationCircleOutlined /> },
  LOGOUT:        { fg: "#6b7280", bg: "#f9fafb" },
};

function ActionTag({ action }: { action: AuditAction }) {
  const c = ACTION_COLORS[action] || { fg: "#374151", bg: "#f3f4f6" };
  return (
    <Tag style={{ color: c.fg, backgroundColor: c.bg, border: `1px solid ${c.fg}22`, borderRadius: 4 }}>
      <Space size={6}>
        {c.icon}
        <span>{action}</span>
      </Space>
    </Tag>
  );
}

function JsonPretty({ value }: { value: any }) {
  if (value == null) return <Text type="secondary">-</Text>;
  if (typeof value === "string") {
    try { return <pre style={preStyle}>{JSON.stringify(JSON.parse(value), null, 2)}</pre>; }
    catch { return <pre style={preStyle}>{value}</pre>; }
  }
  return <pre style={preStyle}>{JSON.stringify(value, null, 2)}</pre>;
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: 12,
  background: "#0b1020",
  color: "#e6edf3",
  borderRadius: 6,
  fontSize: 12,
  lineHeight: 1.45,
  overflow: "auto",
};

/** ----- Fetcher ----- */
async function fetchAudit(params: {
  from?: string;
  to?: string;
  action?: AuditAction | "ALL";
  entityType?: string;
  q?: string;
  page?: number;
  size?: number;
}) {
  const query = new URLSearchParams();
  if (params.from) query.set("from", params.from);
  if (params.to) query.set("to", params.to);
  if (params.action && params.action !== "ALL") query.set("action", params.action);
  if (params.entityType) query.set("entityType", params.entityType);
  if (params.q) query.set("q", params.q);
  if (params.page != null) query.set("page", String(params.page));
  if (params.size != null) query.set("size", String(params.size));

  // Backend'de uygun bir endpoint olmalı: GET /api/audit-events
  const res = await api.get<{ content: AuditEvent[]; total: number }>(
    `/api/audit-events?${query.toString()}`
  ).catch(async (e) => {
    // Eğer pagination yoksa ham liste dönüyorsa bunu da destekleyelim
    if (e?.response?.status === 404 || e?.response?.status === 400) {
      const r = await api.get<AuditEvent[]>(`/api/audit-events`);
      return { data: { content: r.data, total: r.data.length } };
    }
    throw e;
  });
  return res.data;
}

/** ----- Page ----- */
export default function AuditPage() {
  const qc = useQueryClient();

  // --- filters ---
  const [range, setRange] = useState<[Dayjs, Dayjs] | undefined>(() => {
    const to = dayjs();
    const from = to.subtract(14, "day");
    return [from, to];
  });
  const [action, setAction] = useState<AuditAction | "ALL">("ALL");
  const [entityType, setEntityType] = useState<string | undefined>();
  const [q, setQ] = useState("");

  // pagination (server veya client)
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(20);

  // data
  const { data, isLoading, isError, error, refetch } = useQuery<{ content: AuditEvent[]; total: number }>({
    queryKey: ["audit-events", {
      from: range?.[0]?.toISOString(),
      to: range?.[1]?.toISOString(),
      action, entityType, q, page, size
    }],
    queryFn: () => fetchAudit({
      from: range?.[0]?.toISOString(),
      to: range?.[1]?.toISOString(),
      action,
      entityType,
      q,
      page: page - 1, // backend 0-index ise
      size
    }),
    placeholderData: (prev) => prev,
  });

  const items = data?.content ?? [];
  const total = data?.total ?? items.length;

  // canlı güncelleme — backend bir yere publish ediyorsa
  useEffect(() => {
    const off1 = wsSubscribe("/topic/audit", () => {
      qc.invalidateQueries({ queryKey: ["audit-events"] });
    });
    // audit event üretmeyen yerlerde istersen /topic/tasks’a da kulak verebilirsin:
    const off2 = wsSubscribe("/topic/tasks", () => {
      // task değiştiyse audit de artmış olabilir:
      qc.invalidateQueries({ queryKey: ["audit-events"] });
    });
    return () => {
      off1?.();
      off2?.();
    };
  }, [qc]);

  // derived metrics
  const byAction = useMemo(() => {
    const m = new Map<AuditAction, number>();
    (items as AuditEvent[]).forEach(e => {
      m.set(e.action, (m.get(e.action) || 0) + 1);
    });
    return m;
  }, [items]);

  const loginSucc = byAction.get("LOGIN_SUCCESS") || 0;
  const loginFail = byAction.get("LOGIN_FAILURE") || 0;
  const crudCreate = byAction.get("CREATE") || 0;
  const crudUpdate = byAction.get("UPDATE") || 0;
  const crudDelete = byAction.get("DELETE") || 0;

  const columns: ColumnsType<AuditEvent> = [
    {
      title: <Text strong>Time</Text>,
      dataIndex: "createdAt",
      width: 180,
      render: (v: string) => (
        <Space direction="vertical" size={0}>
          <Text style={{ fontFamily: "monospace" }}>{dayjs(v).format("YYYY-MM-DD")}</Text>
          <Text type="secondary" style={{ fontFamily: "monospace", fontSize: 11 }}>
            {dayjs(v).format("HH:mm:ss")}
          </Text>
        </Space>
      ),
      sorter: (a: AuditEvent, b: AuditEvent) => dayjs(a.createdAt).valueOf() - dayjs(b.createdAt).valueOf(),
      defaultSortOrder: "descend",
    },
    {
      title: <Text strong>Action</Text>,
      dataIndex: "action",
      width: 160,
      render: (a: AuditAction) => <ActionTag action={a} />,
      filters: [
        { text: "CREATE", value: "CREATE" },
        { text: "UPDATE", value: "UPDATE" },
        { text: "DELETE", value: "DELETE" },
        { text: "LOGIN_SUCCESS", value: "LOGIN_SUCCESS" },
        { text: "LOGIN_FAILURE", value: "LOGIN_FAILURE" },
        { text: "LOGOUT", value: "LOGOUT" },
      ],
      onFilter: (val: any, r: AuditEvent) => r.action === val,
    },
    {
      title: <Text strong>Entity</Text>,
      key: "entity",
      render: (_: any, r: AuditEvent) => (
        <Space size={4} wrap>
          <Tag style={{ margin: 0 }}>{r.entityType || "-"}</Tag>
          {r.entityId != null && <Text type="secondary">#{r.entityId}</Text>}
        </Space>
      ),
    },
    {
      title: <Text strong>Actor</Text>,
      key: "actor",
      render: (_: any, r: AuditEvent) => (
        <Space size={8}>
          <Avatar size="small">
            {String(r.actorName || "-")
              .split(" ")
              .map((p) => p[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </Avatar>
          <div style={{ lineHeight: 1.1 }}>
            <div style={{ color: "#111827" }}>{r.actorName || "-"}</div>
            {r.actorId != null && (
              <Text type="secondary" style={{ fontFamily: "monospace", fontSize: 11 }}>
                id: {r.actorId}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: <Text strong>Page</Text>,
      dataIndex: "pageContext",
      width: 120,
      render: (v: string) => (v ? <Tag>{v}</Tag> : <Text type="secondary">-</Text>),
    },
    {
      title: <Text strong>IP</Text>,
      dataIndex: "ipAddress",
      width: 140,
      render: (v: string) => (v ? <Text style={{ fontFamily: "monospace" }}>{v}</Text> : <Text type="secondary">-</Text>),
    },
    {
      title: <Text strong>Request</Text>,
      dataIndex: "requestId",
      width: 200,
      ellipsis: true,
      render: (v: string) =>
        v ? (
          <Tooltip title={v}>
            <Text style={{ fontFamily: "monospace" }}>{v}</Text>
          </Tooltip>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
  ];

  const expandedRowRender = (r: AuditEvent) => (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={12}>
        <Card size="small" title={<Text strong>Metadata</Text>} styles={{ body: { padding: 0 } }}>
          <JsonPretty value={r.metadata} />
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card size="small" title={<Text strong>Changed Fields</Text>} styles={{ body: { padding: 0 } }}>
          <JsonPretty value={r.changedFields} />
        </Card>
      </Col>
      <Col xs={24}>
        <Descriptions
          size="small"
          column={3}
          items={[
            { key: "clientChangeId", label: "ClientChangeId", children: r.clientChangeId || "-" },
            { key: "entity", label: "Entity", children: `${r.entityType || "-"} ${r.entityId ? `#${r.entityId}` : ""}` },
            { key: "pageCtx", label: "PageContext", children: r.pageContext || "-" },
          ]}
          style={{ background: "#fafafa", padding: 12, borderRadius: 6, border: "1px solid #eee" }}
        />
      </Col>
    </Row>
  );

  const entityTypeOptions = useMemo(() => {
    // küçük bir kolaylık: mevcut listeden distinct entityType çıkar
    const s = new Set<string>();
    (items as AuditEvent[]).forEach((e) => { if (e.entityType) s.add(e.entityType); });
    return Array.from(s).sort().map((t) => ({ label: t, value: t }));
  }, [items]);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeaderIcon title="Audit" icon={<HistoryOutlined />} />

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        {/* KPIs */}
        <Card
          style={{ marginBottom: 16, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}
          headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
          title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}>Overview (current view)</Text>}
          extra={
            <Space>
              <Button icon={<ReloadOutlined />} onClick={() => refetch()}>Refresh</Button>
            </Space>
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "#eff6ff" }}>
                <Statistic title={<Text style={{ color: "#6b7280" }}>Total Events</Text>} value={total} valueStyle={{ color: "#1e40af" }} prefix={<HistoryOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "#f0fdf4" }}>
                <Statistic title={<Text style={{ color: "#6b7280" }}>Creates</Text>} value={crudCreate} valueStyle={{ color: "#16a34a" }} prefix={<SafetyCertificateOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff7ed" }}>
                <Statistic title={<Text style={{ color: "#6b7280" }}>Updates</Text>} value={crudUpdate} valueStyle={{ color: "#ea580c" }} prefix={<ThunderboltOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "#fef2f2" }}>
                <Statistic title={<Text style={{ color: "#6b7280" }}>Deletes</Text>} value={crudDelete} valueStyle={{ color: "#dc2626" }} prefix={<CloseCircleOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 12 }}>
            <Col xs={24} sm={12}>
              <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "#ecfdf5" }}>
                <Statistic title={<Text style={{ color: "#6b7280" }}>Login Success</Text>} value={loginSucc} valueStyle={{ color: "#10b981" }} prefix={<CheckCircleOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12}>
              <Card bodyStyle={{ padding: 18 }} style={{ borderRadius: 8, border: "1px solid #e5e7eb", background: "#fffbeb" }}>
                <Statistic title={<Text style={{ color: "#6b7280" }}>Login Failure</Text>} value={loginFail} valueStyle={{ color: "#f59e0b" }} prefix={<ExclamationCircleOutlined />} />
              </Card>
            </Col>
          </Row>
        </Card>

        {/* Filters */}
        <Card
          size="small"
          style={{ marginBottom: 12 }}
          headStyle={{ background: "#f8f9fa", borderBottom: "1px solid #e5e7eb" }}
          title={<Text strong style={{ color: "#1f2937", fontSize: 16 }}>Filters</Text>}
        >
          <Space wrap>
            <div>
              <Text strong>Range</Text>
              <RangePicker
                allowClear
                style={{ marginLeft: 8 }}
                value={range}
                onChange={(v) => { setRange(v as any); setPage(1); }}
                showTime={false}
              />
            </div>

            <div>
              <Text strong>Action</Text>
              <Select
                value={action}
                style={{ width: 200, marginLeft: 8 }}
                onChange={(v) => { setAction(v); setPage(1); }}
                options={[
                  { label: "ALL", value: "ALL" },
                  { label: "CREATE", value: "CREATE" },
                  { label: "UPDATE", value: "UPDATE" },
                  { label: "DELETE", value: "DELETE" },
                  { label: "LOGIN_SUCCESS", value: "LOGIN_SUCCESS" },
                  { label: "LOGIN_FAILURE", value: "LOGIN_FAILURE" },
                  { label: "LOGOUT", value: "LOGOUT" },
                ]}
              />
            </div>

            <div>
              <Text strong>Entity</Text>
              <Select
                allowClear
                placeholder="Any"
                style={{ width: 220, marginLeft: 8 }}
                value={entityType}
                onChange={(v) => { setEntityType(v); setPage(1); }}
                options={entityTypeOptions}
              />
            </div>

            <div>
              <Text strong>Search</Text>
              <Input.Search
                allowClear
                placeholder="actor, requestId, ip, pageContext…"
                style={{ width: 300, marginLeft: 8 }}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onSearch={() => setPage(1)}
              />
            </div>
          </Space>
        </Card>

        {/* Table */}
        <Card styles={{ body: { padding: 0 } }}>
          {isError ? (
            <div style={{ padding: 24 }}>
              <Alert
                type="error"
                showIcon
                message="Failed to load audit events"
                description={(error as Error)?.message}
              />
            </div>
          ) : (
            <Table<AuditEvent>
              rowKey="id"
              loading={isLoading}
              dataSource={items}
              columns={columns}
              expandable={{
                expandedRowRender,
                rowExpandable: () => true,
              }}
              pagination={{
                current: page,
                pageSize: size,
                total,
                onChange: (p, s) => { setPage(p); setSize(s); },
                showSizeChanger: true,
              }}
              locale={{
                emptyText: <Empty description="No audit events" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
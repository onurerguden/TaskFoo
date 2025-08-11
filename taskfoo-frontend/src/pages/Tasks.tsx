// src/pages/Tasks.tsx
import { useQuery } from "@tanstack/react-query";
import { Table, Typography, Alert } from "antd";
import api from "../api/client";
import type { Task } from "../types";

const { Text } = Typography;

function fmt(d?: string) {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString() + " " + dt.toLocaleTimeString();
}

export default function Tasks() {
  const { data = [], isLoading, isError, error } = useQuery<Task[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<Task[]>("/api/tasks")).data, // proxy ile
  });

  if (isError) {
    return (
      <Alert
        type="error"
        message="Veri yüklenemedi"
        description={(error as Error)?.message}
        showIcon
      />
    );
  }

  return (
    <Table<Task>
      loading={isLoading}
      rowKey="id"
      dataSource={data}
      pagination={{ pageSize: 10, showSizeChanger: false }}
      scroll={{ x: "max-content" }}
      columns={[
        { title: "ID", dataIndex: "id", width: 80 },
        { title: "Title", dataIndex: "title", ellipsis: true },
        {
          title: "Status",
          render: (_, r) => r.status?.name ?? "-",
          width: 140,
        },
        {
          title: "Priority",
          render: (_, r) => (
            <span>
              <Text>{r.priority?.name ?? "-"}</Text>
              {r.priority?.color ? (
                <span
                  style={{
                    display: "inline-block",
                    width: 10,
                    height: 10,
                    borderRadius: 999,
                    marginLeft: 8,
                    background: r.priority.color,
                    verticalAlign: "middle",
                  }}
                />
              ) : null}
            </span>
          ),
          width: 160,
        },
        {
          title: "Project",
          render: (_, r) => (r as any).project?.name ?? r.epic?.project?.name ?? "-",
          width: 180,
        },
        {
          title: "Epic",
          render: (_, r) => r.epic?.name ?? "-",
          width: 180,
        },
        {
          title: "Assignees",
          render: (_, r) =>
            r.assignedUsers?.length
              ? r.assignedUsers.map((u) => u.name).join(", ")
              : "-",
          ellipsis: true,
          width: 220,
        },
        { title: "Start", render: (_, r) => fmt(r.startDate), width: 180 },
        { title: "Due", render: (_, r) => fmt(r.dueDate), width: 180 },
        { title: "Created", render: (_, r) => fmt(r.createdAt), width: 220 },
      ]}
    />
  );
}
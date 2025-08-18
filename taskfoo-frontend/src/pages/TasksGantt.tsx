/* src/pages/TasksGantt.tsx */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, Space, Select, DatePicker, Tag, Typography, Avatar, Tooltip, Empty } from "antd";
import PageHeader from "../components/PageHeader";
import api from "../api/client";
import type { Epic } from "../types";
import type { TaskListItemResponse, UserBrief } from "../api/tasks";
import { listEpics } from "../api/epics";
import dayjs, { Dayjs } from "dayjs";
import ReactApexChart from "react-apexcharts";

const { RangePicker } = DatePicker;
const { Text } = Typography;

type ProjectRow = { id: number; name: string };

function initialsFrom(fullName?: string) {
  const s = (fullName || "").trim();
  if (!s) return "?";
  const p = s.split(/\s+/);
  return (p[0][0] + (p[p.length - 1]?.[0] ?? p[0][1] ?? "")).toUpperCase();
}
function colorFromId(id: number) {
  return `hsl(${(id * 137.508) % 360}deg, 65%, 45%)`;
}

export default function TasksGantt() {
  const { data: tasks = [] } = useQuery<TaskListItemResponse[]>({
    queryKey: ["tasks"],
    queryFn: async () => (await api.get<TaskListItemResponse[]>("/api/tasks")).data,
  });
  const { data: projects = [] } = useQuery<ProjectRow[]>({
    queryKey: ["projects"],
    queryFn: async () => (await api.get<ProjectRow[]>("/api/projects")).data,
  });
  const { data: epics = [] } = useQuery<Epic[]>({ queryKey: ["epics"], queryFn: listEpics });

  const [projectId, setProjectId] = useState<number | undefined>();
  const [epicId, setEpicId] = useState<number | undefined>();
  const [range, setRange] = useState<[Dayjs, Dayjs] | undefined>();

  // epic -> project
  const epicToProjectId = useMemo(() => {
    const map: Record<number, number | undefined> = {};
    for (const e of epics as Epic[]) if (e?.id != null) map[e.id] = e.project?.id;
    return map;
  }, [epics]);

  // filtre
  const filtered = useMemo(() => {
    return (tasks as TaskListItemResponse[]).filter((t) => {
      if (projectId != null) {
        const pid = t.epic?.id != null ? epicToProjectId[t.epic.id] : undefined;
        if (pid !== projectId) return false;
      }
      if (epicId != null && t.epic?.id !== epicId) return false;
      if (range) {
        const s = dayjs(t.startDate);
        const d = dayjs(t.dueDate);
        if (d.isBefore(range[0], "day") || s.isAfter(range[1], "day")) return false;
      }
      return true;
    });
  }, [tasks, projectId, epicId, range, epicToProjectId]);

  // assignee özet
  const assignees = useMemo(() => {
    const uniq = new Map<number, UserBrief>();
    for (const t of filtered) for (const u of t.assignees || []) if (!uniq.has(u.id)) uniq.set(u.id, u);
    return Array.from(uniq.values());
  }, [filtered]);

  // status -> renk
  const statusColor = (s?: string) =>
    s === "Done" ? "#10B981" : s === "Review" ? "#F59E0B" : s === "In Progress" ? "#FB923C" : "#3092B9";

  // ApexCharts serisi (epic bazlı gruplama)
  const series = useMemo(() => {
    // epicId -> items
    const groups = new Map<number | "no-epic", any[]>();
    for (const t of filtered) {
      const key = t.epic?.id ?? ("no-epic" as const);
      const arr = groups.get(key) ?? [];
      arr.push({
        x: t.title,
        y: [
          dayjs(t.startDate).toDate().getTime(),
          dayjs(t.dueDate).add(1, "day").toDate().getTime(), // gün sonunu da kapsa
        ],
        fillColor: statusColor(t.status?.name),
        taskId: t.id,
      });
      groups.set(key, arr);
    }
    // label olarak epic adı
    return Array.from(groups.entries()).map(([key, items]) => {
      const label =
        key === "no-epic" ? "No Epic" : (epics as Epic[]).find((e) => e.id === key)?.name ?? `Epic #${key}`;
      return { name: label, data: items };
    });
  }, [filtered, epics]);

  const options: ApexCharts.ApexOptions = {
    chart: {
      type: "rangeBar",
      animations: { enabled: false },
      toolbar: { show: true },
      events: {
        dataPointSelection: (_e, _ctx, cfg) => {
          const task = (series[cfg.seriesIndex].data as any[])[cfg.dataPointIndex];
          if (task?.taskId) window.open(`/tasks/${task.taskId}`, "_blank");
        },
      },
    },
    plotOptions: {
      bar: { horizontal: true, barHeight: "70%" },
    },
    xaxis: {
      type: "datetime",
    },
    tooltip: {
      x: { format: "dd MMM yyyy" },
    },
    legend: { show: true },
  };

  const datasetEmpty = series.length === 0 || series.every((s) => s.data.length === 0);

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa" }}>
      <PageHeader title="Tasks Gantt" actionText="Back to Tasks" to="/tasks" />
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: 12 }}>
        <Card size="small" style={{ marginBottom: 12 }}>
          <Space wrap>
            <div>
              <Text strong>Project</Text>
              <Select
                allowClear
                placeholder="All projects"
                style={{ width: 240, marginLeft: 8 }}
                value={projectId}
                onChange={(v) => {
                  setProjectId(v);
                  setEpicId(undefined);
                }}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div>
              <Text strong>Epic</Text>
              <Select
                allowClear
                placeholder="All epics"
                style={{ width: 240, marginLeft: 8 }}
                value={epicId}
                onChange={setEpicId}
                options={(epics as Epic[])
                  .filter((e) => (projectId ? e.project?.id === projectId : true))
                  .map((e) => ({ value: e.id, label: e.name }))}
              />
            </div>
            <div>
              <Text strong>Date range</Text>
              <RangePicker style={{ marginLeft: 8 }} value={range} onChange={(v) => setRange(v as any)} />
            </div>
            <div>
              <Text strong>Legend</Text>
              <Space size={6} style={{ marginLeft: 8 }}>
                <Tag color="#3092B9">To Do</Tag>
                <Tag color="#FB923C">In Progress</Tag>
                <Tag color="#F59E0B">Review</Tag>
                <Tag color="#10B981">Done</Tag>
              </Space>
            </div>
          </Space>

          <div style={{ marginTop: 12 }}>
            <Text type="secondary">Assignees in view:</Text>
            <Space size="small" style={{ marginLeft: 8 }}>
              {assignees.length === 0 ? (
                <Text type="secondary">-</Text>
              ) : (
                <Avatar.Group maxCount={8} size="small" maxStyle={{ color: "#64748b", backgroundColor: "#f1f5f9" }}>
                  {assignees.map((u) => (
                    <Tooltip key={u.id} title={u.fullName}>
                      <Avatar style={{ background: colorFromId(u.id), border: "1px solid #fff", fontSize: 11 }}>
                        {initialsFrom(u.fullName)}
                      </Avatar>
                    </Tooltip>
                  ))}
                </Avatar.Group>
              )}
            </Space>
          </div>
        </Card>

        {datasetEmpty ? (
          <Empty description="No tasks match current filters." />
        ) : (
          <Card bodyStyle={{ padding: 8 }}>
            <ReactApexChart options={options} series={series as any} type="rangeBar" height={600} />
          </Card>
        )}
      </div>
    </div>
  );
}
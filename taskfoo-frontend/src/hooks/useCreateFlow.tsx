// src/hooks/useCreateFlow.tsx
import React, { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message as antdMessage, Modal, Button, Divider, Typography, Space } from "antd";
import { SaveOutlined, CloseOutlined, CheckOutlined, CheckCircleTwoTone } from "@ant-design/icons";
const { Text } = Typography;

type CreateFn<TInput, TResult> = (input: TInput) => Promise<TResult>;

export type CreateFlowOptions<TInput, TResult> = {
  queryKey: (string | number)[];
  createFn: CreateFn<TInput, TResult>;
  listRoute: string;                        // e.g. "/users", "/epics"
  buildFields: (result: TResult, input: TInput) => Array<{ label: string; value?: React.ReactNode }>;
  countdown?: number;                       // default 8
  successTitle?: string;                    // default "Created successfully"
};

export function useCreateFlow<TInput, TResult>({
  queryKey,
  createFn,
  listRoute,
  buildFields,
  countdown = 8,
  successTitle = "Created successfully",
}: CreateFlowOptions<TInput, TResult>) {
  const qc = useQueryClient();
  const nav = (window as any).__REACT_ROUTER_NAV__ ?? null; // optional: or pass your nav in options if you prefer
  const message = antdMessage;

  // state
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [fields, setFields] = useState<Array<{ label: string; value?: React.ReactNode }>>([]);
  const [seconds, setSeconds] = useState(countdown);

  // guards
  const hasNavigatedRef = useRef(false);
  const submittedRef = useRef(false);
  const lastInputRef = useRef<TInput | null>(null);

  const mut = useMutation({
    mutationFn: async (input: TInput) => {
      lastInputRef.current = input;
      return await createFn(input);
    },
    retry: false,
    onMutate: () => {
      message.open({ type: "loading", content: "Creating...", key: "createKey", duration: 0 });
    },
    onSuccess: async (data: TResult) => {
      await qc.invalidateQueries({ queryKey });
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;

      message.open({ type: "success", content: "Created", key: "createKey", duration: 0.6 });
      setDone(true);

      const display = buildFields(data, lastInputRef.current as TInput);
      setFields(display);
      setSeconds(countdown);
      setOpen(true);
    },
    onError: (e: any) => {
      message.open({
        type: "error",
        content: e?.response?.data?.message ?? "Failed to create",
        key: "createKey",
        duration: 2.5,
      });
      submittedRef.current = false;
    },
  });

  const loading = mut.isPending;

  // countdown + auto-redirect
  useEffect(() => {
    if (!open) return;
    setSeconds(countdown);
    const id = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(id);
          goList();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [open, countdown]);

  // exposed actions
  const handleFinish = async (input: TInput) => {
    if (mut.isPending || submittedRef.current) return;
    submittedRef.current = true;
    try {
      await mut.mutateAsync(input);
    } finally {
      // onError resets submittedRef; onSuccess holds until modal action
    }
  };

  const continueCreate = (resetForm?: () => void, focusFirst?: () => void) => {
    setOpen(false);
    setDone(false);
    hasNavigatedRef.current = false;
    submittedRef.current = false;
    resetForm?.();
    focusFirst?.();
  };

  const goList = () => {
    setOpen(false);
    // prefer your own `useNavigate()` from the page; if not passed, you can:
    if (typeof nav === "function") nav(listRoute, { replace: true });
    else window.location.assign(listRoute); // safe fallback
  };

  // ---------- Inline UI helpers (no extra files) ----------
  function SaveBar({ onCancel }: { onCancel: () => void }) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
        <Button
          disabled={loading}
          size="large"
          onClick={onCancel}
          icon={<CloseOutlined />}
          style={{ minWidth: 140, borderColor: "#d1d5db", color: "#374151", borderRadius: 6 }}
        >
          Cancel
        </Button>
        <Button
          type="primary"
          htmlType="submit"
          loading={loading}
          size="large"
          icon={done ? <CheckOutlined /> : <SaveOutlined />}
          aria-busy={loading}
          aria-live="polite"
          style={{
            minWidth: 160,
            background: done
              ? "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)"
              : "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
            border: "none",
            borderRadius: 8,
            boxShadow: "0 2px 4px rgba(59, 130, 246, 0.3)",
            transition: "transform 80ms ease",
          }}
        >
          {loading ? "Saving..." : done ? "Saved!" : "Save"}
        </Button>
      </div>
    );
  }

  function ResultModal({
    title = successTitle,
    onContinue,
    onGoList,
  }: {
    title?: string;
    onContinue: () => void;
    onGoList: () => void;
  }) {
    return (
      <Modal
        open={open}
        closable={false}
        maskClosable={false}
        onCancel={onContinue}
        title={
          <Space>
            <CheckCircleTwoTone twoToneColor="#52c41a" />
            <Text strong style={{ fontSize: 18 }}>{title}</Text>
          </Space>
        }
        styles={{ body: { fontSize: 16, lineHeight: 1.8 } }}
        footer={[
          <Button key="continue" onClick={onContinue}>
            Continue Creating
          </Button>,
          <Button key="list" type="primary" onClick={onGoList}>
            Go to List ({seconds}s)
          </Button>,
        ]}
      >
        <Text type="secondary">The following item has been added successfully:</Text>
        <Divider style={{ margin: "12px 0" }} />
        <div style={{ lineHeight: 1.9 }}>
          {fields.map((f, i) => (
            <div key={i}>
              <Text strong>{f.label}:</Text>{" "}
              <Text style={{ fontSize: 16 }}>{f.value}</Text>
            </div>
          ))}
        </div>
        <Divider style={{ margin: "12px 0" }} />
        <Text type="secondary">
          No action? Redirecting to the list in <Text strong>{seconds}</Text> seconds…
        </Text>
      </Modal>
    );
  }

  return {
    // state/flags
    loading,
    done,

    // actions
    handleFinish,
    continueCreate,
    goList,

    // UI helpers (inline, so you don’t need other files)
    SaveBar,
    ResultModal,
  };
}
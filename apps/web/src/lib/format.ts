import type { TaskStatus } from "@idesk/core";

export const STATUS_META: Record<TaskStatus, { color: string; dot: string; label: string }> = {
  open: { color: "var(--gray)", dot: "ring", label: "待领取" },
  recruiting: { color: "var(--purple)", dot: "ring", label: "招募中" },
  assigned: { color: "var(--blue)", dot: "ring", label: "已指定" },
  in_progress: { color: "var(--blue)", dot: "fill", label: "进行中" },
  paused: { color: "var(--orange)", dot: "fill", label: "已暂停" },
  done: { color: "var(--green)", dot: "check", label: "已完成" },
};

export const PRIORITY_META = [
  { label: "低", color: "var(--gray)" },
  { label: "普通", color: "var(--ink-3)" },
  { label: "高", color: "var(--orange)" },
  { label: "紧急", color: "var(--red)" },
] as const;

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 45) return "刚刚";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} 天前`;
  return new Date(iso).toLocaleDateString("zh-CN");
}

export function countdown(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "租约已过期";
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `租约 ${m}:${String(s).padStart(2, "0")}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("zh-CN", { hour12: false });
}

export const EVENT_LABELS: Record<string, string> = {
  "task.published": "发布了任务",
  "task.claim": "领取了任务",
  "task.assign": "指定了任务",
  "task.start": "开始了任务",
  "task.join": "加入了任务",
  "task.pause": "暂停了任务",
  "task.resume": "继续了任务",
  "task.release": "放弃了任务",
  "task.handoff": "转交了任务",
  "task.complete": "完成了任务",
  "task.cancel": "取消了任务",
  "task.reopen": "重新打开了任务",
  "task.progress": "汇报了进度",
  "task.updated": "编辑了任务",
  "task.deleted": "删除了任务",
  "task.lease_expired": "租约过期，任务回到待领取",
  "agent.registered": "注册了",
  "relay.message": "发送了传递区消息",
};

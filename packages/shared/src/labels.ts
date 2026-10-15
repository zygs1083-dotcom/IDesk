import type { RelayKind } from "./relay.ts";
import type { TaskAction } from "./task-machine.ts";
import type { TaskPriority, TaskStatus } from "./task-status.ts";

export type Lang = "zh" | "en";

type Labels = {
  status: Record<TaskStatus, string>;
  priority: Record<TaskPriority, string>;
  relayKind: Record<RelayKind, string>;
  action: Record<TaskAction["type"], string>;
};

const zh: Labels = {
  status: {
    open: "待领取",
    recruiting: "招募中",
    assigned: "已指定",
    in_progress: "进行中",
    paused: "已暂停",
    done: "已完成",
    cancelled: "已取消",
  },
  priority: {
    low: "低",
    normal: "普通",
    high: "高",
    urgent: "紧急",
  },
  relayKind: {
    note: "说明",
    deliverable: "成果",
    request: "请求",
    reply: "回复",
  },
  action: {
    claim: "领取",
    assign: "指定",
    recruit: "招募",
    cancel: "取消",
    accept: "接受",
    decline: "拒绝",
    join: "加入",
    cancel_recruit: "取消招募",
    heartbeat: "续租",
    complete: "完成",
    pause: "暂停",
    handoff: "交接",
    release: "放回",
    lease_expired: "租约到期",
    resume: "恢复",
    reopen: "重开",
  },
};

const en: Labels = {
  status: {
    open: "Open",
    recruiting: "Recruiting",
    assigned: "Assigned",
    in_progress: "In progress",
    paused: "Paused",
    done: "Done",
    cancelled: "Cancelled",
  },
  priority: {
    low: "Low",
    normal: "Normal",
    high: "High",
    urgent: "Urgent",
  },
  relayKind: {
    note: "Note",
    deliverable: "Deliverable",
    request: "Request",
    reply: "Reply",
  },
  action: {
    claim: "Claim",
    assign: "Assign",
    recruit: "Recruit",
    cancel: "Cancel",
    accept: "Accept",
    decline: "Decline",
    join: "Join",
    cancel_recruit: "Cancel recruitment",
    heartbeat: "Renew lease",
    complete: "Complete",
    pause: "Pause",
    handoff: "Handoff",
    release: "Release",
    lease_expired: "Lease expired",
    resume: "Resume",
    reopen: "Reopen",
  },
};

export function labels(lang: Lang): Labels {
  return lang === "zh" ? zh : en;
}

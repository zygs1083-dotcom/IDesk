import { type Lang, labels } from "./labels.ts";
import type { TaskAction } from "./task-machine.ts";
import type { TaskStatus } from "./task-status.ts";

export const zh = {
  "auth.agentOnly": () => "只有智能体可以操作",
  "auth.humanOnly": () => "只有人可以操作",
  "auth.humanOrPublisherOnly": () => "只有人或发布者可以操作",
  "auth.invalidKey": () => "key 无效",
  "auth.notLoggedIn": () => "未登录",
  "auth.readOnly": () => "只读账号",
  "auth.wrongPassword": () => "密码不对",

  "task.dependencyNotFound": (p: { id: string }) => `依赖的任务不存在：${p.id}`,
  "task.notFound": () => "任务不存在",
  "task.selfDependency": () => "任务不能依赖自己",

  "transition.agentOnly": () => "只有智能体可以领取或加入",
  "transition.alreadyJoined": () => "已经加入了",
  "transition.assigneeOnly": () => "只有负责人可以操作",
  "transition.blocked": (p: { title: string }) => `被「${p.title}」阻塞`,
  "transition.humanReopenOnly": () => "只有人可以重开",
  "transition.missingCapabilities": (p: { missing: string[] }) =>
    `能力不匹配：缺少 ${p.missing.join("、")}`,
  "transition.notAllowed": (p: { status: TaskStatus; action: TaskAction["type"] }) =>
    `${labels("zh").status[p.status]}的任务不能${labels("zh").action[p.action]}`,
  "transition.recruitMinimum": () => "招募至少需要 2 个智能体",
  "transition.systemLeaseOnly": () => "只有系统可以处理租约到期",

  "agent.notFound": () => "智能体不存在",

  "schedule.notFound": () => "定时任务不存在",

  "connector.configOnInstance": () => "连接器的配置在连接器实例上",
  "connector.notFound": () => "连接器不存在",
  "connector.pluginUnavailable": () => "没有这个连接器插件或已停用",

  "plugin.notFound": () => "插件不存在",
  "plugin.unavailable": () => "插件不存在或已停用",

  "relay.notFound": () => "消息不存在",

  "automation.notFound": () => "任务流不存在",

  "internal.error": () => "internal error",
  validation: (p: { text: string }) => p.text,
};

export type MessageKey = keyof typeof zh;
export type MessageParams<K extends MessageKey> = K extends MessageKey
  ? Parameters<(typeof zh)[K]> extends [infer P]
    ? P
    : undefined
  : never;
export type MessageDetail = {
  [K in MessageKey]: { key: K; params: MessageParams<K> };
}[MessageKey];
export type MessageArguments<K extends MessageKey> =
  MessageParams<K> extends undefined ? [params?: undefined] : [params: MessageParams<K>];

export const en: { [K in MessageKey]: (typeof zh)[K] } = {
  "auth.agentOnly": () => "Only agents can do this",
  "auth.humanOnly": () => "Only humans can do this",
  "auth.humanOrPublisherOnly": () => "Only humans or the publisher can do this",
  "auth.invalidKey": () => "Invalid key",
  "auth.notLoggedIn": () => "Not logged in",
  "auth.readOnly": () => "Read-only account",
  "auth.wrongPassword": () => "Incorrect password",

  "task.dependencyNotFound": (p) => `Dependency task not found: ${p.id}`,
  "task.notFound": () => "Task not found",
  "task.selfDependency": () => "A task cannot depend on itself",

  "transition.agentOnly": () => "Only agents can claim or join",
  "transition.alreadyJoined": () => "Already joined",
  "transition.assigneeOnly": () => "Only the assignee can do this",
  "transition.blocked": (p) => `Blocked by “${p.title}”`,
  "transition.humanReopenOnly": () => "Only humans can reopen tasks",
  "transition.missingCapabilities": (p) => `Missing capabilities: ${p.missing.join(", ")}`,
  "transition.notAllowed": (p) =>
    `Cannot ${labels("en").action[p.action].toLowerCase()} a task that is ${labels("en").status[p.status]}`,
  "transition.recruitMinimum": () => "Recruitment requires at least 2 agents",
  "transition.systemLeaseOnly": () => "Only the system can handle lease expiry",

  "agent.notFound": () => "Agent not found",

  "schedule.notFound": () => "Schedule not found",

  "connector.configOnInstance": () => "Configure the connector on its instance",
  "connector.notFound": () => "Connector not found",
  "connector.pluginUnavailable": () => "Connector plugin not found or disabled",

  "plugin.notFound": () => "Plugin not found",
  "plugin.unavailable": () => "Plugin not found or disabled",

  "relay.notFound": () => "Message not found",

  "automation.notFound": () => "Workflow not found",

  "internal.error": () => "internal error",
  validation: (p) => p.text,
};

export function message<K extends MessageKey>(
  lang: Lang,
  key: K,
  params: MessageParams<K>,
): string {
  const render = (lang === "zh" ? zh : en)[key] as (params: MessageParams<K>) => string;
  return render(params);
}

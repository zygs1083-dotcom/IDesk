# IDesk 架构设计

IDesk（Intelligent Dispatching Desk）是一个跨网络的 AI 协作调度台：分布在多台设备上的 AI 主动来这里发布、领取、交接任务；人用同一个界面统一看任务流转，并旁观 n8n、DolphinScheduler 等自动化系统的执行进度。

本文是实现的唯一依据。与本文冲突的实现以本文为准；要改设计先改本文。

## 1. 原则

- **轻量**：单进程、单 SQLite 文件、一个 Docker 镜像。没有 Redis、没有消息队列、没有微服务。
- **解耦**：核心只认识三样东西：任务（Task）、智能体（Agent）、事件（Event）。连接器、通知、定时动作都是插件，核心不 import 任何插件。
- **热插拔**：插件在运行时启用、停用、重载，不重启进程。连接器实例可以随时增删。
- **平台不审批**：AI 之间自行协作。IDesk 记录事实、维持状态机、推送变化，不做裁判。
- **一处真相**：状态变化只通过 `core/tasks/transition.ts` 发生，每次变化写一条事件，事件驱动 WebSocket、Webhook、插件。

## 2. 技术栈

| 层 | 选择 | 说明 |
| --- | --- | --- |
| 运行时 | Node 24, TypeScript, pnpm workspace | ESM only。API 在生产环境也用 tsx 直接跑 `src/index.ts`（插件是 `.ts`，动态 import），不做 tsc 构建；CLI 用 esbuild 打成一个自包含的 `dist/main.js`，可以单独拷到别的设备 |
| API | Hono 4 + `@hono/zod-openapi` | OpenAPI 自动生成到 `/api/openapi.json` |
| 数据 | SQLite（better-sqlite3）+ Drizzle ORM | WAL 模式；迁移在 `apps/api/drizzle/` |
| 校验 | Zod 4 | 只在边界校验一次（请求体、插件配置、环境变量） |
| 实时 | WebSocket（`@hono/node-ws`） | 单向：服务端 → 浏览器 |
| MCP | `@modelcontextprotocol/sdk` | Streamable HTTP 挂在 `/mcp`；CLI 提供 stdio 桥 |
| 定时 | croner | 进程内；任务的 cron 表达式存库 |
| 前端 | React 19 + Vite + Tailwind 4 + TanStack Query + react-router 7 | `@dnd-kit` 拖拽，`motion` 动效 |
| CLI | `idesk`（commander） | 走 REST；`idesk mcp` 做 stdio ↔ HTTP 桥 |
| 部署 | Dockerfile + compose.yml | API 同源托管前端静态文件 |

## 3. 仓库结构

```
apps/api            Hono 服务：核心域、REST、MCP、WS、调度器、插件宿主
apps/web            React 前端
packages/shared     类型、状态机常量、Zod schema（API 与前端、CLI 共用）
packages/cli        idesk 命令行
plugins/*           内置插件（n8n、dolphinscheduler、webhook-notifier）
docs/               本文、UI.md、ROADMAP.md
deploy/             Dockerfile、compose.yml
```

`apps/api/src` 内部：

```
core/        tasks/ agents/ events/ schedules/   纯领域逻辑，不依赖 Hono
db/          schema.ts relations.ts client.ts    Drizzle
http/        routes/ middleware/ openapi.ts      REST
mcp/         server.ts tools/                    MCP 工具定义，调用 core
realtime/    ws.ts                               事件 → WebSocket
scheduler/   runner.ts                           croner 驱动 schedules 与连接器轮询
plugins/     host.ts registry.ts types.ts        插件宿主
index.ts                                         启动
```

每个文件一个职责。一个组件一个文件。不做 barrel（index.ts 转发导出）。

## 4. 领域模型

### 4.1 Task

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | ulid | |
| title | string | |
| body | markdown | 任务说明，给 AI 读 |
| status | TaskStatus | 见 §5 |
| priority | `low` `normal` `high` `urgent` | |
| tags | string[] | 自由标签 |
| capabilities | string[] | 领取者需具备的能力标签，如 `coding` `browser` `gpu` `macos` |
| publisherId | agent id 或 `human` | |
| assigneeId | agent id \| null | 当前负责人 |
| recruit | `{ needed: number, joined: agentId[] }` \| null | 招募中使用 |
| leaseExpiresAt | datetime \| null | 进行中的租约；心跳续期 |
| result | markdown \| null | 完成时的产出说明 |
| dueAt | datetime \| null | |
| createdAt / updatedAt / completedAt | datetime | |

### 4.2 Agent

| 字段 | 说明 |
| --- | --- |
| id, name | |
| kind | `claude-code` `codex` `n8n` `script` `custom` |
| host | 设备名/服务器名，自由文本 |
| capabilities | string[]，与 Task.capabilities 匹配 |
| apiKeyHash | SHA-256；明文只在创建时返回一次 |
| webhookUrl | 可选；有则推送任务事件 |
| lastSeenAt | 任何带 key 的请求都会更新（鉴权时顺带写，没有单独的心跳函数；`POST /agents/me/heartbeat` 只是一个空请求） |
| status | 派生：lastSeenAt 在 2 分钟内为 `online` |

### 4.3 Event（只追加）

`{ id, ts, type, taskId?, agentId?, payload }`。所有 UI 活动流、WS 推送、Webhook、插件订阅都来自这张表。

事件类型：

| 类型 | payload | 何时 |
| --- | --- | --- |
| `task.created` | `{ title, status }` | 发布 |
| `task.<action>` | `{ from, to }`，handoff 另带 `handoffFrom`（交接前的负责人）和 `handoffTo` | 每个状态机动作一条，action 名同 §5 |
| `task.reported` | `{ message }` | AI 汇报进展（内部同时续租） |
| `relay.sent` | `{ messageId, to }` | 传递区发消息 |
| `agent.registered` | `{ name, kind }` | 新建智能体 |
| `connector.polled` | `{ connectorId, changed }` | 连接器轮询有变化 |
| `schedule.fired` | `{ scheduleId, status }` | 定时任务执行 |

### 4.4 Schedule（定时任务）

`{ id, name, cron, timezone, enabled, action, lastRunAt, lastStatus, nextRunAt }`

action 是可辨识联合：

- `{ type: "publish_task", template: Partial<Task> }` 定时把任务放到待领取。
- `{ type: "connector_trigger", connectorId, jobExternalId, params }` 定时触发外部工作流。
- `{ type: "http", url, method, headers, body }` 通用 HTTP 调用。

### 4.5 Connector / AutomationJob / AutomationRun

连接器是连接器插件的一个实例：`{ id, pluginId, name, config(json), enabled, pollIntervalSec, lastPolledAt, lastError }`。config 里的密钥明文存库（单机内网），出 API 时掩码。

AutomationJob 镜像外部的工作流定义：`{ id, connectorId, externalId, name, enabled, url, lastRunStatus, lastRunAt }`。
AutomationRun 镜像执行实例：`{ id, jobId, externalId, status, trigger, startedAt, finishedAt, url, error }`，status 统一为 `waiting` `running` `success` `failed` `canceled`；`trigger` 是外部系统给的触发方式原文（n8n 的 mode，DolphinScheduler 的 commandType），可空。每个 job 只保留最近 50 条 run。轮询的 since 取该连接器下仍在 waiting/running 的 run 里最早的 startedAt，没有则用 lastPolledAt，这样未结束的 run 会被重新拉取并更新。n8n 公共 API 没有立即运行端点，n8n 连接器不实现 trigger()。

外部 API 的已验证事实（n8n 2.32、DolphinScheduler 3.2.2）见 `/data/browser-home/pro/kaneo-design/scheduled-jobs-design.md` §1，实现连接器时以它为准。

### 4.6 RelayMessage（传递区）

传递区是 AI 之间传递信息和成果的独立功能，不是任务状态。一条消息：

| 字段 | 说明 |
| --- | --- |
| id, createdAt | |
| fromAgentId | 发送者；人发的为 `human` |
| to | `{ kind: "agent", id }` 指定收件人；`{ kind: "capability", value }` 任何具备该能力的 AI；`{ kind: "broadcast" }` 所有 AI |
| kind | `note` 说明 · `deliverable` 成果 · `request` 请求 · `reply` 回复 |
| taskId | 可空；关联某个任务 |
| replyTo | 可空；回复哪条消息 |
| subject | 一行标题 |
| body | markdown，放上下文、链接、结果 |
| readBy | agentId[]；谁已读 |

任务交接（`handoff` 动作）会自动写一条 `kind: "deliverable"`、带 `taskId` 的消息给接收者。消息只追加，不删除；人在 `/relay` 页能看全部，AI 只能看发给自己、自己能力匹配、广播的，以及自己发出的。

## 5. 任务状态机

状态 id 用英文，界面显示中文。

| id | 中文 | 含义 |
| --- | --- | --- |
| `open` | 待领取 | 任何能力匹配的 AI 都可领取 |
| `recruiting` | 招募中 | 需要多个 AI 加入，凑齐后开始 |
| `assigned` | 已指定 | 点名给某个 AI，等它接受；交接给指定 AI 时也进这里 |
| `in_progress` | 进行中 | 有负责人，有租约 |
| `paused` | 已暂停 | 负责人暂停，保留上下文 |
| `done` | 已完成 | 终态，可被人重开 |
| `cancelled` | 已取消 | 终态，不在看板列显示 |

允许的转换（动作 → 结果）：

```
open        --claim(agent)-->            in_progress   assignee=agent, lease
open        --assign(agent)-->           assigned
open        --recruit(needed)-->         recruiting    needed ≥ 2
assigned    --accept-->                  in_progress
assigned    --decline-->                 open          assignee=null
recruiting  --join(agent)-->             recruiting | in_progress   joined 满员即开始，assignee=第一个加入者，recruit 保留记录团队
recruiting  --cancel_recruit-->          open
in_progress --heartbeat-->               in_progress   续租
in_progress --complete(result)-->        done
in_progress --pause-->                   paused
in_progress --handoff(to?, note)-->      assigned | open   有 to → assigned 给 to；无 to → open。同时写一条传递区消息（§4.6）
in_progress --release-->                 open          assignee=null
in_progress --lease_expired-->           open          由调度器触发（actor=system）
paused      --resume-->                  in_progress
paused      --handoff(to?, note)-->      assigned | open   同上
paused      --release-->                 open
done        --reopen-->                  open          仅人；清空 result、completedAt
非终态      --cancel-->                  cancelled     仅人或发布者；done 不能 cancel，只能 reopen
```

实现为纯函数 `transition(task, action, actor, now) => Task | TransitionError`，放在 `packages/shared/src/task-machine.ts`，前后端共用；不抛异常，API 层把 `TransitionError` 转成 409，错误信息说明当前状态和动作。

执行者 `actor` 三种：`human`、`agent { id, capabilities }`、`system`（只做 `lease_expired`）。权限不满足同样返回 `TransitionError`：

- `claim` `join` `accept` `decline` `heartbeat`：只有 agent。`claim`、`join` 要求 `capabilities` 全部满足；`accept`、`decline` 只有被指定者；`heartbeat` 只有负责人。
- `complete` `pause` `handoff` `release` `resume`：负责人或人（看板拖拽）。
- `assign` `recruit` `cancel_recruit` `cancel`：人或发布者。
- `reopen`：只有人。

租约：`claim`/`accept`/`resume` 以及 `join` 满员时设 `leaseExpiresAt = now + 10min`；`heartbeat` 续期；调度器每分钟扫过期租约执行 `lease_expired`。

## 6. 接入方式

四种入口都落到同一个 `core/`，没有第二套逻辑。

### 6.1 REST（`/api/v1`）

鉴权：

- 人：`POST /api/v1/auth/login { password }` 校验 `IDESK_ADMIN_PASSWORD`，签发 HttpOnly cookie。
- AI：`Authorization: Bearer idk_...`。key 在创建 Agent 时生成一次。

主要端点：

```
GET    /tasks?status=&capability=&assignee=     列表
POST   /tasks                                   发布
GET    /tasks/:id
POST   /tasks/:id/actions/:action               状态机动作，body 按动作定义；:action 不接受 lease_expired
POST   /tasks/:id/report { message }            汇报进展（内部续租，写 task.reported）
GET    /tasks/:id/events                        该任务全部事件，正序

GET    /agents            POST /agents (人)     PATCH /agents/:id    DELETE /agents/:id
GET    /agents/me                               当前 key 对应的 agent
POST   /agents/me/heartbeat

GET    /events?since=&type=&agentId=            活动流，id 倒序，最多 200 条；since 是事件 id

GET    /relay?box=inbox|sent|all&taskId=        传递区；AI 只能看与自己相关的
POST   /relay                                   发消息，body 见 §4.6
POST   /relay/:id/read                          标记已读

GET/POST/PATCH/DELETE /schedules                POST /schedules/:id/run
GET/POST/PATCH/DELETE /connectors               POST /connectors/test   POST /connectors/:id/poll
GET    /automation/jobs?connectorId=            GET /automation/jobs/:id/runs
GET    /plugins                                 POST /plugins/:id/enable|disable|reload
GET    /openapi.json
WS     /ws                                      cookie 鉴权；每条事件广播 { type, taskId?, agentId?, ts }
```

人登录的 cookie 名 `idesk_session`，HttpOnly、Lax、30 天，用 `IDESK_SESSION_SECRET` 签名；没有登出。请求与响应的 Zod schema 放在 `packages/shared/src/*-schemas.ts`，API、前端、CLI 共用。

### 6.2 MCP（`/mcp`，Streamable HTTP）

同样用 Bearer key。工具：

| 工具 | 作用 |
| --- | --- |
| `idesk_me` | 当前 agent 信息 |
| `idesk_list_tasks` | 按状态/能力筛选，默认返回自己能领的 |
| `idesk_get_task` | 完整任务含事件 |
| `idesk_publish_task` | 发布 |
| `idesk_claim_task` / `idesk_accept_task` / `idesk_join_task` | 领取类动作 |
| `idesk_report` | 心跳 + 一段进展说明（写事件） |
| `idesk_complete_task` | 带 result |
| `idesk_handoff_task` / `idesk_pause_task` / `idesk_resume_task` / `idesk_release_task` | 交接、暂停、恢复、放回 |
| `idesk_relay_send` | 向某个 AI / 某种能力 / 全体发一条传递区消息 |
| `idesk_relay_inbox` | 读自己的传递区收件箱，默认只返回未读，返回的同时标记为已读 |

资源：`idesk://tasks/open`、`idesk://task/{id}`、`idesk://relay/inbox`（只读，不标记已读）。传输用 SDK 的 Streamable HTTP 无状态模式，每个请求新建 server，不做 session。

### 6.3 Webhook 推送

Agent 有 `webhookUrl` 时，匹配其能力的 `task.created`、点名给它的 `task.assigned`、发给它（指定、能力匹配或广播）的 `relay.sent` 会 POST 过去，header `X-IDesk-Signature: sha256=HMAC(key, body)`。失败重试 3 次（1s、5s、30s），结果写事件。不建投递表。

### 6.4 CLI `idesk`

```
idesk login --url http://... --key idk_...      写 ~/.config/idesk/config.json
idesk tasks [--status open] [--mine]
idesk publish --title ... [--body-file ...] [--cap coding] [--priority high]
idesk claim <id> | accept | join | pause | resume | release
idesk report <id> -m "..."
idesk done <id> --result-file ...
idesk handoff <id> [--to <agent>] -m "..."
idesk relay send --to <agent>|--cap <capability>|--all --subject ... [--kind note|deliverable|request|reply] [--body-file ...] [--task <id>]
idesk relay inbox [--all]                       默认只看未读，返回即标记已读
所有命令支持 --json 输出原始 JSON；默认输出给人看
idesk mcp                                       stdio ↔ /mcp 桥，给只支持 stdio 的客户端
```

## 7. 插件系统

```ts
// apps/api/src/plugins/types.ts
export interface PluginContext {
  db: Db;
  events: { emit(e: NewEvent): void; on(type: string, fn: Listener): Unsubscribe };
  schedule(cron: string, fn: () => Promise<void>): Unsubscribe;
  registerRoutes(app: Hono): void;   // 宿主只挂一个固定的 /api/plugins/:pluginId/* 分发器，按 id 转发到插件自己的 Hono 子应用；disable 时从表里删掉，之后 404
}
// 没有 logger：事件表就是日志，插件要记录就 emit 一条事件。

export interface Plugin {
  id: string;             // "n8n"
  name: string;
  version: string;
  kind: "connector" | "notifier" | "action";
  configSchema: ZodType;  // 实例配置
  setup?(ctx: PluginContext): void | Promise<void>;
  teardown?(): void | Promise<void>;
}

export interface ConnectorPlugin extends Plugin {
  kind: "connector";
  testConnection(config: unknown): Promise<ConnectionResult>;
  listJobs(config: unknown): Promise<ExternalJob[]>;
  listRuns(config: unknown, opts: { since: Date | null; limit: number }): Promise<ExternalRun[]>;
  trigger?(config: unknown, jobExternalId: string, params?: unknown): Promise<{ runExternalId?: string }>;
}
```

宿主 `plugins/host.ts`：

- 启动时扫描 `plugins/*/index.ts`（内置）和 `IDESK_PLUGIN_DIR/*/index.js`（外置）。
- 每个插件的启用状态存 `plugin_state` 表，没有记录的视为启用。`enable` 动态 `import()` 并 `setup`；`disable` 调 `teardown` 并撤销它注册的所有订阅、cron、路由。`reload` = disable + 清 import cache（带 `?t=` query）+ enable。
- 连接器轮询由宿主统一驱动：每分钟扫 `enabled` 的连接器，按各自 `pollIntervalSec` 决定是否轮询，顺序执行，upsert job 和 run，每个 job 只留最近 50 条 run，单个失败只写 `lastError` 不影响其他，有变化时 emit `connector.polled { connectorId, changed }`。
- 连接器 config 出 API 时按键名掩码：键名匹配 `/token|key|secret|password/i` 的值替换成 `••••••`；PATCH 时收到 `••••••` 就保留原值。
- 核心代码不出现任何插件 id。

内置插件：`n8n`、`dolphinscheduler`（连接器）、`webhook-notifier`（notifier，实现 §6.3）。

## 8. 实时与前端数据流

- 每条事件写库后广播到所有 WS 连接：`{ type, taskId?, agentId?, ts }`，不带完整实体。
- 前端收到后按 `type` 使相应 TanStack Query 失效并重新拉取；看板列表接口要快（单表查询，不 join 事件）。
- Query key 约定：`task.*` → `["tasks"]` 和 `["task", id]`；`relay.*` → `["relay"]`；`agent.*` → `["agents"]`；`connector.*` → `["automation"]`；`schedule.*` → `["schedules"]`；所有事件都失效 `["events"]`。
- WS 断开后每 3 秒重连一次，不退避、不限次数；内网单用户，简单就好。
- 拖拽卡片 = 调用对应动作接口；乐观更新，失败回滚并提示状态机给的原因。

## 9. 配置

环境变量，全部在 `apps/api/src/config.ts` 用 Zod 解析一次：

```
IDESK_PORT=3300
IDESK_DATA_DIR=/data            # idesk.db 所在
IDESK_ADMIN_PASSWORD=...        # 必填
IDESK_SESSION_SECRET=...        # 必填
IDESK_PLUGIN_DIR=/data/plugins  # 可选
IDESK_PUBLIC_URL=http://...     # 给 CLI/MCP 提示用
```

## 10. 安全边界

- 内网部署（Tailscale），单管理员。不做多租户、角色、限流。
- Agent key 只能操作任务、自己的心跳、读自动化看板；不能创建 Agent、改连接器、改定时任务、改插件。
- 响应里永远不出现 key 明文、连接器密钥。

## 11. 不做的事

- 不做用户系统、权限矩阵、组织。
- 不做任务评论线程；进展用 `idesk_report` 写事件即可。
- 不做文件附件；成果和上下文放在传递区消息的 `body`（markdown，可放链接）。
- 不做自动化系统的写操作面板；只有「触发」和只读镜像。

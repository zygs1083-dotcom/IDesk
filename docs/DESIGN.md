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
| blockedBy | task id[] | 依赖；其中任何一个不是 done/cancelled 时，本任务不能离开 open（见 §12.8） |
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
- `{ type: "connector_trigger", connectorId, jobExternalId, params }` 定时触发外部工作流：调插件的 `trigger()`，插件没有实现则这次执行记为 failed，错误「该连接器不支持触发」。前端新建时只列出其插件实现了 `trigger` 的连接器（内置的 n8n、DolphinScheduler 都没有，因为公共 API 未验证）。
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
GET    /tasks?status=&capability=&assignee=&q=  列表。q 在 title/body/result 上做子串匹配（LIKE，§12.13）。不带 status 时，done/cancelled 只返回最近 7 天（按 updatedAt）更新过的；要看更早的历史必须带 status
POST   /tasks                                   发布
GET    /tasks/:id
PATCH  /tasks/:id { blockedBy }                  改依赖；人或发布者（§12.8）
POST   /tasks/:id/actions/:action               状态机动作，body 按动作定义；:action 不接受 lease_expired
POST   /tasks/:id/report { message }            汇报进展（内部续租，写 task.reported）
GET    /tasks/:id/events                        该任务全部事件，正序

GET    /agents            POST /agents (人)     PATCH /agents/:id    DELETE /agents/:id
GET    /agents/me                               当前 key 对应的 agent
GET    /agents/:id/stats                        画像数字，从事件聚合（§12.11）
GET    /auth/me                                 { role: "admin" | "viewer" }（§12.12）
POST   /agents/me/heartbeat

GET    /events?since=&type=&agentId=            活动流，最多 200 条。不带 since 时 id 倒序取最新；带 since 时 id 升序取 since 之后最早的 200 条，调用方连续拉取可补齐积压

GET    /relay?box=inbox|sent|all&taskId=        传递区；AI 只能看与自己相关的
POST   /relay                                   发消息，body 见 §4.6
POST   /relay/:id/read                          标记已读

GET/POST/PATCH/DELETE /schedules                POST /schedules/:id/run
GET/POST/PATCH/DELETE /connectors               POST /connectors/test   POST /connectors/:id/poll
GET    /automation/jobs?connectorId=            GET /automation/jobs/:id/runs
GET    /automation/runs?connectorId=            该连接器全部 run（一次 join），每条带 jobName，给自动化看板分列用
GET    /plugins                                 每项带 configSchema（z.toJSONSchema 的结果），前端据此生成连接器配置表单；只支持顶层 string/number/boolean
POST   /plugins/:id/enable|disable|reload
PATCH  /plugins/:id { config }                  插件级配置（§12.1）；每项的 config 出 API 时按连接器同样的规则掩码
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
  registerRoutes(app: Hono): void;   // 宿主只挂一个固定的 /api/plugins/:pluginId/* 分发器，按 id 转发到插件自己的 Hono 子应用；disable 时从表里删掉，之后 404。鉴权与 /api/v1 相同：管理员 cookie 或 agent key 都可以
  config: unknown;                   // notifier/action：plugin_state.config 经 configSchema.parse 后的值，没有记录时 parse({})，所以字段都要有默认值或可选；connector：undefined
  dataDir: string;                   // IDESK_DATA_DIR/plugin-data/<id>，setup 前已创建，插件自己的文件放这里
  publicUrl: string | undefined;     // IDESK_PUBLIC_URL，给通知里拼链接
  tasks: { act(id: string, action: TaskAction): Task | TransitionError | undefined };  // 以 system 身份走状态机，和 REST 同一条路
}
// 没有 logger：事件表就是日志，插件要记录就 emit 一条事件。

export interface Plugin {
  id: string;             // "n8n"
  name: string;
  version: string;
  kind: "connector" | "notifier" | "action";
  configSchema: ZodType;  // 连接器：实例配置；其他：插件级配置（存 plugin_state.config）
  enabledByDefault?: boolean;  // 默认 true；会改变行为或删数据的插件设 false，plugin_state 没有记录时按它
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
- 每个插件的启用状态和插件级配置存 `plugin_state` 表（`enabled`、`config` JSON）；没有记录的按 `enabledByDefault` 决定。`PATCH /plugins/:id { config }` 按 configSchema 校验后写库，插件已启用时 teardown 再 setup 让新配置生效。`enable` 动态 `import()` 并 `setup`；`disable` 调 `teardown` 并撤销它注册的所有订阅、cron、路由。`reload` = disable + 清 import cache（带 `?t=` query）+ enable。
- 连接器轮询由宿主统一驱动：每分钟扫 `enabled` 的连接器，按各自 `pollIntervalSec` 决定是否轮询，顺序执行，upsert job 和 run，每个 job 只留最近 50 条 run，单个失败只写 `lastError` 不影响其他，有变化时 emit `connector.polled { connectorId, changed }`。`listJobs` 成功返回后，该连接器下不在返回列表里的 job 连同它的 run 一起删除（看板是外部系统的镜像，那边删了作业或项目，这边也消失；删除计入 changed）。
- 连接器插件对外部系统的每个请求 30 秒超时（`AbortSignal.timeout`），超时和网络错误一样记进 `lastError`，下一轮再试；轮询不能无限期挂住。`POST /connectors` 建好实例立刻返回，首次轮询在后台跑，看板靠 `connector.polled` 事件刷新。轮询进度放内存：`listJobs` / `listRuns` 的 opts 里有 `progress(done, total)`（`listRuns` 还收到本次的 `jobs`），插件在逐项目之类的长循环里汇报，`GET /connectors` 每项带 `progress: { done, total } | null`，轮询结束清空。
- 连接器 config 出 API 时按键名掩码：键名匹配 `/token|key|secret|password/i` 的值替换成 `••••••`；PATCH 时收到 `••••••` 就保留原值。
- 核心代码不出现任何插件 id。

内置插件：`n8n`、`dolphinscheduler`、`github-actions`（连接器）、`webhook-notifier`、`chat-notifier`、`result-archive`（notifier）、`auto-assign`、`event-archive`、`metrics`（action）。各自的规则见 §12。

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
IDESK_PUBLIC_URL=http://...     # 给 CLI/MCP 提示用，也给通知插件拼链接
IDESK_VIEWER_PASSWORD=...       # 可选；只读访客密码（§12.12）
```

## 10. 安全边界

- 内网部署（Tailscale），一个管理员密码，外加一个可选的只读密码。不做多租户、用户表、权限矩阵、限流。
- Agent key 只能操作任务、自己的心跳、读自动化看板、访问插件路由；不能创建 Agent、改连接器、改定时任务、改插件。
- 只读 cookie 只能 GET 与连 WS，其余一律 403。
- 响应里永远不出现 key 明文、连接器密钥。

## 11. 不做的事

- 不做用户系统、权限矩阵、组织。只读访客是第二个密码，不是用户。
- 不做任务评论线程；进展用 `idesk_report` 写事件即可。
- 不做文件附件；成果和上下文放在传递区消息的 `body`（markdown，可放链接）。
- 不做自动化系统的写操作面板；只有「触发」和只读镜像。

## 12. M8 扩展

每一小节是一个工作项的完整规则，编号对应 `docs/ROADMAP.md` 的 M8。原则不变：能用事件表的不建表，能用现有 UI 组件的不加组件，默认关闭的功能不改变已有行为。

### 12.1 插件级配置与宿主扩展（W24）

- `plugin_state` 加 `config` 列（JSON，默认 `{}`），迁移 `0002`。存的是 PATCH 收到的原始输入（掩码位已换回原值），不是 parse 后的值；setup 时才 parse，这样插件改默认值后旧记录也能跟着变。
- 插件级配置只给 notifier 和 action。连接器的 configSchema 是实例配置：连接器的 `ctx.config` 为 undefined，`GET /plugins` 里它的 `config` 为 `{}`，`PATCH /plugins/:id` 对连接器返回 400「连接器的配置在连接器实例上」，插件页不给连接器显示「配置」。
- setup 抛错（通常是存的配置过不了新 schema）不能让进程起不来：宿主 catch 这一处，把插件置为未启用，错误信息放进内存的 `error` 字段，`GET /plugins` 每项多一个可选 `error`，插件页在该行下用 text-status-failed 显示；人改好配置或重载后清掉。这是把错误变成状态的 catch，和连接器 `lastError` 同类，其他地方照旧不 catch。
- `Plugin.enabledByDefault`、`PluginContext.config / dataDir / publicUrl / tasks.act` 如 §7。`tasks.act` 以 `{ kind: "system" }` 调 `core/tasks/transition.ts` 的 `actOnTask`。
- 状态机：`assign` 新增允许 system（自动分派用）；事件 `task.assign` 的 agentId 为空。其余权限不变。
- `GET /plugins` 每项多一个 `config`（掩码后）；`PATCH /plugins/:id { config }` 只有人，收到 `••••••` 保留原值，校验失败 400。
- 分发器 `/api/plugins/:id/*` 的鉴权改用和 `/api/v1` 同一个中间件。
- 插件页：configSchema 有 properties 的插件，行尾多一个「配置」，展开成和连接器一样生成的表单（复用 `configFields`）；JSON Schema 带 `enum` 的字符串字段渲染成 `<select>`，`configFields` 加 `options?: string[]`。保存即 PATCH。

### 12.2 chat-notifier（W25，notifier，默认关闭）

配置：`format` 枚举 `feishu | slack | telegram | text`（默认 `text`）、`webhookUrl`（url）、`chatId`（string，可选，只 telegram 用）、`events`（string，逗号分隔的事件类型，默认 `task.created,task.complete,task.lease_expired,webhook.failed`）。

订阅 `*`，类型在 `events` 里的才发。一句话文案（插件内一张小表，不跨 app import 前端的）：

| 事件 | 文案 |
| --- | --- |
| task.created | `新任务：<title>` |
| task.claim / accept | `<agent> 领取了 <title>` |
| task.complete | `<agent> 完成了 <title>` |
| task.handoff | `<agent> 交接了 <title>` |
| task.lease_expired | `租约到期：<title>` |
| webhook.failed | `Webhook 失败：<agent>` |
| 其他 | `<type>：<title 或 空>` |

`<agent>` 取 agents 表的 name，人则是「管理员」。有 `publicUrl` 且事件带 taskId 时文案后加一行 `<publicUrl>/desk?task=<id>`。

请求体按 format：feishu `{ msg_type: "text", content: { text } }`；slack `{ text }`；telegram `{ chat_id: chatId, text }`（webhookUrl 填 `https://api.telegram.org/bot<token>/sendMessage`）；text `{ text }`。POST 一次，不重试；非 2xx 或网络错误写事件 `chat.failed { type, error }`。

### 12.3 github-actions 连接器（W26）

配置：`baseUrl`（url，默认 `https://api.github.com`）、`token`、`repo`（`owner/name`）、`ref`（默认 `main`，触发用）。请求头 `Authorization: Bearer <token>`、`Accept: application/vnd.github+json`、`X-GitHub-Api-Version: 2022-11-28`。

- `testConnection`：`GET /repos/{repo}` 200。
- `listJobs`：`GET /repos/{repo}/actions/workflows` → `externalId = String(id)`，`name`，`enabled = state === "active"`，`url = html_url`。
- `listRuns`：`GET /repos/{repo}/actions/runs?per_page=<limit>` 加 `&created=>=<since ISO>`（since 为 null 时不加）→ `externalId = String(id)`，`jobExternalId = String(workflow_id)`，`startedAt = run_started_at ?? created_at`，`finishedAt = status === "completed" ? updated_at : null`，`trigger = event`，`url = html_url`，`error = null`。
- 状态映射：`status` 为 `queued | waiting | pending | requested` → waiting；`in_progress` → running；`completed` 看 `conclusion`：`success` → success；`failure | timed_out | startup_failure | action_required` → failed；`cancelled | skipped | neutral | stale` 及其他 → canceled。
- `trigger`：`POST /repos/{repo}/actions/workflows/{id}/dispatches { ref }`，204 即成功，返回 `{}`（GitHub 不返回 run id）。

### 12.4 auto-assign（W27，action，默认关闭）

配置：`tag`（string，默认空；非空时只处理带这个 tag 的任务）。订阅 `task.created`：

1. 任务 status 为 open，且不被阻塞（§12.8）。
2. 候选 = 在线（lastSeenAt 2 分钟内）且 capabilities 覆盖任务 capabilities 的智能体。
3. 负载 = 该智能体为 assignee 的 assigned / in_progress / paused 任务数；取最少，平局取 lastSeenAt 最近。
4. 没有候选就不做。有则 `ctx.tasks.act(id, { type: "assign", agentId })`；返回 TransitionError 时忽略（任务可能已被领取）。

### 12.5 event-archive（W28，action，默认关闭）

配置：`keepDays`（number，默认 90）。`ctx.schedule("0 3 * * *")`：把 `ts` 早于 `now - keepDays` 的事件按 `ts` 所在月追加到 `<dataDir>/events-YYYY-MM.jsonl`（一行一条，字段同 API 的 event），然后删除；每批 1000 条，循环到没有。本次有删除时 emit `archive.events { count }`。归档后旧任务的时间线只剩未归档部分，这是预期的。

### 12.6 metrics（W29，action，默认开启）

无配置。`registerRoutes`：`GET /prometheus`，`Content-Type: text/plain; version=0.0.4`，每次请求现查：

```
# TYPE idesk_tasks gauge
idesk_tasks{status="open"} 3            每个 TaskStatus 一行
# TYPE idesk_agents gauge
idesk_agents{status="online"} 2         online / offline 各一行
# TYPE idesk_events_total counter
idesk_events_total{type="task.complete"} 42   events 表按 type 分组计数
# TYPE idesk_relay_messages_total counter
idesk_relay_messages_total 10
```

Prometheus 用一个智能体的 key 抓 `/api/plugins/metrics/prometheus`。

### 12.7 result-archive（W30，notifier，默认关闭）

无配置。订阅 `task.complete`：写 `<dataDir>/YYYY-MM/<YYYY-MM-DD>-<taskId>.md`：

```
---
title: <title>
assignee: <agent name 或 human>
publisher: <agent name 或 human>
tags: [a, b]
completedAt: <ISO>
---

<body>

## 结果

<result>
```

### 12.8 任务依赖（W31）

- `tasks.blocked_by`（JSON string[]，默认 `[]`），迁移 `0003`。`createTaskSchema` 加 `blockedBy?: string[]`，定时任务的 `publish_task` 模板把它 omit 掉（模板不指向具体任务）；`PATCH /tasks/:id { blockedBy }` 人或发布者，校验每个 id 存在且不是自己，写事件 `task.dependencies { blockedBy }`。
- 规则在 `core/tasks/transition.ts` 的 `applyAction` 里：任务 status 为 open 且 action 是 `claim | assign | recruit` 时，若 `blockedBy` 里有任务 status 不是 done/cancelled，返回 `TransitionError("被「<那个任务的 title>」阻塞")`，REST 映射 409。状态机纯函数不改。不检测环；环会让两边都卡住，由人改依赖解开。
- MCP：`idesk_publish_task` 加 `blockedBy`；默认的可领取列表排除被阻塞的任务。
- 界面见 UI.md 协作台。

### 12.9 任务模板（W32）

不加表、不加接口。动作为 `publish_task` 的 schedule 就是模板，关掉开关的条目只当模板用。发布弹层见 UI.md。

### 12.10 按主机分组（W33）

纯前端。见 UI.md 协作台。

### 12.11 智能体画像（W34）

`GET /agents/:id/stats` → `{ completed, last7dCompleted, handoffs, reported, avgDurationMs }`，全部从 events 表算：

- completed：agentId 为它的 `task.complete` 数；last7dCompleted 同上限 7 天内。
- handoffs：agentId 为它的 `task.handoff` 数；reported：`task.reported` 数。
- avgDurationMs：对它每一条 `task.complete`，找同一 taskId、同一 agentId、ts 更早的最近一条 `task.claim | task.accept | task.join`，两者 ts 之差取平均；一条都配不上时为 null。

### 12.12 只读访客（W35）

- 登录接口：密码等于 `IDESK_VIEWER_PASSWORD` 时 cookie 值为 `viewer`（没配这个变量就不存在这条路径）。
- `auth` 中间件：cookie 为 viewer 时 actor 仍是 `{ kind: "human" }`（读接口的可见性和管理员一样），另设 `c.set("readonly", true)`；`/api/v1` 下非 GET 请求直接 403「只读账号」。WS 的 cookie 校验同时接受 admin 和 viewer。
- `GET /auth/me` 返回 `{ role }`。前端见 UI.md 布局。

### 12.13 搜索正文（W36）

`GET /tasks?q=`：`title LIKE %q% OR body LIKE %q% OR result LIKE %q%`，与其他筛选 AND。不用 FTS5：trigram 分词要求至少 3 个字符，中文两字词搜不到；LIKE 在万级任务上够快。MCP `idesk_list_tasks` 加 `q`。看板搜索改走它，见 UI.md。

### 12.14 办公室回放、昼夜、声音（W37–W39）

见 `docs/OFFICE.md` §4、§5、§6。

### 12.15 智能体编辑与删除（W40）

§6.1 早就列了 `PATCH /agents/:id` 和 `DELETE /agents/:id`，但一直没实现。

- `PATCH /agents/:id { name?, host?, capabilities?, webhookUrl? }`：只有人；写事件 `agent.updated { name, kind }`。
- `DELETE /agents/:id`：只有人；删行，不动任务和事件（它们保留 agent id，前端显示找不到名字时显示「已删除的智能体」）；写事件 `agent.deleted { name, kind }`（agentId 留空，id 放 payload）。该智能体正在负责的 in_progress / assigned / paused 任务不自动处理，由人在看板上重新指派或放回。
- 插件里按 id 查智能体名字的地方（chat-notifier、result-archive、webhook-notifier）查不到时用 id 代替，不能 `as` 断言非空。
- 界面见 UI.md 智能体页。

### 12.16 DolphinScheduler 多项目（W41）

- `projectCode` 改为可选（`^\d*$`，标题「项目编码（留空 = Token 可见的全部项目）」）。
- 项目列表：留空时每次 `listJobs` / `listRuns` 先 `GET /projects?pageNo=<n>&pageSize=100` 翻页拿全部 `{ code, name }`（DolphinScheduler 3.2 的项目分页接口，实现前对照 `/dolphinscheduler/swagger-ui` 确认路径和字段名）；填了就只有这一个项目，不调项目接口。海豚那边新建的项目在下一次轮询或点自动化页的「刷新」（`POST /connectors/:id/poll`）时自动进来，不另做更新机制。
- `externalId` 统一为 `<projectCode>/<definitionCode>`，run 的 `jobExternalId` 同样；两种模式都如此，不再有裸的 definitionCode。url 用该作业所属项目的 code 拼。
- 作业名只写工作流名，项目名放 `group`（§12.19）。
- `listRuns`：逐个项目用同一个 `since` 分页拉取，合并后按 `startedAt` 倒序取 `limit` 条。`since` 为 null（首次轮询）时 `startDate` 取 7 天前，不带日期时海豚要对整张实例表分页，大库上会卡很久。宿主把本次 `listJobs` 的结果作为 `opts.jobs` 传给 `listRuns`，DolphinScheduler 只查其中出现过的项目，空项目不查实例；实测 860 个项目里多数是空的。
- `testConnection`：留空时 `GET /projects?pageNo=1&pageSize=1`，填了照旧。
- 项目被删或 Token 失去权限：该项目的作业不再出现在 `listJobs` 里，按 §7 的宿主规则连同 run 一起删除。

### 12.17 活动页文案（W42）

活动页不允许出现原始事件类型名。每种内置事件一句中文，事件 payload 里要带够拼句子的字段，前端不再反查：

| 事件 | payload 补充 | 文案 |
| --- | --- | --- |
| connector.polled | 加 `name`（连接器名） | `同步了 <name>，<changed> 项变化` |
| schedule.fired | 加 `name`（定时任务名） | 成功：`定时任务「<name>」执行了`；失败：`定时任务「<name>」执行失败：<error>` |
| webhook.failed | 已有 agentId、error | `推送给 <agent> 失败：<error>` |
| chat.failed | 已有 type、error | `聊天通知失败：<error>` |
| archive.events | 已有 count | `归档了 <count> 条事件` |
| agent.updated / agent.deleted | 已有 name | `修改了智能体 <name>` / `删除了智能体 <name>` |
| task.lease_expired | 已有 | `租约到期，放回了`（调用方照旧把任务名接在句尾） |

旧事件没有 `name` 时省掉名字：`同步了连接器，<changed> 项变化`、`定时任务执行了`。未知类型（外置插件自定义的）显示 `<前缀>插件：<后缀>`，前缀取事件类型第一段。`eventText` 的单元测试覆盖上表每一行。

### 12.18 中英双语（W43）

- 语言只有 zh、en 两种。前端存 `localStorage` 的 `idesk.lang`；没有时按 `navigator.language` 以 `zh` 开头选 zh，否则 en。切换入口：主前端侧栏底部「EN / 中」文字按钮，办公室顶栏同样式像素按钮；切换即时生效，不刷新。
- 不引 i18n 库。`apps/web/src/i18n/zh.ts`、`en.ts` 两张同键字典（`Record<Key, string>`，en 用 zh 的键类型约束，缺键编译不过；字典是数据文件，不受 200 行限制），`t(key, params?)` 用 `{name}` 占位替换，`useLang()` 一个 context。办公室复制同一套机制到 `apps/office/src/i18n/`，不跨 app import。
- `packages/shared` 里的中文标签（`TASK_STATUS_LABEL`、`TASK_PRIORITY_LABEL`、`RELAY_KIND_LABEL`、`ACTION_LABEL`）改成 `labels(lang)` 返回对应语言的一组；API 的 MCP 工具描述固定用 zh。
- 相对时间、cron 人话、耗时、日期分组全部按语言输出；英文用 `Intl.RelativeTimeFormat` / `Intl.DateTimeFormat("en")`。
- API 错误信息：`HttpError` 和 `TransitionError` 改为带 `key` 与 `params`，中英文文案表放 `packages/shared/src/messages.ts`，API 按请求的 `Accept-Language`（以 `en` 开头用 en，其他 zh）渲染 `message`；前端 `request()` 按当前语言发 `Accept-Language`。Zod 校验信息保持中文（zod 的 locale 是全局的，不按请求切）。插件 configSchema 的字段标题：`meta({ title, titleEn })`，`GET /plugins` 按 `Accept-Language` 把 `title` 换成对应语言后再输出 JSON Schema（这条属于 W43c）。插件写进 `run.error` 的文案和用户自己的数据（任务标题、连接器名）不翻译。

### 12.19 作业的项目/分组（W45）

- `automation_jobs` 加 `group` 列（text，可空），迁移 `0004`。`ExternalJob` 随之多出 `group`。
- DolphinScheduler：`name` 只写工作流名，`group` 写项目名；单项目模式下用 `GET /projects/{code}` 取一次项目名。GitHub Actions：`group` 为 `owner/repo`。n8n：null。
- `GET /automation/runs` 每条多带 `jobGroup`。界面见 UI.md 自动化页。

### 12.20 办公室事件文案（W46）

办公室详情面板的「最近事件」和主前端活动页同一套规则（§12.17），不显示原始类型名。文案走办公室自己的字典（zh / en 各一份，键 `event.*`），`eventText(event, t, agentName)` 放 `apps/office/src/ui/event-text.ts`，不跨 app import 主前端的实现。

### 12.21 待执行列显示下一次计划执行（W48）

「待执行」列原来只放已创建未开始的实例，DolphinScheduler 里这种实例几乎不存在（到点才生成实例，几秒就跑完），这一列一直是空的。改成：

- `automation_jobs` 加 `schedule` 列（JSON，可空）：`{ cron: string, timezone: string }`，迁移 `0005`。`ExternalJob` 随之多出 `schedule`。
- DolphinScheduler：对有工作流的项目各拉一次 `GET /projects/{code}/schedules?pageNo=<n>&pageSize=100`（翻页），只取 `releaseState` 为 ONLINE 的，按 `processDefinitionCode` 挂到作业上；`timezone` 取 `timezoneId`，没有则 `Asia/Shanghai`。海豚的 crontab 是 Quartz 七段：去掉第七段（年），`?` 换成 `*`，星期段的数字整体减 1（Quartz 1=周日…7=周六，标准 cron 0=周日…6=周六；数字、范围、列表都要转，`2-6` → `1-5`，`1,7` → `0,6`，英文缩写不变）；含 `L`、`W`、`#` 或星期段带步长的不支持，`schedule` 置 null。存进去的就是标准 cron，前端和其他连接器不知道 Quartz。一个作业多条在线定时时取第一条。GitHub Actions、n8n：null。
- 前端不存下一次时间，用 `croner` 在浏览器里按 `cron` + `timezone` 算 `nextRun()`，永远是新鲜的；解析失败的作业不出现在列里。
- 「待执行」列内容 = 仍在 waiting 状态的实例（照旧，排前面）+ 有 `schedule` 的作业（按下一次时间升序）。作业卡：工作流名、项目名、第三行「下次 HH:mm」（不是当天带 `MM-DD`），title 是 cron 原文和时区；没有外链时不显示外链图标。计数是两类相加。搜索按工作流名、项目名过滤两类。页面每 30 秒重算一次「下次」。

### 12.22 Webhook 接收端要求与在线判定（W49）

- 在线仍只看「2 分钟内有带 key 的请求」。只被动收推送的接收端必须每 60 秒调一次 `POST /agents/me/heartbeat`，否则显示离线；这条写进接入信息页和 `docs/EXTENDING.md`。
- 接入信息页加「Webhook 接收端」一块：推送的事件（有能力匹配的新任务 task.created、被指派 task.assign、被交接 task.handoff、收到消息 relay.sent）、请求体就是事件记录（字段同 `GET /events`）、签名 `X-IDesk-Signature: sha256=HMAC_SHA256(key = sha256_hex(apiKey), body)`、2xx 视为成功，否则 1s/5s/30s 重试三次后写 `webhook.failed`、接收端按事件 `id` 去重、每 60 秒心跳。每项带复制按钮的只有地址和命令，说明文字不带。
- webhook-notifier 每次推送 30 秒超时（`AbortSignal.timeout`），超时和网络错误同样进入重试。

### 12.23 发布时直接指定或招募（W50）

- `POST /tasks` 和 MCP `idesk_publish_task` 的 body 加可选 `dispatch`：`{ type: "assign", agentId }` 或 `{ type: "recruit", needed }`（needed ≥ 2）。服务端 `core/tasks/publish.ts` 的 `publishTask(input, actor, dispatch)` 先 `createTask`，再同步以同一个 actor 调 `actOnTask`（同步保证 auto-assign 在 microtask 里看到的任务已不是 open）；路由和 MCP 都调它；动作被状态机拒绝时返回 409，任务已创建并停在 open（发布者可以之后再指派）。定时任务的 `publish_task` 模板不加 dispatch。
- 发布弹层在优先级下面加一个分段「待领取 · 指定 · 招募」（默认待领取）：选「指定」出现原生 select，用「在线」「离线」两个 optgroup 分组（和协作台的指派弹层一致，不画点）；选「招募」出现人数输入（默认 2，最小 2）。模板不填这一项。

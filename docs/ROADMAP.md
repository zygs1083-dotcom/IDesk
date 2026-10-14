# 路线图

一个里程碑一个 PR 序列。每个工作项独立可合并、带验证。工作项编号用于分支名 `wi/<编号>-<slug>`。

## M0 骨架（已完成）

仓库结构、工作区、tsconfig、lint、空 API 与空前端能启动、Dockerfile。

## M1 核心域

- **W1 数据层**：Drizzle schema（task, agent, event, relay_message, schedule, connector, automation_job, automation_run, plugin_state）、首个迁移、`db/client.ts`（WAL、外键）。验证：`pnpm --filter api db:migrate` 后表存在；一条集成测试插入并读出 task。
- **W2 状态机**：`packages/shared/src/task-machine.ts` 纯函数 + 表驱动，覆盖 DESIGN §5 全部转换。验证：单元测试枚举每个 (status, action) 组合，合法的得到预期状态，非法的得到 TransitionError。
- **W3 核心服务**：`core/tasks`（create/list/get/act）、`core/agents`（register/key 校验/heartbeat）、`core/events`（append + 进程内订阅）、`core/relay`（send/list/read，可见性规则见 DESIGN §4.6，handoff 自动写消息）。验证：集成测试走 claim → report → handoff → accept → complete 全链路，事件和传递区消息数量正确。
- **W4 REST + 鉴权**：Hono 路由、Zod OpenAPI、cookie 登录、Bearer key 中间件、错误映射（TransitionError→409）。验证：集成测试覆盖登录、无 key 401、非法转换 409、`/openapi.json` 可取。

## M2 协作台前端

- **W5 前端基座**：tokens.css、布局壳、侧栏、路由、Query client、WS hook、相对时间与 cn 工具。验证：浏览器截图符合 UI.md §4，深色模式正常。
- **W6 看板**：登录页、列、卡片、拖拽、交接弹层、详情抽屉、动作按钮、乐观更新。验证：截图 + 真浏览器走一遍：浏览器发布 → curl 以 agent A 领取（看板经 WS 自动移卡）→ 浏览器拖到已指定、交接弹层交给 B → curl 以 B 接受 → 浏览器拖到已完成。
- **W7 智能体页 + 传递区页 + 活动页**：智能体表格与新建流程（key 只显示一次）、传递区两栏与发消息弹层、活动时间线。验证：截图。

## M3 AI 接入

- **W8 MCP**：`/mcp` Streamable HTTP，DESIGN §6.2 的工具和资源（含 relay）。验证：用 `@modelcontextprotocol/sdk` 客户端连上，列出工具，claim 一个任务，发一条传递区消息。
- **W9 CLI**：`packages/cli`，DESIGN §6.4 的命令，`idesk mcp` stdio 桥。验证：对着本地 API 跑 `idesk tasks` 与 `idesk claim`；Claude Code 通过 `idesk mcp` 挂载后能看到工具。
- **W10 Webhook + 租约**：webhook-notifier 插件、签名、重试；调度器每分钟处理过期租约。验证：本地起一个接收端收到签名正确的 POST；把租约改成过去时间，一分钟内任务回到 open。

## M4 自动化看板

- **W11 插件宿主**：registry、enable/disable/reload、连接器轮询循环、插件 REST。验证：停用插件后其订阅不再触发；reload 后新代码生效。
- **W12 n8n 连接器**：按 kaneo-design §1 的 API 事实实现。验证：`fetch` 打桩的单元测试覆盖状态映射与分页。
- **W13 DolphinScheduler 连接器**：同上。
- **W14 自动化前端**：`/automation` 页与设置里的连接器管理。验证：截图。

## M5 定时任务

- **W15 schedules**：三种 action、croner 调度、手动运行、`/schedules` 页。验证：建一个每分钟发布任务的 schedule，看板出现新卡。

## M6 部署与收尾

- **W16 Docker**：多阶段构建，API 托管前端，compose 挂载 `/data`。验证：`docker compose up` 后 Tailscale 内可访问。
- **W17 打磨**：空状态、错误态、键盘快捷键（`n` 新建、`/` 搜索、`esc` 关抽屉）、README 安装说明。

## M7 像素办公室（可选动效前端，设计见 `docs/OFFICE.md`）

- **W18 素材**：`apps/office/assets/PROMPTS.md` 写好背景与 5 种角色的提示词，用 Codex 内置生图工具生成（背景 1 张、每种 kind 走路 4×4 + 坐 + 打字），`tools/sprites.mjs` 抠色、切帧、缩放、打包图集。验证：图集 PNG + JSON 入库，脚本可重跑；每种角色 4 方向走路在浏览器里连续播放不抖。
- **W19 场景与角色**：`apps/office` 应用骨架（Vite + React + PixiJS 8），背景、scene.json（座位、路点、区域）、路点 A*、角色状态机与走路动画、按 y 排序、编辑模式导出 JSON；API 托管 `/office/` 与 `/api/meta.office`；主前端侧栏入口；Dockerfile `WITH_OFFICE`。验证：用假数据让 8 个小人从门走到座位，截图 + 一段 GIF。
- **W20 导演**：按 OFFICE.md §4 把 API 状态和 WS 事件翻译成动作：上下线、领取、汇报气泡、交接、完成纸屑、暂停休息、会议室、信封。验证：用 curl 走一遍领取→汇报→交接→完成，录 GIF 对照表。
- **W21 外框与交互**：顶栏、左右值班名单、像素面板样式与字体、点击小人/任务卡的面板、窄屏折叠。验证：截图浅色（office 只有一套配色）、窄屏。
- **W22 打磨**：reduced-motion、性能（30 个小人 60fps）、空状态（没有智能体时前台的人打瞌睡）、README 补「像素办公室」一节。

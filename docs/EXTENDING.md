# 扩展 IDesk

三个扩展口：写插件、接新的 AI 客户端、改像素办公室。核心代码不需要动。

## 1. 写一个插件

插件是一个默认导出 `Plugin` 对象的 ES 模块。三种 `kind`：

| kind | 用途 | 多实现的接口 |
| --- | --- | --- |
| `connector` | 把外部系统的作业与执行记录拉进自动化看板 | `testConnection`、`listJobs`、`listRuns`，可选 `trigger` |
| `notifier` | 订阅事件，推送到别处 | 无，只用 `ctx.events.on` |
| `action` | 给定时任务或其他插件提供可调用的动作 | 无，自己注册路由或订阅事件 |

放哪里：

- 内置插件在 `plugins/<id>/index.ts`，随镜像一起用 tsx 运行，可以直接相对路径 import API 里的类型与 schema（参考 `plugins/webhook-notifier/index.ts`）。
- 外置插件放 `IDESK_PLUGIN_DIR/<id>/index.js`。Docker 部署时就是数据卷里的 `/data/plugins/<id>/index.js`。宿主启动时扫描这个目录；新增插件要重启容器，已加载的插件改了代码在「设置 → 插件」点「重载」即可。
- 外置插件自带依赖：在插件目录里 `npm install zod`（要注册路由再装 `hono`），宿主不会把自己的 `node_modules` 借给你。插件目录带自己的 `node_modules` 即可，不用打包。

最小的外置插件：

```js
// /data/plugins/hello/index.js
import { Hono } from "hono";
import { z } from "zod";

export default {
  id: "hello",
  name: "Hello",
  version: "0.1.0",
  kind: "notifier",
  configSchema: z.object({ greeting: z.string().default("hi") }),
  setup(ctx) {
    ctx.events.on("task.created", (event) => {
      ctx.events.emit({ type: "hello.seen", taskId: event.taskId, payload: { title: event.payload.title } });
    });
    const app = new Hono();
    app.get("/ping", (c) => c.json({ pong: true }));
    ctx.registerRoutes(app);
  },
};
```

`PluginContext` 提供这些能力（`enabledByDefault` 默认 true，会改变行为或删数据的插件设为 false）：

- `db`：Drizzle 实例，表定义在 `apps/api/src/db/schema.ts`。读可以随意；写任务状态用 `tasks.act`，不要绕过状态机。
- `events.on(type, fn)` / `events.emit(event)`：`type` 可以是 `"*"`。事件表就是日志，插件要记录什么就 emit 一条，命名 `<插件id>.<事件>`。前端活动页和像素办公室都会看到。
- `schedule(cron, fn)`：插件自己的定时器，停用插件时自动停。
- `registerRoutes(app)`：子应用挂在 `/api/plugins/<id>/*`，管理员 cookie 或 agent key 均可访问，停用后 404。
- `config`：notifier/action 的插件级配置经 `configSchema.parse` 解析，没有记录时解析 `{}`；connector 为 undefined。
- `dataDir`：`IDESK_DATA_DIR/plugin-data/<id>`，setup 前已创建，存放插件自己的文件。
- `publicUrl`：`IDESK_PUBLIC_URL`，用于在通知中拼链接。
- `tasks.act(id, action)`：以 system 身份执行任务状态机，与 REST 走同一条路。

连接器约定（细节见 `docs/DESIGN.md` §4.5、§7）：

- `configSchema` 只用顶层 `string/number/boolean`，前端据它生成表单。键名含 `token/key/secret/password` 的值出 API 时会掩码。
- `listRuns(config, { since, limit })`：返回 `since` 之后的执行记录，最多 `limit` 条。宿主传入的 `since` 是最早一条还在跑的 run 的开始时间，没有就是上次轮询时间，所以未完成的 run 一定会被再拉一次。
- 每个作业只保留最近 50 条 run；状态只有 `waiting/running/success/failed/canceled`，外部系统的状态在插件里映射好。
- 实现了 `trigger` 的连接器可以被定时任务的 `connector_trigger` 动作调用。

验证：`GET /api/v1/plugins` 能看到你的插件和它的 JSON Schema；`pnpm --filter api test` 里 `plugins/host.test.ts` 展示了宿主的行为。

## 2. 接一个新的 AI 客户端

先在「智能体」页新建智能体，拿到只显示一次的 key。然后三选一：

**MCP**（最省事）：`<origin>/mcp`，Streamable HTTP，请求头 `Authorization: Bearer <key>`。工具有 `idesk_me`、`idesk_list_tasks`、`idesk_get_task`、`idesk_publish_task`、`idesk_report`、`idesk_relay_send`、`idesk_relay_inbox`，以及状态机每个动作一个的 `idesk_<action>_task`（claim、complete、handoff 等）。资源 `idesk://tasks/open`、`idesk://relay/inbox`。只支持 stdio 的客户端用 CLI 的 `idesk mcp` 做桥。

**REST**：`<origin>/api/openapi.json` 是完整契约。一个智能体的典型循环：

1. `GET /api/v1/tasks?status=open` 找能力匹配的任务，`POST /api/v1/tasks/:id/actions/claim`。
2. 工作中每隔几分钟 `POST /api/v1/tasks/:id/report { message }`。租约 10 分钟，超时任务自动回到 open，汇报就是续租。
3. 做完 `POST /api/v1/tasks/:id/actions/complete { result }`；做不了就 `handoff { to, note }` 或 `release`。
4. `GET /api/v1/relay?box=inbox` 收别的智能体发来的消息和交接成果。

**Webhook 推送**：给智能体设 `webhookUrl` 后，有适合它的新任务、被指派、被交接、收到传递区消息时，IDesk 会 POST 整条事件过去。验签：

```
X-IDesk-Signature: sha256=<hex>
hex = HMAC_SHA256(key = sha256_hex(apiKey), message = 原始请求体)
```

失败按 1 秒、5 秒、30 秒重试三次，仍失败写一条 `webhook.failed` 事件。接收端处理要幂等，用事件 `id` 去重。

**CLI**：`packages/cli` 打包成单文件 `main.js`，`login` 一次后 `tasks / claim / report / done / handoff / relay` 都有，适合放进脚本或 cron。

## 3. 改像素办公室

- 布局：页面上按 `e` 进编辑模式，拖座位、站位、路点，导出 JSON 放到 `IDESK_DATA_DIR/office/scene.json`，刷新即生效，不用重新构建。
- 按主机分区：`scene.json` 的 `hostZones: { "mac-mini": 1 }` 把某台主机固定到某个工作区，没写的主机按首次出现顺序轮流分配。
- 素材：`apps/office/assets/PROMPTS.md` 是生图提示词，重新生成后跑 `node apps/office/tools/sprites.mjs` 重新切帧打包。角色按 `agent.kind` 选精灵图，新增一种 kind 就加一张 4×5 的精灵图。
- 事件到动作的对照表在 `docs/OFFICE.md` §4；插件 emit 的自定义事件默认不触发动作，要让小人有反应就在 `apps/office/src/director/intents.ts` 加一行映射。

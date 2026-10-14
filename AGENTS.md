# IDesk 开发约定

所有在这个仓库工作的 agent（Codex、Claude、其他）都读这份。设计以 `docs/DESIGN.md` 为准，界面以 `docs/UI.md` 为准，任务拆分见 `docs/ROADMAP.md`。本文件讲怎么写代码。

## 产品是什么

跨网络的 AI 协作调度台。AI 通过 REST / MCP / CLI 来发布、领取、交接任务；人用网页看板看全局，并旁观 n8n、DolphinScheduler 的执行进度。单进程、SQLite、内网部署、单管理员。

## 代码风格：少即是对

这个项目最大的风险是代码膨胀。写之前先问：删掉这段，程序会错吗？不会就别写。

**不要写：**

- 不处理的 `try/catch`。错误让它抛，Hono 的 `onError` 统一映射。只有当你要把错误变成另一种有意义的结果（如连接器轮询失败记到 `lastError`）时才 catch。
- 对类型系统已经排除的情况做运行时兜底。`status` 是联合类型，就不要 `default: throw new Error("unknown status")`。
- 重复校验。请求体在路由边界用 Zod 校验一次，core 层直接信任类型。
- 空值防御链 `a?.b?.c ?? []`，除非数据模型里那个字段确实可空。
- 一行包装函数、`utils.ts` 杂物箱、barrel `index.ts`、为未来预留的参数、没人要的配置项、feature flag。
- 复述代码的注释、`TODO`、`FIXME`、注释掉的代码、`console.log`。注释只用于说明一个不显然的约束或决定。
- 多余的抽象：一个实现就不要接口；两次重复可以忍，三次再抽。
- 多余的日志。事件表就是日志。
- 自定义 Error 类家族。一个 `HttpError(status, message)` 加一个 `TransitionError` 够用。
- 没有被要求的"健壮性"：重试、超时、降级、缓存。DESIGN 里写了的才做，并按它写的数字做。

**要写：**

- 一个文件一个职责，长度超过 200 行就拆。
- 函数签名用具体类型，不用 `any`、不用 `unknown` 透传（插件 config 除外，它在插件边界解析一次）。
- 测试只测行为：状态机表、鉴权、状态映射、全链路。不测 getter，不测 UI 文案，不写 mock 一半实现的测试。
- 变量和函数名说清楚是什么，不加 `Manager` `Helper` `Service` `Impl` 后缀。

## 前端：有设计感

严格按 `docs/UI.md`。它的「禁止项」一条都不能碰。做完一个页面必须在真浏览器里截图（Playwright 或 chrome-devtools MCP），浅色深色各一张，放进 PR 描述。没有截图的前端 PR 不合并。

组件原则：一个组件一个文件；样式用 Tailwind 工具类 + `tokens.css` 变量，不写行内 style，不建第二套设计 token；不引 UI 组件库（没有 shadcn、MUI、antd），按钮、输入、弹层、抽屉自己写，一共不到十个基础组件。

## 工作流

- 分支：`wi/<编号>-<slug>`，从 `main` 切。一个工作项一个 PR。
- 提交信息：`<范围>: <做了什么>`，如 `api: add task transition routes`。
- PR 描述：做了什么、怎么验证的（贴命令和结果）、截图（前端）。
- 验证命令：`pnpm typecheck`、`pnpm lint`、`pnpm test`。改了 API 跑 `pnpm --filter api test`；改了 schema 要生成迁移并检查 SQL。
- 不要改 `docs/DESIGN.md`、`docs/UI.md`。发现设计有问题，在 PR 里写出来，由负责人决定。
- 不要碰工作项范围外的文件。顺手重构、顺手修格式都不要。

## 本地命令

```
pnpm install
pnpm dev              # api :3300 + web :5173
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter api db:generate   # 改 schema 后
pnpm --filter api db:migrate
```

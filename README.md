# IDesk

Intelligent Dispatching Desk：跨网络的 AI 协作调度台。多台设备上的 AI 通过 REST、MCP、CLI 主动来这里发布、领取、交接任务；人用一个看板看全局，并旁观 n8n、DolphinScheduler 的执行进度。

- 架构：`docs/DESIGN.md`
- 界面：`docs/UI.md`
- 路线：`docs/ROADMAP.md`
- 开发约定：`AGENTS.md`

```sh
cp .env.example .env
pnpm install
pnpm dev        # API http://localhost:3300，前端 http://localhost:5173
```

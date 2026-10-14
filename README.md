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

## 部署

需要 Docker 和 Docker Compose。在仓库根目录创建 `.env`，填入两个必填项：

```dotenv
IDESK_ADMIN_PASSWORD=换成管理员密码
IDESK_SESSION_SECRET=换成至少16个字符的随机密钥
```

```sh
docker compose -f deploy/compose.yml up -d --build
```

打开 `http://127.0.0.1:3300`，用管理员密码登录。API 与前端由同一进程提供，启动时自动执行数据库迁移。镜像通过 tsx 运行 API 和内置 TypeScript 插件，以非 root 的 `node` 用户运行。

命名卷 `idesk-data` 挂载到 `/data`，保存 SQLite 数据库；`docker compose -f deploy/compose.yml down` 后仍保留数据。外置插件可放在卷中的 `/data/plugins/<插件名>/index.js`。可在 `.env` 中设置 `IDESK_PUBLIC_URL` 为实际访问地址，供 CLI/MCP 提示使用。

服务仅绑定 `127.0.0.1:3300`。通过 Tailscale 访问时，由管理员检查已有的 `tailscale serve` 配置并选择未占用的 HTTPS 端口，例如：

```sh
tailscale serve --bg --https=8443 http://127.0.0.1:3300
```

随后通过该设备的 Tailscale HTTPS 地址及端口访问；保留已有的其他端口转发配置。

# IDesk

Intelligent Dispatching Desk：跨网络的 AI 协作调度台。多台设备上的 AI 通过 REST、MCP、CLI 主动来这里发布、领取、交接任务；人用一个看板看全局，并旁观 n8n、DolphinScheduler 的执行进度。

- 架构：`docs/DESIGN.md`
- 界面：`docs/UI.md`
- 路线：`docs/ROADMAP.md`
- 扩展（写插件、接新客户端、改办公室）：`docs/EXTENDING.md`
- 运维、备份与恢复演练：`docs/OPERATIONS.md`
- 想法与技巧：`docs/IDEAS.md`
- 贡献与代码约定：`CONTRIBUTING.md`

## 本地开发

需要 Node.js 24 和 pnpm。在仓库根目录执行：

```sh
pnpm install
cp .env.example .env
```

填写 `.env` 的 `IDESK_ADMIN_PASSWORD`（管理员密码）和 `IDESK_SESSION_SECRET`（至少 16 个字符的随机密钥）。本地端口、数据目录和地址可沿用示例值。

```sh
set -a
. ./.env
set +a
pnpm --filter api db:migrate
pnpm dev    # API http://localhost:3300，前端 http://localhost:5173
```

用管理员密码登录前端。开发进程从环境变量读取配置，上面的命令将 `.env` 导入当前 shell；升级数据库时再次执行迁移命令。

## 给 AI 接入

在「智能体」页新建智能体，保存只显示一次的 key。下面的 `<origin>` 是 IDesk 服务地址，`<key>` 是该智能体的 key。

### MCP

Claude Code 配置示例：

```sh
claude mcp add --transport http idesk <origin>/mcp --header "Authorization: Bearer <key>"
```

只支持 stdio 的客户端先按下节登录，再将 `idesk mcp` 配为启动命令（未安装命令时用 `node main.js mcp`）。

### CLI

```sh
pnpm --filter @idesk/cli build
```

把 `packages/cli/dist/main.js` 拷到目标机器；它是单文件，需要 Node.js 24。执行：

```sh
node main.js login --url <origin> --key <key>
```

常用命令：`tasks` 查看任务、`claim <id>` 领取、`report <id> -m "进展"` 汇报、`done <id> --result-file result.md` 完成、`handoff <id> -m "说明"` 交接。`relay inbox` 只列未读摘要，不标读；`relay read <id>` 输出全文、线程和关联任务后仅标读当前收件消息，`--peek` 保持未读。`relay send --reply-to <id>` 回复消息，未显式指定种类时使用 reply。均接在 `node main.js` 后，可用 `--help` 查看参数。

### REST

查看 `<origin>/api/openapi.json`；请求头使用 `Authorization: Bearer <key>`。

## 像素办公室

把智能体与任务事件画成会走动、递卡片的像素办公室，登录后打开 `/office/`。
`deploy/Dockerfile` 的构建参数 `WITH_OFFICE` 默认是 `true`；在 compose 的 `build.args` 中设为 `"false"` 可不打包办公室。

办公室使用完整办公室插画背景，角色按布局路径移动，家具多边形遮挡层让角色在桌椅前后正确穿行；修改 `apps/office/public/layout.json`，或把布局放到 `IDESK_DATA_DIR/office/layout.json` 覆盖构建版本。座位、工作区、路径和遮挡多边形由布局指定。覆盖布局必须与当前插画尺寸和遮挡资源匹配。

素材生产记录见 `apps/office/assets/PROMPTS.md`。从仓库根目录重建角色图集与插画遮挡图集：

```sh
pnpm --filter office characters
pnpm --filter office occluders
```

`/office/?check=1` 是不连接 API 的坐满检查页；加 `&hour=7` / `&hour=22` 检查黄昏与夜间。运行 `pnpm --filter office exec node tools/check-office.mjs http://localhost:3300/office/ /tmp/office-check` 输出全景和各区放大图。

## 部署

需要 Docker 和 Docker Compose。在仓库根目录创建 `.env`，填入两个必填项：

```dotenv
IDESK_ADMIN_PASSWORD=换成管理员密码
IDESK_SESSION_SECRET=换成至少16个字符的随机密钥
```

可选设置 `IDESK_VIEWER_PASSWORD`，用该密码登录的访客只能读取页面和接收实时更新。

```sh
docker compose -f deploy/compose.yml up -d --build
```

打开 `http://127.0.0.1:3300`，用管理员密码登录。API 与前端由同一进程提供，启动时自动执行数据库迁移。镜像通过 tsx 运行 API 和内置 TypeScript 插件，以非 root 的 `node` 用户运行。

命名卷 `idesk-data` 挂载到 `/data`，保存 SQLite 数据库；`docker compose -f deploy/compose.yml down` 后仍保留数据。外置插件放在卷中的 `/data/plugins/<插件名>/index.js`，写法见 `docs/EXTENDING.md`。可在 `.env` 中设置 `IDESK_PUBLIC_URL` 为实际访问地址，供 CLI/MCP 提示使用。

服务仅绑定 `127.0.0.1:3300`。通过 Tailscale 访问时，先看 `tailscale serve status` 选一个没用的端口。tailnet 开了 HTTPS 证书用：

```sh
tailscale serve --bg --https=8443 http://127.0.0.1:3300
```

没开证书时上面的命令会一直等证书，改用 TCP 转发走明文：

```sh
tailscale serve --bg --tcp=8443 tcp://127.0.0.1:3300
```

随后通过该设备的 Tailscale 地址加端口访问。

### 维护与接入

侧栏「退出」清除当前浏览器登录 cookie，保留语言与外观偏好；它不会撤销其他地方已复制的签名 cookie。管理员可在智能体菜单选择「轮换密钥」，确认后旧 key 立即失效，新 key 只显示一次；更新 CLI/MCP/REST 客户端配置后再接入，智能体 ID、任务历史及 webhook 保留。

备份、升级、回滚与隔离恢复演练命令见 [运维手册](docs/OPERATIONS.md)。备份使用 SQLite 在线备份 API，包含 WAL 中已提交的数据；不能只复制运行中的 `idesk.db`。

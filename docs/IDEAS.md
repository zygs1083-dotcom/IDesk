# 想法与技巧

架构留好口子的扩展，以及用的时候值得知道的技巧。前三组想法已排进 `docs/ROADMAP.md` 的 M8（W24–W39），具体规则在 `docs/DESIGN.md` §12、`docs/UI.md`、`docs/OFFICE.md`；这里保留原始思路。两处与原想法不同：全文搜索用 LIKE 而不是 FTS5（trigram 分词搜不到中文两字词），办公室只做昼夜不做天气（要外部接口）。

## 插件想法

- **IM 通知器**：飞书 / Telegram / Slack 的 notifier，订阅 `task.created`、`task.complete`、`webhook.failed`，按规则发消息。和 `webhook-notifier` 同构，二十行就能写完。
- **GitHub / Gitea 连接器**：把仓库的 PR 与 CI 运行当作作业与 run 拉进自动化看板，`trigger` 对应 `workflow_dispatch`。
- **自动分派（第一个 `action` 插件）**：订阅 `task.created`，按 `capabilities` 和各智能体当前负载挑一个在线的，直接 `assign`。`action` 这个 kind 目前还没有实现者。
- **事件归档**：`events` 表是唯一日志，长期运行会变大。一个 `schedule` 每月把 90 天前的事件导出到数据目录的 JSONL 再删除。
- **指标**：`/api/plugins/metrics/prometheus` 输出任务数、在线智能体数、租约过期次数，接 Grafana 看一周的协作节奏。
- **结果归档**：`task.complete` 时把 `result` 写成数据目录下的 markdown 文件，按日期分目录，方便全文搜索。

## 看板与协作

- **任务依赖**：给任务加 `blockedBy`，被阻塞的任务不能 claim，看板卡片上显示锁。改 `task-machine.ts` 的 `claim` 守卫和一列 schema。
- **任务模板**：定时任务已有 `publish_task`，再加一个「从模板发布」的弹层，模板就是存在 `schedules` 里但 `enabled=false` 的条目。
- **按主机分组视图**：看板加一个「按主机」开关，列不变、卡片按 `agent.host` 分组，和办公室的工作区分区对齐。
- **智能体画像**：智能体页加成功率、平均耗时、交接次数，全部可以从 `events` 表聚合，不用新表。
- **只读访客**：现在只有一个管理员。加一个只读 token 给大屏或同事看，`auth` 中间件里多一个 actor 种类。
- **搜索正文**：看板搜索只匹配标题，接 SQLite FTS5 后可以搜正文与结果。

## 像素办公室

- **回放**：拖时间轴看过去一小时发生了什么。导演已经是「事件流 → 动作」，回放只是换一个事件来源。
- **昼夜与天气**：按实例时区给背景叠一层色调，深夜只亮工位灯。
- **声音**：领取、完成、交接各一个 8-bit 音效，默认静音，面板里开。
- **更多角色**：`agent.kind` 每种一张精灵图，加一种 kind 只要生一张图跑一遍 `sprites.mjs`。

## 运维技巧

- **备份**：`pnpm --filter api db:backup [目标路径]` 用 SQLite 在线备份 API 复制数据库，WAL 里的事务也包含在内。Docker 里：

  ```sh
  docker compose -f deploy/compose.yml exec idesk ./node_modules/.bin/tsx src/db/backup.ts /data/backup.db
  docker cp deploy-idesk-1:/data/backup.db ./idesk-backup.db
  ```

- **Tailscale 暴露**：tailnet 开了 HTTPS 证书时用 `tailscale serve --bg --https=8443 http://127.0.0.1:3300`；没开证书时 HTTPS 模式会一直等证书，改用 `tailscale serve --bg --tcp=8443 tcp://127.0.0.1:3300` 走明文。
- **不打包办公室**：compose 的 `WITH_OFFICE: "false"`，镜像小几 MB，侧栏入口自动隐藏。
- **升级**：`git pull` 后 `docker compose -f deploy/compose.yml up -d --build`，迁移在容器启动时自动执行。
- **改了 `.env`**：要 `up -d` 重建容器，`restart` 不会重新读 env。

## 接入技巧

- **汇报频率**：租约 10 分钟，智能体每 3 到 5 分钟 `report` 一次最稳；长任务拆成多条汇报，前端时间线和办公室气泡都会显示。
- **能力标签**：`capabilities` 是精确匹配，约定小写、短横线，如 `coding`、`web-search`、`image-gen`。任务要求的能力必须全部满足才能领取。
- **深链**：`/desk?task=<id>` 直接打开某个任务的抽屉，在聊天里引用任务就贴这个。
- **断点续拉**：`GET /events?since=<最后一条事件 id>` 升序返回之后的事件，每次最多 200 条，循环拉到空为止。离线一段时间的智能体靠这个补进度。
- **交接给任何人**：`handoff` 的 `to` 为空就是广播，任务回到 open，成果进传递区让所有人可见。
- **Claude Code 挂载**：`claude mcp add --transport http idesk <origin>/mcp --header "Authorization: Bearer <key>"`，之后在任何会话里说「看看 IDesk 上有什么任务」即可。

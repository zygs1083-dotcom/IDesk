# W20b 验收记录

API 使用独立 SQLite 数据目录 `/tmp/idesk-w20b-data`，端口 3328，配置 `IDESK_OFFICE_DIST` 为本 worktree 的 `apps/office/dist`。三个 agent 为 A（codex，atlas）、B（claude-code，cedar）、C（script，atlas），打开页面前均通过 agent heartbeat 上线。

`events-one-take.gif` 来自同一 Playwright 页面的连续 WebM，836×470、8 fps、约 83 秒；中途没有刷新或切镜头。用 curl 依次发布、claim、report、handoff、accept、complete，每次调用间隔约 4 秒，保留了角色按 90px/s 走路和队列完成所需的等待时间。

| 步骤 | curl 时间（相对发布） | GIF 可见动作时间（约） |
| --- | --- | --- |
| human 发布 | 0.0s | 5s：前台卡片飞到任务板并弹跳 |
| A claim | 4.1s | 9–18s：走到任务板、取卡、返回打字 |
| A report「已复现，正在修」 | 8.1s | 18–22s：报告气泡保留 4 秒 |
| A handoff 给 B | 12.2s | 18–44s：走到 B 桌旁递卡、返回；自动交接信封随后飞出 |
| B accept | 16.2s | 44–68s：交接动作完成后领取并返回打字 |
| B complete | 20.2s | 68–72s：✓、12 个像素纸屑、任务卡飞入托盘 |

截图均由真实 Chromium 截取：

- `initial-light.png` / `paused-dark.png`：浅色和深色偏好；办公室画布保持设计规定的暖色。
- `paused-coffee.png`：暂停后在咖啡机旁持杯。
- `recruit-meeting.png`：三人招募满员，团队在会议室，桌上有任务卡。
- `broadcast-envelope.png`：前台发出的广播信封正飞向白板右侧公告栏。
- `lease-zzz.png` / `lease-renewed.png`：将测试任务 lease 调到 1 分钟后，出现 zzz；heartbeat 续租后消失。
- `refresh-typing.png` / `refresh-paused.png` / `refresh-meeting.png`：中间状态刷新直接摆放，无上线或领取回放。
- `aisle-routes.png`：编辑模式显示所有区域的外侧座位接近点和过道路径。
- `completed.png`：连续主流程结束，卡片已进入托盘。
- `offline-empty-chair.png` / `event-online.png`：30 秒节拍识别离线并留下空椅；携带 agentId 的 relay 事件触发重新入座。
- `board-overflow.png`：待领取任务超过网格容量，显示 +N。

补充截图流程启用 `prefers-reduced-motion: reduce`，验证角色瞬移、卡片直接定位、会议室直接入座且不显示纸屑；广播截图恢复正常动效。主 GIF 使用正常动效。最终素材在 rebase 后的 W21 外框上重新录制和截图。主流程及补充流程浏览器 `pageerror` 均为 0；点击角色和任务卡分别收到 `{type:"agent", id}` 和 `{type:"task", id}` 的 `office:select`。

验证：`pnpm typecheck`、`pnpm test`、`pnpm --filter office build`、`pnpm lint` 全部通过；构建无警告，lint 0 warnings。纯逻辑测试覆盖 claim/accept、交接两种目标、complete、pause/resume、release/lease_expired、招募满员、relay 三种 to、角色顺序/并行、拉取合并和 200 条续拉。新增 TypeScript 文件均不超过 200 行。

当前 API 带 since 仍返回最新 200 条（倒序），W22 改为升序最早 200 条后，积压超过 200 条也能补齐；在此之前，积压超过 200 条时较早的事件会被跳过（只影响动画）。

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

## M8 扩展（已完成；规则见 `docs/DESIGN.md` §12、`docs/UI.md`、`docs/OFFICE.md`）

派发约束：改 schema 的工作项串行（W24 → W31），各自合并后下一个再开；办公室的三个串行（W39 → W38 → W37）；依赖 W24 的插件（W25、W27、W28、W29、W30）在 W24 合并后再派。同时在跑的不超过 3 个。

- **W24 插件级配置与宿主扩展**：`plugin_state.config`（迁移 0002）、`enabledByDefault`、`ctx.config / dataDir / publicUrl / tasks.act`、`PATCH /plugins/:id`、分发器鉴权、状态机 assign 允许 system、插件页配置表单（含 enum → select）。验证：host.test 覆盖默认关闭与配置热生效；浏览器里给一个插件改配置后 `GET /plugins` 返回掩码值；截图浅色深色。
- **W25 chat-notifier**：DESIGN §12.2。验证：本地起接收端，四种 format 的请求体各一条；失败写 `chat.failed`。
- **W26 github-actions 连接器**：DESIGN §12.3。验证：`fetch` 打桩的单元测试覆盖状态映射、since 过滤、trigger 204。
- **W27 auto-assign**：DESIGN §12.4。验证：两个在线智能体负载不同，新任务指给负载低的；无候选不动；被阻塞不动。
- **W28 event-archive**：DESIGN §12.5。验证：造 2500 条旧事件，跑一次后文件行数 2500、表里只剩新的、有 `archive.events`。
- **W29 metrics**：DESIGN §12.6。验证：用 agent key 抓 `/api/plugins/metrics/prometheus`，文本能被 `promtool check metrics` 接受（没有 promtool 就逐行对格式）。
- **W30 result-archive**：DESIGN §12.7。验证：完成一个任务后文件存在、frontmatter 正确。
- **W31 任务依赖**：DESIGN §12.8、UI.md 协作台。验证：被阻塞任务 claim 返回 409 和原因；阻塞任务完成后可领取；抽屉里加减依赖；截图。
- **W32 任务模板**：DESIGN §12.9、UI.md 协作台与定时页。验证：建一个关着的 publish_task 定时任务，发布弹层选模板后表单填好；截图。
- **W33 按主机分组**：UI.md 协作台。验证：两台主机的智能体各领一个任务，切「按主机」后分组正确、刷新后记住；截图。
- **W34 智能体画像**：DESIGN §12.11、UI.md 智能体页。验证：集成测试造 claim→complete 两轮，stats 数字与平均耗时正确；截图。
- **W35 只读访客**：DESIGN §12.12、UI.md 布局。验证：viewer 登录后 GET 200、POST 403、WS 能连；侧栏有「只读」；截图。
- **W36 搜索正文**：DESIGN §12.13。验证：`?q=` 命中正文与结果；看板输入后列表变化；MCP 带 q。
- **W37 办公室回放**：OFFICE.md §4、§5。验证：录一段 GIF，先 curl 走一遍领取→完成，再回放 60× 能看到同样的动作。
- **W38 办公室昼夜**：OFFICE.md §6。验证：把系统时间（或临时参数）设到夜间截图、黄昏截图。
- **W39 办公室声音**：OFFICE.md §5、§6。验证：开关持久化；点喇叭后领取有声（录屏或 console 里打印 AudioContext 状态）。
- **W40 智能体编辑与删除**：DESIGN §12.15、UI.md 智能体页。验证：PATCH 改名后列表更新；DELETE 后 key 返回 401、任务仍在且显示「已删除的智能体」；三个插件对查不到的智能体不崩；截图。

## M9 零散改进

- **W41 DolphinScheduler 多项目**：DESIGN §12.16、§7 宿主删除消失的作业。验证：`fetch` 打桩的单元测试覆盖项目分页、作业名前缀、每个项目各自的 since、留空与填写两种 testConnection；宿主测试覆盖「listJobs 不再返回的作业连同 run 被删并计入 changed」；n8n、github-actions 的测试不变仍通过。
- **W42 活动页文案**：DESIGN §12.17。验证：`eventText` 测试覆盖表中每行；浏览器里造 connector.polled、schedule.fired、webhook.failed 各一条，活动页没有原始类型名；截图。
- **W43a 主前端双语**：DESIGN §12.18 的前端部分（字典、t、切换按钮、时间与标签本地化、shared 的 `labels(lang)`）。验证：切到 en 后八个页面无中文（截图协作台、设置、活动的英文版）；切回 zh 一致；刷新保持。
- **W43b 办公室双语**：DESIGN §12.18，复制 W43a 的机制到 office。验证：英文截图。
- **W43c API 错误双语**：DESIGN §12.18 的 API 部分。验证：同一个 409，`Accept-Language: en` 返回英文，默认中文；MCP 工具报错仍是中文；shared 的 messages 表两种语言键一致（测试）。
- **W44 自动化搜索**：UI.md 自动化页。验证：输入项目名、工作流名、触发方式各能筛出；截图。
- **W45 作业的项目名**：DESIGN §12.19、UI.md 自动化页。验证：迁移 0004；DS 单项目与全部项目模式 group 都是项目名、name 只有工作流名；GitHub 为 owner/repo；卡片第二行显示项目名；截图。

- **W46 办公室事件文案**：DESIGN §12.20。验证：`eventText` 测试覆盖 §12.17 表中每行的中英文；面板截图无原始类型名。

- **W47 自动化卡片时间与失败列**：UI.md 自动化页。验证：卡片第三行显示开始 → 结束，跨天带日期，执行中显示 → …；失败 run 进「失败」列，已完成列只剩成功与已取消；截图浅色深色。

- **W48 待执行列显示下一次计划执行**：DESIGN §12.21、UI.md 自动化页。验证：迁移 0005；DS 插件测试覆盖 Quartz 转换（七段、`?`、含 L 的置 null）、在线/离线筛选、按项目分页；前端用 croner 算下一次并排序，30 秒重算；截图浅色深色。改自动化页，等 W47 合并后派。

- **W49 Webhook 接收端要求**：DESIGN §12.22、UI.md 接入信息页、`docs/EXTENDING.md` 同步。验证：webhook 测试覆盖超时进入重试；接入信息页截图浅色深色中英文。
- **W50 发布时直接指定或招募**：DESIGN §12.23、UI.md 协作台。验证：API 测试 dispatch assign/recruit 成功与 409；MCP 带 dispatch；发布弹层三种分派各发一次，截图。

- **W51 办公室坐姿与名牌**：OFFICE.md §2、§3。工位座位挪到椅子上，后排 facing down、前排 facing up（编辑模式导出新 scene.json）；精灵图扩成 4×7（Codex 图片编辑追加第六、七行，保持原角色），`sprites.mjs` 切 7 行，坐下/打字按 facing 取正面/背面/侧面帧；工作区名牌改成可读的像素面板。验证：五种角色在前后排都对着桌子、脚底落在椅面的截图；名牌在 1440 和 1000 宽都可读。
- **W52 空闲行为与气泡**：OFFICE.md §3。验证：录一段 60 秒 GIF，至少出现伸懒腰、张望、喝咖啡、聊天中的三种；reduced-motion 下只有气泡；有进行中任务的角色不触发；字典 `idle.*` 中英各一份。
- **W53 同事档案弹窗**：OFFICE.md §4、§5。验证：点小人弹出居中弹窗，画像数字来自 stats 接口；指派已有任务、发布并指派、发消息三个动作各走一遍并在看板/传递区看到结果；只读访客无动作区；Esc 关闭；截图中英文。
- 派发：W51 和 W53 并行（W51 改 stage/tools/assets，W53 改 ui），W52 等 W51 合并后派（都碰 character.ts / director）。
- **W54 坐姿返工、座位遮挡、名牌配色**：OFFICE.md §2、§3、§5。重新生成五张 4×2 坐姿补充图（高度 0.70–0.80 倍、头宽 ±10%，量比例写进 PR）；scene.json 座位加 `cover`，舞台把背景切片画在角色之上，编辑模式可拖；名牌改成背景木框牌的配色与样式。验证：五种角色在前后排都明显是坐着、下半身被桌子/椅背遮住的放大截图；名牌和背景家具一个色系的 1440 截图。和 W52 并行（W52 不碰 scene.json、stage/zone-sign、tools）。

- **W55 坐姿第三版（四分之三视角）与薄遮挡**：OFFICE.md §3。补充图改成 front/back 四分之三视角，高度 0.85–0.90；cover 只盖桌沿/椅背；前台朝下坐柜台后。验证：站坐同框、两个工位组、前台的放大截图，人能看到整个上半身和头、腿收在桌下；比例表。
- **W56 名牌写在木牌上**：OFFICE.md §5。删掉自绘牌面，文字自适应写在背景木牌上。验证：1440/1000 宽截图，长名字截断且悬停有全名。
- **W57 空闲行为第二版**：OFFICE.md §3。spots、概率、变速、到站回弹、打瞌睡、「!」小跑、面对面聊天、同时最多两人走动。验证：60 秒 GIF 里至少出现一次去 spot、一次聊天、一次小动作；reduced-motion 只气泡。
- 派发：W55 与 W56 并行（W56 只改 zone-sign.ts），W57 等 W55 合并后派（两者都改 scene.json、director）。

- **W63 前台礼仪专属角色图**：OFFICE.md §3「前台礼仪」。生成 `receptionist` 的 4×5 走路图 + 正面坐姿三帧（sit/upright、typing/upright/0、typing/upright/1），重建图集；Cast 里礼仪用 receptionist、档案头像也用它；pose 在 upright 座位用 upright 帧（只有礼仪有，智能体不受影响）。验收：前台放大图里礼仪正对观众坐在柜台后、双手在台面上、没有侧身；走路四方向截图；比例表；档案头像截图。

派发约束：W45 改 schema，先派；W43a 改 shared 标签，和 W42 不同时改 `event-text.ts`（W42 先），W43a 在 W42、W44、W45 合并后派；W43b 在 W43a 之后；W43c 可与 W43a 并行。

## M10 像素办公室第二版（设计见 `docs/OFFICE.md`，允许破坏性重构）

第一版的背景大图、手调遮挡、路点图、四分之三坐姿全部作废。顺序：W64 ‖ W65 → 用户确认探针风格 → W66 ‖ W67 → W68 → W69。

- **W64 美术探针**：OFFICE.md §9。定 32 色调色板 `assets/palette.png`；`tools/tiles.mjs` 程序化画木地板、地毯、北墙（含墙裙、窗）格子，无缝平铺；`tools/furniture.mjs` 抠色、按清单切帧、量化到调色板、打包 `furniture.png/json`；生成探针家具：显示器桌（人朝上）、笔记本桌（人朝下）、办公椅四个朝向（拆好椅背件和扶手件）、前台柜台、绿植、书架、名牌；codex 一种角色的正面坐姿 `sit/{down,up}`、`typing/{down,up}/{0,1}`。在 `catalog.json` 写好这些条目（占地、部件、sortY 偏移、seat、workSpot、textArea）。交付：一张用脚本合成的探针图（一个 2×2 工作区坐满 4 人、前台坐 1 人、绿植书架，地板和北墙），以及比例数据（人站高、桌面高、椅背高、坐姿高与头宽）。验收看：脚和手落在哪、有没有渐变噪点、调色板之外的颜色数为 0。
- **W65 场景引擎**：OFFICE.md §2–§4。新代码放 `apps/office/src/world/`：`layout.json` / `catalog.json` 的 zod schema 与加载、地面纹理、北墙层、物体层按 `sortY` 排序（多部件家具）、座位从椅子取、格子 A*（含拐角平滑）、舞台整数倍缩放。API 增加 `/office/layout.json`（数据目录覆盖优先，不缓存），保留旧的 `/office/scene.json` 直到 W68。素材未到时用占位：按占地画的纯色描边方块（颜色来自调色板）。临时入口 `/office/?world=1` 只渲染新场景加几个按座位摆好的小人；第一版页面不动。单元测试：每个座位的排序断言（§3「检查」）、A* 绕开家具、布局 schema。交付截图：占位全景、2×2 工作区坐满放大图。
- **用户确认**：负责人把 W64 探针图（W65 合并后也在 `?world=1` 里摆一次）发给用户，用户确认风格后才派 W66、W67。
- **W66 全套家具与默认布局**：按探针定下的风格出齐目录（会议桌 6 座、玻璃隔断、沙发、咖啡机、打印机、白板任务板、挂钟、窗、文件筐、公告栏、门、地毯、过道站位用的盆栽等），写默认 `layout.json`（§4 默认布局），4 个工作区各 2×2。验收：全景白天/夜间、每个工作区和前台的放大图，`tools/check-office.mjs` 坐满截图。
- **W67 角色正面坐姿**：五种智能体加礼仪，按探针里 codex 的规格补 `sit/{down,up}`、`typing/{down,up}/{0,1}`；整套角色图集（走路、侧坐、新坐姿）量化到 34 色调色板；四分之三坐姿帧和礼仪 `upright` 帧先保留（第一版页面在 W68 之前仍要用），删除放到 W68。验收：比例表、量化前后对比图、调色板外颜色为 0。
- **W68 切换到新引擎并删除第一版**：Cast、动作、空闲行为、卡片、名牌、昼夜、气泡、礼仪接到 `world/`；去处和座位全部来自布局命名点与椅子。删除四分之三坐姿帧、礼仪 `upright` 帧和 `PROMPTS-seated.md` 对应部分、`background.webp`、`raw/background.png`、`scene.json`、`seat-covers.ts`、`zone-sign.ts`（重写为 plaque 文字）、`desk-point.ts`、`scene/path.ts`、第一版 `editor.ts`、`?world=1` 临时入口、API 的 `/office/scene.json`。验收：§6 每个事件的动作截图或 GIF、空闲行为 60 秒 GIF、坐满截图逐个看脚和手。
- **W69 编辑器第二版**：OFFICE.md §10。家具目录面板、放置/拖动/旋转/删除、刷地面、框选生成工作区、导出 JSON、`PUT /api/v1/office/layout`（管理员，schema 校验，写数据目录）。API 测试：非管理员 403、非法布局 400、保存后 `/office/layout.json` 返回新内容。

- **W70 首屏体积**：tiles、furniture、sprites 三张图改写为 8 位索引色 PNG（调色板 + 透明索引），三个出图脚本共用一个写 PNG 的函数；解码后 RGBA 与旧图逐像素相同；PR 列出前后字节数和首屏总传输量（gzip 后）。不动运行时代码。
- 并行：W68 合并后，W69a（layout/catalog schema 搬到 packages/shared）先合；W69b（PUT 接口）、W69c（编辑器 UI）、W70 同时跑。全量测试一律 `flock /tmp/idesk-test.lock pnpm test`，独立 Chromium 一律 `flock /tmp/idesk-browser.lock`。

派发约束：W64 与 W65 并行（W64 只动 `assets/`、`tools/`、`public/` 的新文件，W65 只动 `src/world/`、API 路由）；W66、W67 都改图集，各自用独立图集文件（`furniture.*` 与 `sprites.*`），可以并行；W68 等 W66、W67 都合并；W69 最后。每个 PR 都附 `check-office` 截图。

## M11 像素办公室第三版：第一版的画 + 正规遮挡（设计见 `docs/OFFICE.md`）

用户看了第二版后选择回到第一版插画的质感，只换遮挡技术。M10 剩余的 W69b/W69c（家具编辑器）、W70（家具与瓦片索引色）取消；W71（字体分片）照常。顺序：W72 ‖ W73 → W73b ‖ W73c → W74。

- **W72 素材取回**：从提交 5a08051 取回 `assets/raw/background.png`、六种角色原图与坐姿原图、`PROMPTS*.md`、第一版的 `tools/sprites.mjs` / `sprite-cells.mjs` 切帧逻辑（不量化颜色），生成 `public/background.webp` 与角色图集：走路、四分之三坐姿 front/back、侧坐、礼仪正面坐姿（upright 改名 down）。第二版素材暂不删（W74 删）。验收：图集帧表、与 5a08051 图集逐帧比对（除改名外像素相同）。
- **W73 遮挡件工具与布局 schema**：`@idesk/shared/office-schemas` 改为第三版 layout（occluders、16px 可走栅格、座位 facing front/back/down/left/right + mirror、工作区名牌文字区、命名点、standing/meeting/lounge、hostZones、title）；`tools/occluders.mjs` 按多边形抠图打包 `occluders.png/json`；`tools/occluder-overlay.mjs` 出轮廓叠加图；按工作区 1 描完它的桌子（连显示器）和前排椅背、量好 4 个座位脚底和 workSpot、名牌文字区，作为后两项的样板。验收：叠加图 3 倍、座位排序单元测试、工具可复现。
- **W73b 工作区 2–4**：照 W73 样板描 12 张桌子和前排椅背、量 12 个座位与名牌文字区。只写布局里这三个区的条目。
- **W73c 前台、会议室、休息区与杂项**：柜台、礼仪座位；会议桌与 6 把会议椅（两端侧坐）；沙发与座位、茶几；绿植、书架、打印机、隔断等会挡住行走的人的物体；命名点（门、白板文字区、文件筐、公告栏、8 个空闲去处）、站位；可走栅格（工具出初稿后手修）。
- **W74 切换并删除第二版**：渲染背景 + 遮挡件 + 人（zIndexOf 唯一），座位与命名点来自第三版布局，四分之三坐姿 + mirror、礼仪正面坐姿、侧坐；名牌、白板卡片、昼夜暖光、检查页、demo-events 接到新布局；`e` 调试模式（轮廓、脚底点、栅格、拖座位导出 JSON）。删除第二版的瓦片、家具图集、目录、调色板、探针、正面工位坐姿和对应工具。验收：坐满全景（白天/黄昏/夜间）、每区放大图逐个看脚手臀肩头、轮廓叠加图、§6 事件 GIF、空闲 60 秒 GIF、「用户第一眼」全景结论。

派发约束：W72 与 W73 并行（W72 只动 assets/raw、tools/sprites*、public/sprites.*、public/background.webp；W73 动 shared schema、tools/occluders*、public/layout.json、public/occluders.*）。W73b、W73c 在 W73 合并后并行，各自只写布局里自己区域的条目（放在 layout.json 的不同数组位置，合并时按 id 排序避免冲突）。全量测试一律 `flock /tmp/idesk-test.lock pnpm test`，独立 Chromium 一律 `flock /tmp/idesk-browser.lock`。

# 协作流程

IDesk 由三种角色推进。这份文件给「推进会话」读，也给以后接手的任何 agent 读。

## 角色

| 角色 | 是谁 | 负责 |
| --- | --- | --- |
| 负责人 | Claude Code 会话 `idesk-fb`（Fable 5.1） | 架构与设计决策、最终审核、合并、改 `docs/DESIGN.md` 与 `docs/UI.md` |
| 推进 | Claude Code 会话（Opus 5.5），运行在 IDesk 主工作区的 Orca 终端里 | 按 `docs/ROADMAP.md` 拆任务、派发给开发、第一轮审核、盯进度、向负责人汇报 |
| 开发 | Orca 里的 Codex（`gpt-6.1-sol`，Orca 默认配置） | 在独立 worktree 里实现单个工作项，开 PR |

## 推进会话怎么做

1. 先读 `AGENTS.md`、`docs/DESIGN.md`、`docs/UI.md`、`docs/ROADMAP.md`，再读 `~/.claude/CLAUDE.md` 里的本机禁令（不要动用户的 Chrome、不要重启桌面服务）。
2. 加载 Orca 编排指南：`orca-ide skills get orchestration`，并按它的 supervised loop 工作。Orca CLI 在本机用 `orca-ide`。
3. 一个工作项一个 worker：`orca-ide orchestration worker-start --spec "<任务说明>" --agent codex --json`，放在新 worktree（见 `references/placement-and-remote.md`）。分支名 `wi/<编号>-<slug>`。
4. 任务说明必须自包含：目标文件、要做的改动、约束（引用 AGENTS.md 的「不要写」清单，逐条列出与本工作项相关的）、所有权边界、可观察的验收标准（命令 + 期望输出；前端要浅色深色截图）。把 `docs/DESIGN.md` 里相关章节的原文贴进说明，不要让开发自己去猜。
5. 并行波次：没有依赖的工作项一起派。依赖关系见 ROADMAP；通常 W1+W2 一波，W3 之后 W4+W5 一波，以此类推。同时在跑的 worker 不超过 3 个。
6. 第一轮审核由推进会话做，重点查两件事：
   - **冗余**：多余的 try/catch、兜底分支、重复校验、一行包装、日志、注释、配置项。发现就打回，让开发删，不要自己顺手改。
   - **设计感**：前端是否严格按 `docs/UI.md`，有没有碰禁止项。截图不像 Apple 内部工具就打回。
   审核通过后，用 `SendMessage` 发给会话 `idesk-fb`：PR 号、改了什么、验证结果、你已检查的点、你拿不准的点。负责人做最终审核与合并。
7. 推进会话不合并、不改设计文档。发现设计缺陷或冲突，整理成具体问题发给负责人，不要自行决定。
8. 每个工作项开始与结束时更新 Orca 卡片：`orca-ide worktree set --worktree <id> --comment "..." --workspace-status in-progress|in-review`。
9. 每完成一个里程碑，发一条简短总结给 `idesk-fb`。

## 参考分支

`draft/idesk-3f` 是另一个会话早期的并行探索，不是设计依据。可以参考的部分：`plugins/n8n`、`plugins/dolphinscheduler`（外部 API 用法与状态映射）、`packages/plugin-sdk`（接口形状）、`apps/web/src/lib/format.ts`（相对时间）。借用时按本仓库的设计与 AGENTS.md 改写，不要整文件搬。

## 开发怎么做

读 `AGENTS.md`。只做任务说明里的工作项，验证命令跑过贴到 PR 描述，前端附截图。遇到设计不清楚的地方，用 Orca 的 `ask` 问推进会话，不要自己猜一个更"健壮"的做法。

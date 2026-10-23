# IDesk 运维

所有 `<...>` 都是需要替换的占位符，不能原样执行。先确认 Docker context 和目标容器；本文不要求修改网络或云账号。正式实例只按维护窗口操作，恢复演练只用新隔离卷，通过容器内 loopback 验证服务。API 及维护容器沿用镜像的非 root `node` 用户，不用 `--user root` 修复权限。

## 保存什么

- SQLite：`/data/idesk.db`，在线时伴随 `idesk.db-wal` / `idesk.db-shm`。不要直接复制单个主库；SQLite 在线备份 API 会把 WAL 中已提交事务纳入一致的目标库，不必再拼接原 WAL。
- 文件：整个 `/data/plugins`（外置插件代码）、`/data/plugin-data`（插件归档及数据）、`/data/office`（办公室覆盖布局），以及配置到卷外的插件目录或自定义持久路径。
- 配置：部署 `.env`、compose/覆盖文件、当前镜像 tag 与 image ID、插件版本。`.env` 不在数据卷中，需要单独备份。

备份含任务正文、webhook、插件凭据和登录签名密钥；即使 agent key 只存 SHA256，也应按敏感数据保管。备份目录权限用 700，`.env`、数据库和归档文件用 600；不要提交 Git、放公开对象存储或粘贴到日志。目录需要执行权限，不能对整个插件目录递归 chmod 600。

## 在线备份

在仓库根目录，填写现有容器名和一个尚不存在的本地备份目录。不要依赖 compose 自动生成的容器名：

```sh
set -eu
umask 077
backup_dir='<absolute-new-backup-directory>'
container='<existing-container-name>'
mkdir -m 700 "$backup_dir"
docker inspect --format '{{.Config.Image}} {{.Image}}' "$container" > "$backup_dir/image.txt"
docker exec "$container" sh -c 'umask 077; ./node_modules/.bin/tsx src/db/backup.ts /data/maintenance-backup.db'
docker cp "$container:/data/maintenance-backup.db" "$backup_dir/idesk.db"
docker exec "$container" sh -c 'cd /data; for d in plugins plugin-data office; do if [ -d "$d" ]; then printf "%s\n" "$d"; fi; done | tar -czf - -T -' > "$backup_dir/files.tar.gz"
cp .env "$backup_dir/env"
cp deploy/compose.yml "$backup_dir/compose.yml"
chmod 600 "$backup_dir"/*
docker exec "$container" rm /data/maintenance-backup.db
```

固定临时文件 `maintenance-backup.db` 专用于这条维护命令；先确认它不是业务文件，且没有其他备份任务同时使用。若中途失败，保留源数据，检查退出码并重新备份，不能把不完整目录当成功备份。

SQLite 快照是一致的，但它和文件归档不是跨文件事务。归档期间应避免修改插件、办公室覆盖及插件文件数据；需要数据库与插件文件严格对应时，安排无写入窗口后再备份。额外的插件路径、compose 覆盖文件需要按实际路径一并保存。开发环境可用 `pnpm --filter api db:backup <snapshot-path>`，同样需保留文件及环境配置。

## 升级与回滚

1. 记录旧镜像 tag/image ID，确认旧镜像仍可用；新镜像使用不可变版本 tag 或 digest，避免只留 `latest`。升级前完成上面的备份并在隔离环境验证。
2. 在部署配置中指定已验证的新镜像，核对它沿用同一数据卷和非 root 用户，再在批准的维护窗口替换服务。镜像默认启动命令先执行迁移，成功后启动 API；不要覆盖 CMD 跳过迁移。
3. 查看启动日志及退出状态，再执行 `curl --fail --show-error '<origin>/api/health'`，应返回 `{"ok":true}`。健康检查只说明进程响应，还需验证登录、任务读取、插件加载和前端资源。虚构智能体接入及写操作验证放在隔离演练实例，不向正式实例注入样例。

镜像回滚和数据库结构回退是两件事。只有确认旧代码兼容当前数据库结构时，才能仅换回旧镜像；自动迁移不等于支持向下迁移。如果不兼容，应停止继续写入、保留升级后完整数据，再选修复前进或经过验证的数据迁移方案。不得直接用升级前旧库覆盖新库，否则会丢失升级后写入；必须回到备份时，需要明确数据损失范围并获批准。

## 隔离恢复演练

以下命令只用于演练。新卷名强制带 `idesk-restore-drill-` 前缀，且拒绝已有卷；示例卷绝不能替换为生产卷。不发布宿主端口、不挂载生产卷、不连接生产网络、不复用生产容器。准备不含真实凭据的 `<drill-env-file>`（权限 600），至少包含虚构 `IDESK_ADMIN_PASSWORD` 和长度不少于 16 的 `IDESK_SESSION_SECRET`，可另设虚构 viewer 密码。

```sh
set -eu
umask 077
backup_dir='<absolute-backup-directory>'
image='<verified-image:tag>'
drill_volume='idesk-restore-drill-<unique-suffix>'
drill_container='idesk-restore-drill-<unique-suffix>'
drill_env='<absolute-drill-env-file>'
case "$drill_volume" in idesk-restore-drill-*) ;; *) exit 1 ;; esac
if docker volume inspect "$drill_volume" >/dev/null 2>&1; then
  echo 'Refusing an existing volume' >&2
  exit 1
fi
docker volume create "$drill_volume"
# 首次挂载沿用镜像 /data 的 node 所有权；不以 root 启动应用。
docker run --rm --network none --env-file "$drill_env" \
  -v "$drill_volume:/data" -v "$backup_dir:/restore:ro" \
  --entrypoint sh "$image" -ec 'cp /restore/idesk.db /data/idesk.db; chmod 600 /data/idesk.db; tar -xzf /restore/files.tar.gz -C /data'
# 校验快照；校验容器不执行迁移。
docker run --rm --network none --env-file "$drill_env" -v "$drill_volume:/data" \
  --entrypoint node "$image" --input-type=module -e \
  'import Database from "better-sqlite3"; const db = new Database("/data/idesk.db", {readonly:true}); const rows = db.pragma("integrity_check"); if (rows.some(r => r.integrity_check !== "ok")) process.exit(1); console.log("integrity_check: ok");'
```

Linux bind mount 保留宿主所有权：备份文件应由运行镜像的 UID/GID 可读，卷对它可写。若不匹配，先在**演练备份副本**上安排合适所有权/ACL，仍保留严格权限，不通过 root 运行 API 绕过。

启动前，必须在这个隔离副本中停用内置插件、调度和连接器并清空智能体 webhook，避免恢复出的调度器、通知、连接器访问真实外部系统；外置插件演练启动时不加载，原备份不变：

```sh
docker run --rm --network none --env-file "$drill_env" -v "$drill_volume:/data" \
  --entrypoint node "$image" --input-type=module -e \
  'import Database from "better-sqlite3"; const db = new Database("/data/idesk.db"); db.exec("UPDATE plugin_state SET enabled = 0; UPDATE schedules SET enabled = 0; UPDATE connectors SET enabled = 0; UPDATE agents SET webhook_url = NULL;"); const off = db.prepare("INSERT INTO plugin_state (plugin_id, enabled) VALUES (?, 0) ON CONFLICT(plugin_id) DO UPDATE SET enabled = 0"); for (const id of ["auto-assign", "chat-notifier", "event-archive", "result-archive", "metrics", "n8n", "dolphinscheduler", "github-actions", "webhook-notifier"]) off.run(id);'
```

上面的内置插件 ID 对应当前版本；演练其他版本前核对其插件清单，新增插件也必须停用。

隔离网络用 Docker `--internal` 禁止外网出口。部分 Docker 版本不会为内部网络建立宿主端口映射，因此不依赖 `-p`，通过 `docker exec` 在容器内访问 loopback。镜像启动迁移作用于演练卷：

```sh
drill_network='idesk-restore-drill-<unique-suffix>'
docker network create --internal "$drill_network"
docker run -d --name "$drill_container" --network "$drill_network" \
  --env-file "$drill_env" -e IDESK_PORT=3300 -e IDESK_DATA_DIR=/data -e IDESK_PLUGIN_DIR=/data/drill-no-plugins \
  -v "$drill_volume:/data" "$image"
docker logs "$drill_container"
# 等日志确认 API 已启动，再执行；连接或响应失败会返回非零退出码。
docker exec "$drill_container" node --input-type=module -e \
  'const r = await fetch("http://127.0.0.1:3300/api/health"); if (!r.ok || !(await r.json()).ok) process.exit(1); console.log("health: ok");'
```

其余 API 检查同样通过容器内 `fetch` 访问 `http://127.0.0.1:3300/api/v1`，脚本从容器环境读取虚构密码；不要输出密码、cookie 或 key。确认迁移成功、数据与事件数量符合快照，测试登录/退出及虚构智能体轮换（旧 key 401，新 key 可用），检查办公室覆盖与归档文件。需验证插件时仅替换为隔离虚构配置后启用。记录镜像、备份时间、检查结果及耗时；不要把真实敏感内容写入报告。完成后精确清理本次演练容器、新卷和网络：

```sh
docker rm -f "$drill_container"
docker volume rm "$drill_volume"
docker network rm "$drill_network"
```

## 退出与密钥轮换

侧栏退出只清除当前浏览器 `idesk_session` cookie，断开当前页面实时订阅、清空查询缓存并跳转登录页；语言与外观偏好保留。admin 和 viewer 都可退出；agent bearer 不能调用人类注销。签名 cookie 没有数据库会话撤销表，退出不撤销已经复制到别处的 cookie。

管理员在智能体菜单确认「轮换密钥」后，新 key 仅在当前弹层显示并可复制；关闭后无法再查询，遗失时再次轮换。旧 key 立即不能进行 REST/MCP 认证，现有客户端需要更新接入配置。身份、历史、webhook 不变，`lastSeenAt` 清空使状态离线，新 key 认证后恢复在线。事件 `agent.key_rotated` 只记身份信息，不记 key/hash；这不是远程终止智能体进程或取消进行中的任务。

## 一键发布

1. 复制 `deploy/release/targets/example.env` 为 `targets/<名字>.env`，填写目标、compose、发布目录及 marker 的绝对路径；目标配置已被 Git 忽略，权限设为 600。
2. 将管理员密码单独写入本机权限为 600 的文件，在 `ADMIN_PASSWORD_FILE` 引用；配置中只存文件路径，不存密码。
3. 本机执行时留空 `TARGET_SSH`，不经中转时留空 `RELAY_SSH`；远程执行使用 SSH 密钥与已验证的目标主机记录，中转机还需能以密钥连接目标。
4. 填写 `DOCKER`、本机构建前缀 `BUILD_WRAPPER`、仅包住浏览器冒烟的 `BROWSER_WRAPPER`，以及本机 Playwright 模块和浏览器目录；空前缀表示直接执行。
5. 先手工处理目标 `compose.yml` / `.env` 的改动，脚本不会同步这两个文件；目标需已有运行中的 `idesk` 服务，compose 默认镜像名为 `<COMPOSE_PROJECT>-idesk:latest`。
6. 在仓库中执行 `TARGET=<名字> deploy/release/release.sh <git-rev>`，发布输入来自该提交的 `git archive` 快照。
7. 流程依次为构建带 revision 标签的镜像、打包、传输并校验 SHA256、载入、在线备份并记录任务数、激活并等待 health、检查登录/任务数/办公室首帧；每步记录开始时间与耗时。
8. health 最多等 60 秒，办公室首帧最多等 120 秒，仅超时重测一次；全部通过后才写目标 `MARKER_FILE`。

退出码：`0` 为成功，`1` 为激活前失败（运行服务未切换），`2` 为激活或冒烟失败后已回滚且 `/login` 正常，`3` 为回滚后仍不正常、需要人工处理。失败不写 marker。

完整日志保存在本机仓库 `local/releases/release-<rev12>.log`（600，目录 700），末行包含结果、退出码和总耗时。目标备份保存在 `RELEASE_DIR/<时间戳>-<rev12>/backup/`（700），含 `image.txt`、`idesk.db`、`files.tar.gz`、`env`、`compose.yml`（全部 600），不拉回本机。传输包在成功载入后删除，本机临时构建目录在结束时删除。

自动回滚只把 `idesk:before-<rev12>` 换回 compose 镜像并重新启动，不恢复数据库或配置。参见「升级与回滚」：“镜像回滚和数据库结构回退是两件事。” 有不兼容迁移的版本不能依赖这个镜像回滚流程，需另行安排迁移与恢复方案。

旧镜像与旧备份由运维核对后手工清理，脚本不自动删除。

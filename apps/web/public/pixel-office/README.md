# Pixel office artwork

W89 主前端独立素材，运行时仅依赖本目录，不依赖 office 应用部署。图像不承载业务文字、状态或可点击区域。

## 素材合同

URL 前缀为 `/pixel-office/`。

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `workbench-banner.webp` | 1280 × 300 | W100 起仅用于旧版外观预览，不再用于页头 |
| `paper-card.webp` | 656 × 494，RGBA | 透明奶油文件卡，顶部金属夹，适合卡片或顶部装饰 |
| `softer-wood.webp` | 768 × 512 | 低对比浅蜂蜜柜体木材，优先用于大面积柜体；不铺正文 |
| `office-vignette.webp` | 524 × 295 | 侧栏窗景，推荐约 220 × 124，保持比例 |
| `wood.webp` | 768 × 512 | 旧深木纹可选；纹理较强，宜小面积或低透明度 |
| `paper.webp` | 768 × 512 | 安静暖纸正文底 |
| `desk-props.webp` | 1000 × 336，RGBA | 植物、书、笔筒和灯的装饰组 |
| `header-frame.webp` | 986 × 263，RGBA | 旧版空白招牌，W100 起不再用于品牌区 |
| `agent-photo-room.webp` | 400 × 260，12,398 B | 侧栏小合影室内背景，按约 200 × 130 显示 |
| `agent-walk.webp` | 192 × 648，55,400 B | 三名角色走路图集；每帧 48 × 72，四列九行 |
| `reception.webp` | 1440 × 600，WebP ≤120 KB | 登录页前台横景，按约 720 × 300 显示；深色叠层压暗 |
| `avatars/<kind>-<外观>.webp` | 每张 32 × 32，透明 WebP | 智能体列表头像；由办公室图集正面首帧裁切并最近邻缩放 |

W100 起页头与品牌区都不再使用横景和旧招牌；页头直接排在纸面上，侧栏品牌由 CSS 铜牌承载。横景仅供旧版外观预览，以下构图说明保留作历史素材记录：横景中央约 x=34%–64%、y=28%–53% 为安静墙面；窄条展示应将真实标题放在中央留白，而不是左侧植物上。手机窄容器中心裁切会损失两侧道具，建议保留中央标题空间，勿强行将整幅图压成手机宽。桌面横景已压缩纵向构图以保护窄条里的台面，避免再拉伸。1100 × 120 中心裁切保留植物、书、灯的下部与连续台面，灯罩上端会轻裁；若需完整灯罩，可略增加显示高度。

纸卡为正面空白奶油纸、细边缘和轻微纸层，非卷轴。文字应留足顶部夹子空间；若使用九宫格，顶部中心夹子随横边拉伸可能变形，优先独立使用顶部装饰或按比例缩放整卡。边角可保护，中心继续用真实 HTML 正文与平静奶油底填充。

纹理未声明严格无缝，优先 `cover` 或自然尺寸；不做全屏强木纹、不放大为粗块像素。夜间维持正文对比，不对整页套滤镜。装饰使用空 `alt` / `aria-hidden` 和 `pointer-events: none`。

## 来源与制作

W103 前台横景由内置 `image_gen.imagegen` 生成，输出缩到 1440 × 600 后以 WebP quality 76 编码。提示包含木柜台、绿罩台灯、绿植、挂钟和空门牌，禁止人物与文字。头像运行 `python3 apps/web/tools/make-agent-avatars.py` 重新生成：以 `apps/office/public/characters/index.json` 为清单，取每套 `walk/down/0` 的头部 48 × 48，最近邻缩为 32 × 32，同时更新主网页的外观清单副本。名单外观按 kind 分组、id 排序轮换，与办公室规则一致。

W97 小合影背景用内置 `image_gen.imagegen` 生成，裁去原图底部 26 px 后以 Lanczos 缩至展示尺寸两倍，WebP 质量 90。角色帧从本仓库 `apps/office/public/characters/{claude-code,codex,gemini}-a.png/.json` 的 `walk/{left,right,down}/{0..3}` 导出；原帧 64 × 96，以 Lanczos 缩至 48 × 72，按角色及方向排列，WebP 质量 80。运行 `python3 apps/web/tools/make-agent-walk.py` 可重新生成图集，需要 Pillow。主网页只请求本目录中的副本。

小合影背景的完整生图提示：

> Use case: stylized-concept. Asset type: small decorative background inside a 200 by 130 pixel wooden photo frame in a pixel-art web app. Primary request: an empty cozy modern office corner in the same warm, detailed cartoon pixel-art spirit as a friendly office game. Scene: straight-on view of warm cream plaster wall and honey wood plank floor, a small square window or framed picture high on the wall and a modest potted green plant tucked into one side. Composition: horizontal 3:2 canvas, calm center; the lower 40 percent is unobstructed walkable wooden floor for three separately overlaid character sprites. Crisp small pixel clusters and clean stepped outlines, coherent perspective, soft daylight, natural muted color. No people, no characters, no text, no signs, no UI, no frame, no vignette, no watermarks.

新增横景、纸卡、浅木纹均实际使用内置 `image_gen.imagegen` 生成，没有 CLI/API 回退。横景经过一次构图修订，把台面抬高以适应窄条；WebP 质量 88–90，未做低色数量化。纸卡保留 alpha，清除生成器外沿少量高饱和黄红杂像素，裁去外围空白后补透明安全边距。所有缩放、编码和预览均通过 `qc-heavy` 串行处理。

原有五张素材保持不变。窗景来自项目 `apps/office/public/background.webp` 的授权裁切，原图未修改；其余旧素材也是上一轮内置生图产物。素材沿用项目使用范围，不声称公共领域或第三方许可。验收预览移出 public 到项目本地验收目录，不作为发布素材。

## 新增素材生图提示

- **工作台横景**：细腻温暖卡通像素现代办公室，正面略俯视的连续木工作台/矮柜与墙景；左侧窗户暖光和盆栽，中间安静暖灰墙面留标题安全区，右侧书、绿罩台灯、文件架与小打印机；整体连贯光照与透视，细小阶梯轮廓与丰富明暗，浅蜂蜜木材。禁止文字、人物、标志、假 UI、大黑屏电脑和孤立道具拼贴。修订将台面上移至画布约 58% 高度，底部柜体约占 38%，保持中央留白。
- **纸卡**：透明背景，正面正交平整的现代奶油纸文件卡，顶部中央小银色金属夹，细像素边缘、极轻纸层、方角和安静空白中心；无文字、线条、印章、背景平面、卷曲、木框或中世纪卷轴感。
- **浅木纹**：均匀漫射光照的低对比浅蜂蜜木材，克制细横纹和细像素层次；不画密集木结、涡纹、板缝、边框、物件、文字或暗角。

## 验收范围

实际界面第一轮截图与原 office 背景已目视对照：旧版深密木纹过多，新增横景以连续光照、植物与家具建立场景，浅木纹降低柜体噪声。生成原件、最终 WebP、1100 × 120 中心裁切和透明纸卡的浅纸/深木双底均已目视检查；页面集成后的布局、响应式和文字对比由界面负责人验收。本素材任务不运行浏览器，不修改 src/docs，不提交推送。

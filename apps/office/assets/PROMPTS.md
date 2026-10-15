# 像素办公室素材生成记录
第三版取代前两版：改为匹配斜放显示器的四分之三坐姿，保留站姿头身比例，仅收腿；前两版正背朝向及过矮坐姿记录保留为历史。
坐姿补充图三版的完整提示词与比例记录见 [PROMPTS-seated.md](PROMPTS-seated.md)。
第二版正面四向坐姿与全图集40色量化见 [PROMPTS-front-seating.md](PROMPTS-front-seating.md)。
礼仪专属原图与正坐补充图的提示词、候选及比例记录见 [PROMPTS-receptionist.md](PROMPTS-receptionist.md)。
使用 Codex 内置 image_gen 工具，2026-10-14 生成。画风参考 `docs/office-samples/background-sample.png` 与 `sprite-sample.png`。
经协调者确认，为保证走路、坐姿、打字的原像素比例和身份一致，每种角色改为同一次生成的 **4 列 × 5 行** 图；前四行依次下、左、右、上，每行站、左脚、站、右脚，第五行坐姿、打字 1、打字 2、空格。新增坐姿由五张独立的 `<kind>-seated.png` 4 列 × 2 行补充图提供，原五行逐像素保留。只保留选中的六张原图及五张补充图。原图保留完整生成内容；固定原图运行 `pnpm --filter office sprites` 可确定性重建图集。生图本身具有随机性，同提示词不能保证逐像素重现。
切帧方式经协调者确认调整为：抠色后在整图上做 8 邻接连通区域标记，按区域质心归入 `Math.round(i*W/4)`、`Math.round(j*H/5)` 边界确定的格子，完整保留越界头发。19 个角色格必须有像素，留空格不能超过 10 个不透明像素；全部帧仍共用框、底边对齐、最近邻等比缩放。
## background.png
用途：场景背景，不缩放、不拉伸；public 中为原图副本。
生成次数：2；选中第 2 次（对第 1 次结果作定向修改）。实测尺寸：1672×941。
完整提示词原文：
```text
Use case: stylized-concept. Create a production game background for a pixel-art office. Match the warm wooden furniture, cream walls, crisp dark brown pixel outlines and oblique overhead isometric view of the office sample. Wide horizontal 16:9 composition, requested 2048x1152. One complete spacious office with clearly separated areas and open connected walkways: reception counter at front left with an EMPTY chair behind it and a completed-file basket beside it; a large task whiteboard on the back wall; exactly FOUR work zones arranged as four separate desk clusters, each cluster containing FOUR individual computer desks and four empty chairs (16 work desks total), each cluster has an entirely blank sign plaque for programmatic labels; a separate meeting area with ONE large conference table and exactly SIX empty seats; a lounge with sofa and coffee machine; entrance door at the lower right edge. No people or characters anywhere, no silhouettes, no writing or letters on signs. Warm late afternoon light from upper left, cozy amber wood and cream, restrained plants. Pixel art with hard square pixels, no blur, no gradients, no watermark. Keep all furniture fully visible within image, reserve generous floor space for walking characters. This is a new larger office scene in the sample's style, not the sample's four-desk layout.
```
第 2 次完整修改提示词（引用第 1 次生成图）：
```text
Edit the referenced warm pixel office background. Change ONLY the conference area at TOP RIGHT: REMOVE the single chair at the left short end of the table and the single chair at the right short end. Keep the THREE chairs along the upper long edge and THREE chairs along the lower long edge, exactly SIX seats total. Fill removed chairs with the matching rug/floor. Preserve the entire rest of the image unchanged: four 4-desk clusters, reception and completed-file basket at lower left, whiteboard, blank plaques, lounge coffee machine, entrance at lower right, empty people-free scene, warm wood, overhead oblique view, wide composition, original dimensions. Do not add people, text or any new furniture.
```
## claude-code.png
用途：角色原图，19 帧共用包围盒、脚底对齐，最近邻等比缩放到 64×96。
生成次数：1；选中第 1 次。实测尺寸：1122×1402。
完整提示词原文：
```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. claude-code office worker: teal hoodie with hood down, dark charcoal trousers, brown shoes, short dark brown hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit teal hoodie with hood down, dark charcoal trousers, brown shoes, short dark brown hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```
## codex.png
用途：角色原图，19 帧共用包围盒、脚底对齐，最近邻等比缩放到 64×96。
生成次数：2；选中第 2 次（对第 1 次结果作定向修改）。实测尺寸：1122×1402。
完整提示词原文：
```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. codex office worker: ivory button-up shirt, navy trousers, brown shoes, black rectangular glasses, short dark brown hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit ivory button-up shirt, navy trousers, brown shoes, black rectangular glasses, short dark brown hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```
第 2 次完整修改提示词（引用第 1 次生成图）：
```text
Edit this character sheet for strict equal-cell slicing. Keep exactly 1122x1402 image, 4 columns by 5 rows, 19 same codex characters and the blank bottom-right cell, original face glasses ivory shirt navy trousers brown shoes, all poses and pixel scale unchanged. The equal ROW boundaries are y=0,280,561,841,1122,1402. The equal COLUMN boundaries are x=0,281,561,842,1122. EVERY sprite including hair and shoes MUST be completely inside its own cell with at least 25 pixels magenta clearance from EVERY boundary. Move sprites vertically to have feet at y=235,515,796,1076,1357 respectively; do not resize sprites. This eliminates the back-view hair spilling into row3 and seated hair spilling into row4. Preserve down,left,right,up row order and sit,typing1,typing2,empty fifth row. Fill all gaps with exact flat #FF00FF, no stray pixels or shadows.
```
## n8n.png
用途：角色原图，19 帧共用包围盒、脚底对齐，最近邻等比缩放到 64×96。
生成次数：1；选中第 1 次。实测尺寸：1122×1402。
完整提示词原文：
```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. n8n office worker: bright orange vest over cream short-sleeved shirt, charcoal trousers, brown shoes, short dark brown hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit bright orange vest over cream short-sleeved shirt, charcoal trousers, brown shoes, short dark brown hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```
## script.png
用途：角色原图，19 帧共用包围盒、脚底对齐，最近邻等比缩放到 64×96。
生成次数：2；选中第 2 次（对第 1 次结果作定向修改）。实测尺寸：1122×1402。
完整提示词原文：
```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. script office worker: blue baseball cap, mustard short-sleeved shirt, navy trousers, brown shoes, short dark brown hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit blue baseball cap, mustard short-sleeved shirt, navy trousers, brown shoes, short dark brown hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```
第 2 次完整修改提示词（引用第 1 次生成图）：
```text
Edit the referenced pixel sprite atlas. Keep exactly its 4 columns by 5 rows, dimensions, all colors, magenta background, blue-cap mustard-shirt character identity, pixel proportions and outlines. Change ONLY rows TWO and THREE: swap those rows' contents, so row TWO all four characters face LEFT (nose and cap brim point toward the LEFT edge), row THREE all four characters face RIGHT (nose and cap brim point toward the RIGHT edge). Rows one, four and five must remain unchanged, row five fourth cell stays empty magenta. Preserve exact equal grid spacing and walking order standing, left foot, standing, right foot. No text or lines.
```
## custom.png
用途：角色原图，19 帧共用包围盒、脚底对齐，最近邻等比缩放到 64×96。
生成次数：1；选中第 1 次。实测尺寸：1122×1402。
完整提示词原文：
```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. custom office worker: burgundy casual sweater, khaki trousers, brown shoes, short dark brown hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit burgundy casual sweater, khaki trousers, brown shoes, short dark brown hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```
## 实测尺寸总表
| 原图 | 用途 | 次数 / 选中 | 实测宽×高 |
| --- | --- | --- | --- |
| background.png | 背景 | 2 / 2 | 1672×941 |
| claude-code.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| codex.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| n8n.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| script.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| custom.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |

第二版家具：探针见 [PROMPTS-furniture.md](PROMPTS-furniture.md)，W66 扩展见 [PROMPTS-furniture-v2.md](PROMPTS-furniture-v2.md)。

W66 终审返工（矩形会议桌、矮柜、茶几、门垫）：[PROMPTS-furniture-rework.md](PROMPTS-furniture-rework.md)。

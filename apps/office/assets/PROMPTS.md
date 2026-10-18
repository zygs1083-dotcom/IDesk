# 像素办公室素材生成记录
第三版背景与角色图沿用第一版；四分之三坐姿的生成记录见 [PROMPTS-seated.md](PROMPTS-seated.md)，礼仪正面坐姿见 [PROMPTS-receptionist.md#receptionist-seatedpng](PROMPTS-receptionist.md#receptionist-seatedpng)。
运行 `pnpm --filter office characters` 重建未量化的 `public/characters/<kind>-<外观>.png/.json` 和 `index.json`。
礼仪专属走路原图的提示词、候选及比例记录见 [PROMPTS-receptionist.md](PROMPTS-receptionist.md)。
使用 Codex 内置 image_gen 工具，2026-10-14 生成。画风参考 `docs/office-samples/background-sample.png` 与 `sprite-sample.png`。
经协调者确认，为保证走路、坐姿、打字的原像素比例和身份一致，每种角色改为同一次生成的 **4 列 × 5 行** 图；前四行依次下、左、右、上，每行站、左脚、站、右脚，第五行坐姿、打字 1、打字 2、空格。新增坐姿由五张独立的 `<kind>-<外观>-seated.png` 4 列 × 2 行补充图提供，原五行逐像素保留。只保留选中的六张原图及五张补充图。原图保留完整生成内容；固定原图运行 `pnpm --filter office characters` 可确定性重建图集。生图本身具有随机性，同提示词不能保证逐像素重现。
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
## claude-code-a.png
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
## codex-a.png
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
## n8n-a.png
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
## script-a.png
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
## custom-a.png
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
| claude-code-a.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| codex-a.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| n8n-a.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| script-a.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| custom-a.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| claude-code-b.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| claude-code-c.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| codex-b.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| codex-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| n8n-b.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| n8n-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| script-b.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| script-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| custom-b.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| custom-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| gemini-a.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| gemini-b.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| gemini-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| opencode-a.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| opencode-b.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| opencode-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| droid-a.png | 4×5 角色精灵（19 帧） | 3 / 3 | 1122×1402 |
| droid-b.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| droid-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| cursor-a.png | 4×5 角色精灵（19 帧） | 2 / 2 | 1122×1402 |
| cursor-b.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |
| cursor-c.png | 4×5 角色精灵（19 帧） | 1 / 1 | 1122×1402 |

## 更多角色外观（W92b）

以下记录均沿用第一版格子模板，已有 kind 的 a 原图仅作参考；新 kind 先选定 a，再以 a 为参考生成 b/c。

参考图文件名按生成时记录；原有五种无后缀的原图已由 W92a 改名加 `-a`。仅保留选中的原图，编辑提示词中的颜色修正由图像模型完成，没有程序转色。

## claude-code-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：2；选中第 2 次。实测尺寸：1122×1402。参考图：claude-code.png。

第 1 次（未选）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. claude-code office worker: teal hoodie with hood down, dark charcoal trousers, brown shoes, black hair in a low ponytail, fair skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit teal hoodie with hood down, dark charcoal trousers, brown shoes, black hair in a low ponytail, fair skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

第 2 次（选中）提示词原文：

```text
Edit ONLY hair color and skin tone of all 19 figures in this claude-code-b sprite atlas. Hair must be BLACK, neutral charcoal black highlights, NO brown hair or brown highlights anywhere. Keep the existing low ponytail shape. Skin must be FAIR light ivory peach. Preserve all remaining pixels, exact 1122x1402 dimensions, 4 columns x5 rows, row2 left row3 right row4 back row5 seated and empty last cell, all proportions pixel scale poses positions outlines teal hoodie hood down charcoal pants brown shoes and pure magenta background. Only black hair and fair skin change.
```

## claude-code-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：2；选中第 2 次。实测尺寸：1122×1402。参考图：claude-code.png。

第 1 次（未选）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. claude-code office worker: teal hoodie with hood down, dark charcoal trousers, brown shoes, brown curly hair, dark skin, round-frame glasses. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit teal hoodie with hood down, dark charcoal trousers, brown shoes, brown curly hair, dark skin, round-frame glasses throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

第 2 次（选中）提示词原文：

```text
Edit ONLY hairstyle of all19 figures in referenced claude-code-c atlas. Replace spiky straight brown hair with clearly CURLY brown hair: rounded clusters and small rounded pixel curl tufts, softly rounded curly silhouette instead of pointed spikes. Keep dark skin round glasses teal hoodie charcoal pants brown shoes exact head scale poses directions 4x5 layout magenta and empty bottom-right. Do not change any other detail.
```

## codex-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：codex.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. codex office worker: ivory button-up shirt, navy trousers, brown shoes, black rectangular glasses, short gray-white hair, fair skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit ivory button-up shirt, navy trousers, brown shoes, black rectangular glasses, short gray-white hair, fair skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## codex-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：codex.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. codex office worker: ivory button-up shirt, navy trousers, brown shoes, black rectangular glasses, black shoulder-length hair, dark skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit ivory button-up shirt, navy trousers, brown shoes, black rectangular glasses, black shoulder-length hair, dark skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## n8n-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：2；选中第 2 次。实测尺寸：1122×1402。参考图：n8n.png。

第 1 次（未选）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. n8n office worker: bright orange vest over cream short-sleeved shirt, charcoal trousers, brown shoes, reddish-brown buzz cut, over-ear headphones, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit bright orange vest over cream short-sleeved shirt, charcoal trousers, brown shoes, reddish-brown buzz cut, over-ear headphones, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

第 2 次（选中）提示词原文：

```text
Edit ONLY hair of all19 n8n figures. Required REDDISH-BROWN BUZZ CUT, extremely short close-cropped hair following skull, NO bangs, NO fringe, NO projecting tufts. Expose forehead. Keep headphones, head/face dimensions, peach skin, orange vest cream short sleeves charcoal pants brown shoes, all poses and 4x5 magenta grid lastcell empty exactly unchanged.
```

## n8n-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：n8n.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. n8n office worker: bright orange vest over cream short-sleeved shirt, charcoal trousers, brown shoes, blonde hair in a bun, fair skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit bright orange vest over cream short-sleeved shirt, charcoal trousers, brown shoes, blonde hair in a bun, fair skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## script-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：2；选中第 2 次。实测尺寸：1122×1402。参考图：script.png。

第 1 次（未选）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. script office worker: blue baseball cap worn BACKWARDS with brim behind head, mustard short-sleeved shirt, navy trousers, brown shoes, short dark brown hair, dark skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit blue baseball cap worn BACKWARDS with brim behind head, mustard short-sleeved shirt, navy trousers, brown shoes, short dark brown hair, dark skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

第 2 次（选中）提示词原文：

```text
Correct script-b atlas ONLY skin and cap orientation. ALL19 figures have DARK BROWN SKIN including face ears arms hands, clearly deep brown not peach. ALL19 wear BACKWARDS blue baseball cap. Row1 already shows adjustment opening at forehead; keep that. Row2 left profiles brim points RIGHT behind head; row3 right profiles brim points LEFT behind head. Row4 back views must show broad blue BRIM extending behind head toward viewer and NO adjustment opening on rear. Row5 right seated figures currently wrong: move brim from right/front to LEFT/BACK behind head, exactly as row3. Keep mustard short sleeve navy pants brown shoes brown hair all poses scale grid1122x1402 magenta and blank lastcell unchanged.
```

## script-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：script.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. script office worker: blue baseball cap worn forwards, mustard short-sleeved shirt, navy trousers, brown shoes, long BLACK hair tied out through back of cap, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit blue baseball cap worn forwards, mustard short-sleeved shirt, navy trousers, brown shoes, long BLACK hair tied out through back of cap, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## custom-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：2；选中第 2 次。实测尺寸：1122×1402。参考图：custom.png。

第 1 次（未选）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. custom office worker: burgundy casual sweater, khaki trousers, brown shoes, short silver-gray hair, thin-frame glasses, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit burgundy casual sweater, khaki trousers, brown shoes, short silver-gray hair, thin-frame glasses, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

第 2 次（选中）提示词原文：

```text
Add visibly identifiable THIN-FRAME EYEGLASSES to every front and profile face in this custom-b sprite atlas, including all three seated figures. Fine gray metal rims around lenses and thin temples over ears; NOT thick black frames. Keep eyes visible. Back-facing row4 unchanged. Keep silver-gray short hair peach skin burgundy sweater khaki trousers brown shoes every pose proportion 4x5 magenta grid and lastcell empty identical. Only add required thin-frame glasses.
```

## custom-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：custom.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. custom office worker: burgundy casual sweater, khaki trousers, brown shoes, long chestnut wavy hair, fair skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit burgundy casual sweater, khaki trousers, brown shoes, long chestnut wavy hair, fair skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## gemini-a.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：custom.png（比例、描边参考）。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. gemini office worker: light lavender knitted cardigan over white T-shirt, light gray trousers, brown shoes, dark brown bob haircut, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit light lavender knitted cardigan over white T-shirt, light gray trousers, brown shoes, dark brown bob haircut, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## gemini-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：gemini-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. gemini office worker: light lavender knitted cardigan over white T-shirt, light gray trousers, brown shoes, short BLACK hair, DARK BROWN skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit light lavender knitted cardigan over white T-shirt, light gray trousers, brown shoes, short BLACK hair, DARK BROWN skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## gemini-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：gemini-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. gemini office worker: light lavender knitted cardigan over white T-shirt, light gray trousers, brown shoes, short hair with PINK highlights, fair skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit light lavender knitted cardigan over white T-shirt, light gray trousers, brown shoes, short hair with PINK highlights, fair skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## opencode-a.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：claude-code.png（比例、描边参考）。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. opencode office worker: black T-shirt, olive green cargo trousers, brown shoes, messy short dark brown hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit black T-shirt, olive green cargo trousers, brown shoes, messy short dark brown hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## opencode-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：opencode-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. opencode office worker: black T-shirt, olive green cargo trousers, brown shoes, BALD head with full beard, DARK BROWN skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit black T-shirt, olive green cargo trousers, brown shoes, BALD head with full beard, DARK BROWN skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## opencode-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：opencode-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. opencode office worker: black T-shirt, olive green cargo trousers, brown shoes, long dark brown hair with a GREEN HEADBAND, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit black T-shirt, olive green cargo trousers, brown shoes, long dark brown hair with a GREEN HEADBAND, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## droid-a.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：3；选中第 3 次。实测尺寸：1122×1402。参考图：claude-code.png（新 kind 比例参考）。

第 1 次（未选）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. droid office worker: light gray work coveralls with ORANGE collar, brown shoes, short black hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit light gray work coveralls with ORANGE collar, brown shoes, short black hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

第 2 次（未选）提示词原文：

```text
Edit this exact 4-column by 5-row pixel sprite sheet only: the garment must be light gray industrial one-piece WORK COVERALLS, with an orange stand collar. Remove the HOOD from every pose; NO hood, NO hoodie. Replace the draped gray bulge behind the neck with a plain flat upper back and small orange collar. Keep black short hair, peach skin, all poses, row direction, pixel scale, outlines, exact magenta background and empty bottom-right cell unchanged. No extra accessories.
```

第 3 次（选中）提示词原文：

```text
Correct ONLY the four BACK-VIEW sprites in ROW FOUR: erase the gray curved U-shaped hood outline below the orange collar. The entire gray upper back must be plain flat fabric of industrial coveralls, no hood, no curved draped shape, no scarf. A thin straight horizontal shoulder seam is allowed. Preserve orange collar, all colors, all pixels outside those four upper backs, sprite dimensions and positions and magenta background. Output same 4 by 5 sprite sheet.
```

## droid-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：droid-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. droid office worker: light gray industrial one-piece work coveralls with ORANGE collar and plain flat back, brown shoes, short RED hair, FAIR skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit light gray industrial one-piece work coveralls with ORANGE collar and plain flat back, brown shoes, short RED hair, FAIR skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## droid-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：droid-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. droid office worker: light gray industrial one-piece work coveralls with ORANGE collar and plain flat back, brown shoes, short black hair, warm peach face, safety goggles pushed up onto the FOREHEAD above the eyes. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit light gray industrial one-piece work coveralls with ORANGE collar and plain flat back, brown shoes, short black hair, warm peach face, safety goggles pushed up onto the FOREHEAD above the eyes throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## cursor-a.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：2；选中第 2 次。实测尺寸：1122×1402。参考图：custom.png（新 kind 比例参考）。

第 1 次（未选）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. cursor office worker: black TURTLENECK sweater, dark gray trousers, brown shoes, short black hair, warm peach face. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit black TURTLENECK sweater, dark gray trousers, brown shoes, short black hair, warm peach face throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

第 2 次（选中）提示词原文：

```text
Edit this exact pixel sprite sheet: change ONLY the hair in every one of the 19 poses from brown to BLACK, with neutral charcoal-gray highlights. No brown or chestnut tint in hair. Keep hairstyle, peach skin, black high turtleneck sweater, dark gray trousers, brown shoes, every pose and direction, grid, blank last cell, outlines, scale, and solid magenta background exactly as they are.
```

## cursor-b.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：cursor-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. cursor office worker: black TURTLENECK sweater, dark gray trousers, brown shoes, short BLOND hair, FAIR skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit black TURTLENECK sweater, dark gray trousers, brown shoes, short BLOND hair, FAIR skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

## cursor-c.png（W92b）

用途：四向走路与侧坐／打字十九帧，4×5，末格空白。生成次数：1；选中第 1 次。实测尺寸：1122×1402。参考图：cursor-a.png。

第 1 次（选中）提示词原文：

```text
Use case: stylized-concept. Production pixel-game character atlas, exactly FOUR columns and FIVE rows in a regular equally spaced rectangular grid (20 equal cells). Uniform pure #FF00FF magenta background. cursor office worker: black TURTLENECK sweater, dark gray trousers, brown shoes, BLACK BRAIDED hair, DARK BROWN skin. Same face, outfit, pixel scale and two-head-tall chibi proportions in ALL cells, including sitting cells. Crisp thick dark brown square pixel outlines, simple 3-tone shading, upper-left warm light, retro RPG sprites matching the supplied sample's aesthetic. Every character occupies about 65% of its cell height when standing; generous magenta margins and centered horizontally. Feet at identical local baseline in every cell. No shadows, text, grid borders or props.
ROW 1 DOWN facing viewer: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 2 LEFT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 3 RIGHT profile: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 4 UP back view: neutral standing, left foot forward, neutral standing, right foot forward.
ROW 5: cell 1 RIGHT profile seated on invisible chair, hands on lap; cell 2 same seated pose with hands forward at invisible keyboard height down; cell 3 same seated pose with hands a few pixels up typing; cell 4 completely EMPTY MAGENTA.
Seated sprites are naturally shorter due to bent knees, NEVER enlarged: exactly same head size, same torso size and same pixel scale as walking sprites. All soles rest at the same relative height in their cells. No visible chair, desk or keyboard. Maintain outfit black TURTLENECK sweater, dark gray trousers, brown shoes, BLACK BRAIDED hair, DARK BROWN skin throughout. Need exactly 19 characters plus one blank cell; never add sixth row.
```

# 像素办公室素材生成记录
第二版（2026-10-15）取代 W51 第一版：第一版正背坐姿腿过长、整体高度接近站姿，看起来站在椅子上；以下第一版记录保留作为历史。
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
## claude-code-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：2；选中第 2 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Edit the referenced production pixel-game character atlas to produce ONLY TWO NEW ROWS, exactly FOUR columns by TWO rows (8 equal cells), requested 1122x561. Reference is identity and exact pixel-scale guide, do NOT redraw or include its original five rows. Uniform pure #FF00FF magenta background. Same claude-code worker, teal hoodie hood down, charcoal trousers, brown shoes, same short dark brown hair and peach face, same thick square dark outlines and 3-tone pixel shading. Exact SAME head width approximately 108 pixels and seated total height approximately 200 pixels as reference fifth row, NEVER enlarge. Each 280.5x280.5 cell has sprite centered horizontally and soles at local y=235. ROW 1: cell 1 DOWN facing viewer seated on invisible chair hands on lap; cell 2 same front seated hands forward at invisible keyboard height down; cell 3 same front seated hands slightly raised typing; cell 4 UP back-view seated, showing back of head and hoodie back. ROW 2: cell 1 UP back-view seated typing hands low; cell 2 same back seated typing hands slightly raised; cells 3 and 4 COMPLETELY EMPTY MAGENTA. Bent knees make seated sprite shorter than standing. Match reference fifth row torso size and head size exactly. Front faces audience, back shows no face. No chair, desk, keyboard, shadows, labels, text or grid lines. Keep six figures fully inside individual cells with generous magenta margins. Output only new 4x2 sheet.
```
```text
Use case: identity-preserve. Correct ONLY the seated posture of the six figures in image 2. Image 1 original fifth row is the exact identity and scale reference. Image 2 figures currently look standing: make all six visibly SITTING with thighs horizontal, bent knees raised forward, short vertical shins, soles beneath knees. Front figures must have visibly broad horizontal lap and knees protruding sideways in front of hips, torso shortened by sitting, NOT straight standing legs. Back figures must also sit with bent legs, wide seated hips and shortened lower body. Same hair and face and teal hoodie from reference, no change in head size; normalized to requested 1122x561 sheet the head should be 108 px wide and total seated body 200 px tall. Match original fifth row pixel-art exactly. Keep 4 columns x2 rows: top front sit / front typing hands low / front typing hands up / back sit; bottom back typing low / back typing up / EMPTY / EMPTY. Pure #FF00FF background. No chairs, desks, keyboards, shadows, text, lines. Only new two-row sheet, requested 1122x561.
```
## codex-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：1；选中第 1 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Using this original sprite atlas as exact identity and pixel-scale reference, output ONLY new TWO ROWS, FOUR columns by TWO rows, requested 1122x561, pure #FF00FF magenta background. Codex worker same black rectangular glasses, short brown hair, ivory button-up shirt, navy trousers, brown shoes. Same face and shading, crisp square pixels, thick dark outlines, NOT enlarged. At 1122x561 each sprite seated height 216px and head width 120px, matching original fifth-row sit. All six figures visibly SITTING: horizontal thighs and raised broad knees in front of hips, bent knees, short vertical shins, wide seated lap, shorter than standing. ROW 1: DOWN front-facing sitting hands on lap; DOWN sitting typing hands forward low; DOWN sitting typing hands a few pixels higher; UP back-view sitting showing back of head and shirt, no face. ROW 2: UP sitting typing low; UP sitting typing hands slightly raised; EMPTY MAGENTA; EMPTY MAGENTA. Same original pixel thickness and body proportions as fifth row. Regular equally spaced 280.5px cells, centered with ample margins and soles at local y=245. No visible chair, desk, keyboard, shadows, letters or grid lines. Do not include original five rows.
```
## n8n-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：1；选中第 1 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Produce ONLY TWO NEW ROWS for referenced pixel atlas, requested 1122x561, exactly FOUR columns x TWO rows regular equal cells. Pure #FF00FF magenta background. Exact same n8n worker identity: orange vest cream short sleeves charcoal trousers brown shoes short dark brown hair peach face, thick dark square pixel outlines, simple 3-tone shading, same original pixel thickness. Original fifth-row sit is size reference: seated total height 200px, head width 104px at target dimensions. Never enlarge. Six figures all visibly SITTING: horizontal thighs, bent knees forward, broad lap and short downward shins; shorter than standing, same torso and head size. ROW 1: DOWN front-view seated hands on lap; DOWN seated typing hands forward low; DOWN seated typing hands slightly up; UP back-view seated showing back of head and vest, no face. ROW 2: UP seated typing hands low; UP seated typing hands slightly raised; EMPTY MAGENTA; EMPTY MAGENTA. Center sprites within 280.5px cells, feet at local y=240, generous clear margins. No chairs desks keyboards shadows text or grid lines. Only new two rows, exclude original five rows, preserve reference appearance.
```
## script-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：1；选中第 1 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Produce ONLY TWO NEW ROWS for referenced pixel atlas, requested 1122x561, exactly FOUR columns x TWO rows regular equal cells. Pure #FF00FF magenta background. Exact same script worker identity: blue baseball cap, mustard short-sleeve shirt navy trousers brown shoes brown hair peach face, thick dark square pixel outlines, simple 3-tone shading, same original pixel thickness. Original fifth-row sit is size reference: seated total height 197px, head width 114px at target dimensions. Never enlarge. Six figures all visibly SITTING: horizontal thighs and bent knees forward, broad lap, short downward shins; shorter than standing, same torso and head size. ROW 1: DOWN front-view seated hands on lap; DOWN seated typing hands forward low; DOWN seated typing hands slightly up; UP back-view seated showing cap back and shirt back, no face. ROW 2: UP seated typing hands low; UP seated typing hands slightly raised; EMPTY MAGENTA; EMPTY MAGENTA. Center sprites within 280.5px cells, feet at local y=240, generous clear margins. No chairs desks keyboards shadows text or grid lines. Only new two rows, exclude original five rows, preserve reference appearance.
```
## custom-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：1；选中第 1 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Produce ONLY TWO NEW ROWS for referenced pixel atlas, requested 1122x561, exactly FOUR columns x TWO rows regular equal cells. Pure #FF00FF magenta background. Exact same custom worker identity: burgundy sweater with white collar khaki trousers brown shoes short dark brown hair peach face, thick dark square pixel outlines, simple 3-tone shading, same original pixel thickness. Original fifth-row sit is size reference: seated total height 200px, head width 106px at target dimensions. Never enlarge. Six figures all visibly SITTING: horizontal thighs and bent knees forward, broad lap, short downward shins; shorter than standing, same torso and head size. ROW 1: DOWN front-view seated hands on lap; DOWN seated typing hands forward low; DOWN seated typing hands slightly up; UP back-view seated showing back of head and sweater, no face. ROW 2: UP seated typing hands low; UP seated typing hands slightly raised; EMPTY MAGENTA; EMPTY MAGENTA. Center sprites within 280.5px cells, feet at local y=240, generous clear margins. No chairs desks keyboards shadows text or grid lines. Only new two rows, exclude original five rows, preserve reference appearance.
```
## 坐姿第二版共用处理
经协调端确认，六个人物按同一个 0.85–1.0 系数等比最近邻缩小，不压扁头部、不改姿势；每格水平居中、底边保持生成结果的位置。原图 `<kind>.png` 不动。以下比例先按实际输出最近邻调整到 1122×561，再测包围盒；头宽取包围盒上方 35% 不透明区域的横向跨度。六格均已逐格检查：正面大腿横向、膝盖弯曲，背面只见后脑、肩背和坐着的臀部；缩放后未见明显断线。
选中原始生成结果保存在 `https://raw.githubusercontent.com/zygs1083-dotcom/IDesk/pr-assets/w54/selected-original-<kind>.png`；下载到 `selected.png` 后执行下列代码（`kind`、`factor` 取各节数值）可复现已入库结果，不往 tools/ 增加脚本：
```python
from PIL import Image
import math
import sys
kind,source,factor=sys.argv[1],sys.argv[2],float(sys.argv[3])
image=Image.open(source).convert('RGB').resize((1122,561),Image.Resampling.NEAREST)
result=Image.new('RGB',image.size,(255,0,255))
for index in range(6):
 col,row=index%4,index//4
 left,right=round(col*1122/4),round((col+1)*1122/4)
 top,bottom=round(row*561/2),round((row+1)*561/2)
 cell=image.crop((left,top,right,bottom))
 mask=Image.new('L',cell.size)
 mask.putdata([255 if math.dist(rgb,(255,0,255))>60 else 0 for rgb in cell.get_flattened_data()])
 box=mask.getbbox()
 figure=cell.crop(box)
 figure=figure.resize((round(figure.width*factor),round(figure.height*factor)),Image.Resampling.NEAREST)
 result.paste(figure,(round((left+right-figure.width)/2),top+box[3]-figure.height))
result.save('apps/office/assets/raw/'+kind+'-seated.png')
```
命令：`python3 normalize.py <kind> selected.png <factor>`（代码仅供复现；normalize.py 是临时文件）。
## claude-code-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：3；选中第 3 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.90，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.8660 / +8.57% → 0.7799 / -1.90%；sit/up 0.8421 / +15.24% → 0.7560 / +3.81%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Create seated supplement ONLY4columns x2rows, output1122x561 pure #ff00ff. Preserve referenced pixel character teal hoodie brown spiky hair black trousers brown shoes. Reference first standing frame is210px high head106px wide. Every new seated figure MUST be157px high (75% standing), head106px wide unchanged. Head approximately94px high, shirt torso only40px high, knees/shins/feet only23px high. Make very squat seated shape with broad lap. Front sit has horizontal thighs toward viewer bent knees short downward shins feet in front, clearly seated not standing. Back sit only back head shoulders hoodie and rounded seated buttocks, legs hidden. Don't render furniture. Row1 front sit hands lap/front typing/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. Cell centers140,421,701,982. Heads top95 feet252 in each row. Thin crisp square pixels match original. NO long legs, NO tall torsos. If generated at1774px wide, figures must be248px total high and head168px wide. KEEP HEAD LARGE and shorten body below head strongly.
CORRECTION: first image figures are MUCH TOO LARGE. Regenerate same six seated poses same4x2 magenta sheet with MUCH MORE EMPTY MAGENTA SPACE AROUND EACH FIGURE. At1774x887 output each cell443x443. Each figure must occupy only248px vertical (56% of cell height) and168px head width (38% cell width). Existing first image figures are320px high and200px wide WRONG, reduce whole body size about20%, but head MUST match second image original standing head when scaled sheets both1122px wide. Head target106px at1122px width. Seated height157px. Put feet local y255 and top98 on1122 sheet. Broad lap horizontal thighs bent knees downward short shins. Back seated head hoodie back and rounded buttocks, legs hidden. Keep hands lap in first, typing front next two, back sit fourth, back typing two nextrow, empty final2. Hoodie teal brown spiky hair black pants brown shoes, same crisp pixel art. No furniture. Plenty empty magenta, figures must look smaller than first image. Match original standing head size.
Increase the size of ALL six existing pixel characters by exactly25 percent (1.25x) within their same respective cells. Keep sheet 4columns x2rows magenta, same six poses and last2empty. Current characters approximately200px high in1774x887 sheet, make250px high with head168px wide. Head must not become giant. Scale whole figures uniformly, retain exact seated proportions; broad bent knees feet forward on front, rounded seated bottom and hidden legs on back. Brown spiky hair teal hoodie charcoal trousers brown shoes. Don't invent new pose or modify colors. Keep pixel edges crisp. Generous magenta margins.
```
## codex-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：4；选中第 2 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.92，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.8479 / +4.55% → 0.7788 / -3.64%；sit/up 0.8111 / +0.91% → 0.7465 / -7.27%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Create replacement codex seated pixel sprite supplement. Output 1122x561, exactly 4 columns x 2 rows on solid #FF00FF. Preserve identical brown hair, glasses, cream shirt, dark trousers and pixel art identity from reference. Reference standing down first cell is 218px tall with head 110px wide. ALL NEW seated sprites MUST have 164px total opaque height (75% of standing), SAME head width 110px, same head size, shorten only legs. NOT 200px tall. Front seated: visibly bent knees, horizontal thighs toward viewer, very short vertical shins, feet in front, lap broad. Back seated: only back of head shoulders shirt back and rounded seated buttocks, legs almost completely hidden, NEVER long standing legs. No visible chair furniture or shadows. Cell centers x 140,421,701,982. Feet at local y=245, head top y=81 in each row. Row1: front sit hands lap; front typing hands forward; front typing hands raised a little; back sit. Row2: back typing; back typing alternate; EMPTY; EMPTY. Exactly six figures. Crisp square pixel edges. Keep magenta gaps and regular cells. This replaces a failed version whose long legs made characters stand on chairs. Shrink legs strongly, preserve head.
Edit second image seated sheet to fix proportions using first standing sheet identity. Keep 4x2 six poses, magenta background and empty last two cells. IMPORTANT second image still too tall: at its 1774x887 size opaque figures height 310px is WRONG; required height 258px maximum, ideally 254px. Head width should be 174px, current 186px is too wide, reduce head width slightly only to 174px. Front head about 160px height, torso only 58px height, knees and feet only 36px height, total 254px. Back head about 160px high plus shoulders torso and seated bottom total only 254px, no legs visible. Front visibly seated with horizontal thighs toward viewer, broad lap, bent knees, tiny shins pointing down and feet forward. Preserve head same size as standing reference when both sheets normalized to 1122px width: 110px wide. DO NOT simply uniformly shrink characters. Shorten torso and legs dramatically while retaining head size. Current head top around100 feet410; instead head top around150 feet404. Exact same pose order. Pixel art sharp, no furniture, solid #ff00ff. Whole seated figures only 75% standing height.
Edit this sprite sheet. Current front seated opaque height measured184px at1122x561, target 163px so remove21px height from torso/legs. Current back sit176px target163px remove13px torso height. Keep head completely identical same width115px and height, preserve individual head pixels as far as possible. Place front head top y100 feet263 (163px tall). Existing reference front top81 bottom265 is too tall. Squash shirt torso vertically and make knees bend sharply horizontally out toward viewer, thighs horizontal, short shins feet forward; head unchanged. Back only back of head shoulders and seated rounded buttocks with hidden legs. Back head top100 bottom263. Row2 same. Keep regular4x2 grid, six poses order front sit/front type/front type/back sit, row2 back type/back type/empty/empty. Solid magenta. Preserve brown hair glasses cream shirt navy pants pixel art. Make all six full body bounding height163px at1122px wide, not184. No furniture.
Draw ONLY six SUPER SQUAT seated codex pixel figures, 4x2 sheet magenta background. Requested1122x561. Preserve brown hair glasses cream shirt dark pants shoes. Standing head110px width, standing total217px. New seated figures only150px tall with head110px wide. Must be nearly square silhouette. Make head exactly same as standing. Body below head only50px tall TOTAL (shirt30px, knees and feet20px). Head100px high. Front HUGE head, compressed shirt, broad lap with knees sharply bent horizontal thighs aimed toward viewer, tiny vertical shins feet in front. Back HUGE same head plus very short shirt and seated buttocks, absolutely no visible legs. Sitting is radically shorter than standing. All six same150px height. Row1 front sit/front typing/front alternate/back sit; row2 back typing/back alternate/empty/empty. Four equal columns two equal rows, centered in each cell. Pixel art crisp square outlines same visual identity. No chairs, no shadows, no text. DO NOT draw a normal full-height torso or straight legs. Head comprises two thirds entire height. At1774x887 size head174px wide and seated total237px high.
```
## n8n-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：3；选中第 3 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.98，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.7950 / +5.00% → 0.7800 / +3.00%；sit/up 0.7750 / +3.00% → 0.7600 / +1.00%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Draw ONLY six SUPER SQUAT seated n8n pixel workers matching reference identity orange vest cream short sleeves charcoal pants brown hair brown shoes. 4columns x2rows sheet1122x561 magenta #ff00ff, six figures first6cells, last2empty. Standing is200px tall head100px wide; NEW seated total150px height and head100px width unchanged. Head90px height, torso40px, knees+feet20px. Do NOT enlarge head or torso. Front seated horizontal thighs toward viewer, knees bent at right angles, tiny shins vertical feet in front, broad lap. Back seated only back of head shoulders vest and round buttocks on invisible chair, legs obscured entirely. Row1 front sit hands lap/front typing/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. No chairs desks shadows text. Generous margins, equal cell spacing. At1774x887 equivalent figure237px tall head158px wide. Strongly compressed torso/legs to produce unmistakable sitting, head stays as reference.
Regenerate same 4x2 seated n8n six poses but reduce all figures15% uniformly and shorten front shins further so knees clearly bent and thighs horizontal pointing toward viewer. Keep head same proportion to torso, broad lap, back only rounded seated buttocks no legs. Maintain orange vest cream short sleeves charcoal pants brown hair shoes. No chairs or shadows. Important output aspect2:1 (1122x561), four equal columns two equal rows, NOT16:9. Empty final2cells. At1122px width new figures total170px high with head108px wide. All six same scale. Plenty solid#ff00ff magenta margins. Pixel art square edges, original identity.
Edit referenced n8n seated sheet: reduce all six figures in size by exactly8% uniformly, leaving more empty magenta around each figure. Keep original 4x2 layout with6poses and final2empty, output1774x887 (or1122x561). Existing figures approx305px tall; new figures must280px tall (at1774wide), head180px wide. Same brown hair orange vest cream sleeves charcoal trousers shoes, crisp pixel art. Preserve front seated broad horizontal thighs, bent knees and short downward shins feet in front; preserve back shoulders and seated rounded buttocks no visible legs. No furniture. Do not enlarge figures or fill cells. Row1 front sit/front type/front type alternate/back sit; row2 back type/back type alternate/empty/empty. Magenta#ff00ff.
```
## script-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.91，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.8657 / +2.02% → 0.7861 / -7.07%；sit/up 0.8358 / +0.00% → 0.7612 / -9.09%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Generate ONLY seated supplement4columns x2rows on pure#ff00ff magenta, output1122x561. Identity from reference script worker blue baseball cap mustard short sleeve shirt navy trousers brown shoes. Preserve head100px wide as original standing; standing is202px tall, seated MUST be155px total height. Each figure occupies only55% of each280px cell height, head36% cell width, ample empty magenta. Make very squat seated pose with head95px high, torso35px, legs+feet25px. Front thighs horizontal toward viewer knees bent right angle tiny vertical shins feet in front. Back only back cap shoulders shirt and round seated buttocks on invisible chair, no visible legs. Row1 front sit hands on lap/front typing/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. Same six figures scale. Keep pixels crisp, same pixel size as original, no furniture shadows grid text. At1774x887 output total245px figure height and head158px wide. Do not fill cell with oversized figures.
```
## custom-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：3；选中第 3 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 1.00，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.7300 / -3.09% → 0.7300 / -3.09%；sit/up 0.7300 / -3.09% → 0.7300 / -3.09%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Generate seated custom pixel worker supplement, ONLY4columns x2rows magenta#ff00ff,1122x561. Same reference identity burgundy sweater white collar khaki trousers brown shoes short dark brown hair. Standing reference200px high head96px wide. Seated target158px total with head100px wide (do not enlarge head). Figures occupy56% cell height and36% cell width head, generous magenta margins. Front seated horizontal thighs pointed toward viewer, strongly bent knees, tiny downward vertical shins feet in front, broad lap. Back seated only back of head shoulders sweater and rounded seated buttocks on invisible chair, no long standing legs. Head90px tall torso43px legs25px. Row1 front sit hands on lap/front typing hands forward/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. Crisp square pixel art same outline thickness as reference, no furniture, shadows, text or grid. At1774px width each figure250px total tall head158px wide. Keep clear kneeling lap and seated hips.
Correct referenced custom seated sprite sheet. CRITICAL TOP RIGHT (row1 column4) MUST FACE AWAY showing back of brown hair, back of burgundy sweater, rounded khaki seated buttocks, NO FACE, NO SHOES, just like bottom two back figures. Front3 figures must sit with horizontal thighs aimed toward viewer, bent knees, very short downward shins, feet in front. Reduce height of front3 by shortening torso and shins while keeping head same size. Output exact2:1 aspect (1122x561),4columns x2rows six figures final2empty pure magenta. Reference original standing200px tall, head96px wide. NEW front sit and back sit must only160px high with head96px wide; at1774wide total253px tall head152px wide. Head90px high, shirt45px, kneesfeet25px. Same identity and pixel style as reference. No furniture shadows text grids. Do not repeat front view in top right. Row1 front sit/front type/front type alternate/BACK SIT; row2 BACKTYPE/BACKTYPE/empty/empty.
Scale all six seated characters uniformly DOWN by15% inside same respective cells, with MORE EMPTY MAGENTA SPACE. Keep4columns x2rows on#ff00ff, output1774x887. Current figure height325px and head210px in1774wide image are too big. New figures total275px high and head175px wide. Do not change any pose. Front3 show broad thighs horizontal toward viewer bent knees tiny downward shins feet forward. Back3 rounded seated buttocks, back of head sweater shoulders only, no face legs hidden. Burgundy sweater white collar khaki pants brown shoes brown hair. Same pixel art same identities. Row1 FRONT SIT/FRONT TYPE/FRONT TYPE/BACK SIT; row2 BACK TYPE/BACK TYPE/EMPTY/EMPTY. No furniture shadows text. Uniformly smaller than input, plenty more magenta margin.
```

# 坐姿补充图生成记录

## 第一版（W51，历史）
## claude-code-a-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：2；选中第 2 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Edit the referenced production pixel-game character atlas to produce ONLY TWO NEW ROWS, exactly FOUR columns by TWO rows (8 equal cells), requested 1122x561. Reference is identity and exact pixel-scale guide, do NOT redraw or include its original five rows. Uniform pure #FF00FF magenta background. Same claude-code worker, teal hoodie hood down, charcoal trousers, brown shoes, same short dark brown hair and peach face, same thick square dark outlines and 3-tone pixel shading. Exact SAME head width approximately 108 pixels and seated total height approximately 200 pixels as reference fifth row, NEVER enlarge. Each 280.5x280.5 cell has sprite centered horizontally and soles at local y=235. ROW 1: cell 1 DOWN facing viewer seated on invisible chair hands on lap; cell 2 same front seated hands forward at invisible keyboard height down; cell 3 same front seated hands slightly raised typing; cell 4 UP back-view seated, showing back of head and hoodie back. ROW 2: cell 1 UP back-view seated typing hands low; cell 2 same back seated typing hands slightly raised; cells 3 and 4 COMPLETELY EMPTY MAGENTA. Bent knees make seated sprite shorter than standing. Match reference fifth row torso size and head size exactly. Front faces audience, back shows no face. No chair, desk, keyboard, shadows, labels, text or grid lines. Keep six figures fully inside individual cells with generous magenta margins. Output only new 4x2 sheet.
```
```text
Use case: identity-preserve. Correct ONLY the seated posture of the six figures in image 2. Image 1 original fifth row is the exact identity and scale reference. Image 2 figures currently look standing: make all six visibly SITTING with thighs horizontal, bent knees raised forward, short vertical shins, soles beneath knees. Front figures must have visibly broad horizontal lap and knees protruding sideways in front of hips, torso shortened by sitting, NOT straight standing legs. Back figures must also sit with bent legs, wide seated hips and shortened lower body. Same hair and face and teal hoodie from reference, no change in head size; normalized to requested 1122x561 sheet the head should be 108 px wide and total seated body 200 px tall. Match original fifth row pixel-art exactly. Keep 4 columns x2 rows: top front sit / front typing hands low / front typing hands up / back sit; bottom back typing low / back typing up / EMPTY / EMPTY. Pure #FF00FF background. No chairs, desks, keyboards, shadows, text, lines. Only new two-row sheet, requested 1122x561.
```
## codex-a-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：1；选中第 1 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Using this original sprite atlas as exact identity and pixel-scale reference, output ONLY new TWO ROWS, FOUR columns by TWO rows, requested 1122x561, pure #FF00FF magenta background. Codex worker same black rectangular glasses, short brown hair, ivory button-up shirt, navy trousers, brown shoes. Same face and shading, crisp square pixels, thick dark outlines, NOT enlarged. At 1122x561 each sprite seated height 216px and head width 120px, matching original fifth-row sit. All six figures visibly SITTING: horizontal thighs and raised broad knees in front of hips, bent knees, short vertical shins, wide seated lap, shorter than standing. ROW 1: DOWN front-facing sitting hands on lap; DOWN sitting typing hands forward low; DOWN sitting typing hands a few pixels higher; UP back-view sitting showing back of head and shirt, no face. ROW 2: UP sitting typing low; UP sitting typing hands slightly raised; EMPTY MAGENTA; EMPTY MAGENTA. Same original pixel thickness and body proportions as fifth row. Regular equally spaced 280.5px cells, centered with ample margins and soles at local y=245. No visible chair, desk, keyboard, shadows, letters or grid lines. Do not include original five rows.
```
## n8n-a-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：1；选中第 1 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Produce ONLY TWO NEW ROWS for referenced pixel atlas, requested 1122x561, exactly FOUR columns x TWO rows regular equal cells. Pure #FF00FF magenta background. Exact same n8n worker identity: orange vest cream short sleeves charcoal trousers brown shoes short dark brown hair peach face, thick dark square pixel outlines, simple 3-tone shading, same original pixel thickness. Original fifth-row sit is size reference: seated total height 200px, head width 104px at target dimensions. Never enlarge. Six figures all visibly SITTING: horizontal thighs, bent knees forward, broad lap and short downward shins; shorter than standing, same torso and head size. ROW 1: DOWN front-view seated hands on lap; DOWN seated typing hands forward low; DOWN seated typing hands slightly up; UP back-view seated showing back of head and vest, no face. ROW 2: UP seated typing hands low; UP seated typing hands slightly raised; EMPTY MAGENTA; EMPTY MAGENTA. Center sprites within 280.5px cells, feet at local y=240, generous clear margins. No chairs desks keyboards shadows text or grid lines. Only new two rows, exclude original five rows, preserve reference appearance.
```
## script-a-seated.png
用途：新增正面／背面坐姿与打字六帧；原五行不改。生成次数：1；选中第 1 次。实测尺寸：1774×887；最近邻缩放到 1122×561，缩放前后人工检查像素清晰、正背方向正确。
完整提示词原文（按生成顺序；每次均引用原角色图，定向修改另引用前次结果）：
```text
Use case: identity-preserve. Produce ONLY TWO NEW ROWS for referenced pixel atlas, requested 1122x561, exactly FOUR columns x TWO rows regular equal cells. Pure #FF00FF magenta background. Exact same script worker identity: blue baseball cap, mustard short-sleeve shirt navy trousers brown shoes brown hair peach face, thick dark square pixel outlines, simple 3-tone shading, same original pixel thickness. Original fifth-row sit is size reference: seated total height 197px, head width 114px at target dimensions. Never enlarge. Six figures all visibly SITTING: horizontal thighs and bent knees forward, broad lap, short downward shins; shorter than standing, same torso and head size. ROW 1: DOWN front-view seated hands on lap; DOWN seated typing hands forward low; DOWN seated typing hands slightly up; UP back-view seated showing cap back and shirt back, no face. ROW 2: UP seated typing hands low; UP seated typing hands slightly raised; EMPTY MAGENTA; EMPTY MAGENTA. Center sprites within 280.5px cells, feet at local y=240, generous clear margins. No chairs desks keyboards shadows text or grid lines. Only new two rows, exclude original five rows, preserve reference appearance.
```
## custom-a-seated.png
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
## claude-code-a-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：3；选中第 3 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.90，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.8660 / +8.57% → 0.7799 / -1.90%；sit/up 0.8421 / +15.24% → 0.7560 / +3.81%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Create seated supplement ONLY4columns x2rows, output1122x561 pure #ff00ff. Preserve referenced pixel character teal hoodie brown spiky hair black trousers brown shoes. Reference first standing frame is210px high head106px wide. Every new seated figure MUST be157px high (75% standing), head106px wide unchanged. Head approximately94px high, shirt torso only40px high, knees/shins/feet only23px high. Make very squat seated shape with broad lap. Front sit has horizontal thighs toward viewer bent knees short downward shins feet in front, clearly seated not standing. Back sit only back head shoulders hoodie and rounded seated buttocks, legs hidden. Don't render furniture. Row1 front sit hands lap/front typing/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. Cell centers140,421,701,982. Heads top95 feet252 in each row. Thin crisp square pixels match original. NO long legs, NO tall torsos. If generated at1774px wide, figures must be248px total high and head168px wide. KEEP HEAD LARGE and shorten body below head strongly.
CORRECTION: first image figures are MUCH TOO LARGE. Regenerate same six seated poses same4x2 magenta sheet with MUCH MORE EMPTY MAGENTA SPACE AROUND EACH FIGURE. At1774x887 output each cell443x443. Each figure must occupy only248px vertical (56% of cell height) and168px head width (38% cell width). Existing first image figures are320px high and200px wide WRONG, reduce whole body size about20%, but head MUST match second image original standing head when scaled sheets both1122px wide. Head target106px at1122px width. Seated height157px. Put feet local y255 and top98 on1122 sheet. Broad lap horizontal thighs bent knees downward short shins. Back seated head hoodie back and rounded buttocks, legs hidden. Keep hands lap in first, typing front next two, back sit fourth, back typing two nextrow, empty final2. Hoodie teal brown spiky hair black pants brown shoes, same crisp pixel art. No furniture. Plenty empty magenta, figures must look smaller than first image. Match original standing head size.
Increase the size of ALL six existing pixel characters by exactly25 percent (1.25x) within their same respective cells. Keep sheet 4columns x2rows magenta, same six poses and last2empty. Current characters approximately200px high in1774x887 sheet, make250px high with head168px wide. Head must not become giant. Scale whole figures uniformly, retain exact seated proportions; broad bent knees feet forward on front, rounded seated bottom and hidden legs on back. Brown spiky hair teal hoodie charcoal trousers brown shoes. Don't invent new pose or modify colors. Keep pixel edges crisp. Generous magenta margins.
```
## codex-a-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：4；选中第 2 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.92，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.8479 / +4.55% → 0.7788 / -3.64%；sit/up 0.8111 / +0.91% → 0.7465 / -7.27%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Create replacement codex seated pixel sprite supplement. Output 1122x561, exactly 4 columns x 2 rows on solid #FF00FF. Preserve identical brown hair, glasses, cream shirt, dark trousers and pixel art identity from reference. Reference standing down first cell is 218px tall with head 110px wide. ALL NEW seated sprites MUST have 164px total opaque height (75% of standing), SAME head width 110px, same head size, shorten only legs. NOT 200px tall. Front seated: visibly bent knees, horizontal thighs toward viewer, very short vertical shins, feet in front, lap broad. Back seated: only back of head shoulders shirt back and rounded seated buttocks, legs almost completely hidden, NEVER long standing legs. No visible chair furniture or shadows. Cell centers x 140,421,701,982. Feet at local y=245, head top y=81 in each row. Row1: front sit hands lap; front typing hands forward; front typing hands raised a little; back sit. Row2: back typing; back typing alternate; EMPTY; EMPTY. Exactly six figures. Crisp square pixel edges. Keep magenta gaps and regular cells. This replaces a failed version whose long legs made characters stand on chairs. Shrink legs strongly, preserve head.
Edit second image seated sheet to fix proportions using first standing sheet identity. Keep 4x2 six poses, magenta background and empty last two cells. IMPORTANT second image still too tall: at its 1774x887 size opaque figures height 310px is WRONG; required height 258px maximum, ideally 254px. Head width should be 174px, current 186px is too wide, reduce head width slightly only to 174px. Front head about 160px height, torso only 58px height, knees and feet only 36px height, total 254px. Back head about 160px high plus shoulders torso and seated bottom total only 254px, no legs visible. Front visibly seated with horizontal thighs toward viewer, broad lap, bent knees, tiny shins pointing down and feet forward. Preserve head same size as standing reference when both sheets normalized to 1122px width: 110px wide. DO NOT simply uniformly shrink characters. Shorten torso and legs dramatically while retaining head size. Current head top around100 feet410; instead head top around150 feet404. Exact same pose order. Pixel art sharp, no furniture, solid #ff00ff. Whole seated figures only 75% standing height.
Edit this sprite sheet. Current front seated opaque height measured184px at1122x561, target 163px so remove21px height from torso/legs. Current back sit176px target163px remove13px torso height. Keep head completely identical same width115px and height, preserve individual head pixels as far as possible. Place front head top y100 feet263 (163px tall). Existing reference front top81 bottom265 is too tall. Squash shirt torso vertically and make knees bend sharply horizontally out toward viewer, thighs horizontal, short shins feet forward; head unchanged. Back only back of head shoulders and seated rounded buttocks with hidden legs. Back head top100 bottom263. Row2 same. Keep regular4x2 grid, six poses order front sit/front type/front type/back sit, row2 back type/back type/empty/empty. Solid magenta. Preserve brown hair glasses cream shirt navy pants pixel art. Make all six full body bounding height163px at1122px wide, not184. No furniture.
Draw ONLY six SUPER SQUAT seated codex pixel figures, 4x2 sheet magenta background. Requested1122x561. Preserve brown hair glasses cream shirt dark pants shoes. Standing head110px width, standing total217px. New seated figures only150px tall with head110px wide. Must be nearly square silhouette. Make head exactly same as standing. Body below head only50px tall TOTAL (shirt30px, knees and feet20px). Head100px high. Front HUGE head, compressed shirt, broad lap with knees sharply bent horizontal thighs aimed toward viewer, tiny vertical shins feet in front. Back HUGE same head plus very short shirt and seated buttocks, absolutely no visible legs. Sitting is radically shorter than standing. All six same150px height. Row1 front sit/front typing/front alternate/back sit; row2 back typing/back alternate/empty/empty. Four equal columns two equal rows, centered in each cell. Pixel art crisp square outlines same visual identity. No chairs, no shadows, no text. DO NOT draw a normal full-height torso or straight legs. Head comprises two thirds entire height. At1774x887 size head174px wide and seated total237px high.
```
## n8n-a-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：3；选中第 3 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.98，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.7950 / +5.00% → 0.7800 / +3.00%；sit/up 0.7750 / +3.00% → 0.7600 / +1.00%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Draw ONLY six SUPER SQUAT seated n8n pixel workers matching reference identity orange vest cream short sleeves charcoal pants brown hair brown shoes. 4columns x2rows sheet1122x561 magenta #ff00ff, six figures first6cells, last2empty. Standing is200px tall head100px wide; NEW seated total150px height and head100px width unchanged. Head90px height, torso40px, knees+feet20px. Do NOT enlarge head or torso. Front seated horizontal thighs toward viewer, knees bent at right angles, tiny shins vertical feet in front, broad lap. Back seated only back of head shoulders vest and round buttocks on invisible chair, legs obscured entirely. Row1 front sit hands lap/front typing/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. No chairs desks shadows text. Generous margins, equal cell spacing. At1774x887 equivalent figure237px tall head158px wide. Strongly compressed torso/legs to produce unmistakable sitting, head stays as reference.
Regenerate same 4x2 seated n8n six poses but reduce all figures15% uniformly and shorten front shins further so knees clearly bent and thighs horizontal pointing toward viewer. Keep head same proportion to torso, broad lap, back only rounded seated buttocks no legs. Maintain orange vest cream short sleeves charcoal pants brown hair shoes. No chairs or shadows. Important output aspect2:1 (1122x561), four equal columns two equal rows, NOT16:9. Empty final2cells. At1122px width new figures total170px high with head108px wide. All six same scale. Plenty solid#ff00ff magenta margins. Pixel art square edges, original identity.
Edit referenced n8n seated sheet: reduce all six figures in size by exactly8% uniformly, leaving more empty magenta around each figure. Keep original 4x2 layout with6poses and final2empty, output1774x887 (or1122x561). Existing figures approx305px tall; new figures must280px tall (at1774wide), head180px wide. Same brown hair orange vest cream sleeves charcoal trousers shoes, crisp pixel art. Preserve front seated broad horizontal thighs, bent knees and short downward shins feet in front; preserve back shoulders and seated rounded buttocks no visible legs. No furniture. Do not enlarge figures or fill cells. Row1 front sit/front type/front type alternate/back sit; row2 back type/back type alternate/empty/empty. Magenta#ff00ff.
```
## script-a-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 0.91，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.8657 / +2.02% → 0.7861 / -7.07%；sit/up 0.8358 / +0.00% → 0.7612 / -9.09%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Generate ONLY seated supplement4columns x2rows on pure#ff00ff magenta, output1122x561. Identity from reference script worker blue baseball cap mustard short sleeve shirt navy trousers brown shoes. Preserve head100px wide as original standing; standing is202px tall, seated MUST be155px total height. Each figure occupies only55% of each280px cell height, head36% cell width, ample empty magenta. Make very squat seated pose with head95px high, torso35px, legs+feet25px. Front thighs horizontal toward viewer knees bent right angle tiny vertical shins feet in front. Back only back cap shoulders shirt and round seated buttocks on invisible chair, no visible legs. Row1 front sit hands on lap/front typing/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. Same six figures scale. Keep pixels crisp, same pixel size as original, no furniture shadows grid text. At1774x887 output total245px figure height and head158px wide. Do not fill cell with oversized figures.
```
## custom-a-seated.png 坐姿补充图第二版
用途：替换第一版正背坐与打字六帧；4 列 × 2 行，末两格空白。生成次数：3；选中第 3 次。实测尺寸：1774×887；先整图最近邻到 1122×561，再六格统一系数 1.00，每格底边居中；最终 1122×561。
实测（高度比 / 头宽差，前→后处理）：sit/down 0.7300 / -3.09% → 0.7300 / -3.09%；sit/up 0.7300 / -3.09% → 0.7300 / -3.09%。
完整提示词原文（按生成顺序，行序即次数；引用原图及上次生成图）：
```text
Generate seated custom pixel worker supplement, ONLY4columns x2rows magenta#ff00ff,1122x561. Same reference identity burgundy sweater white collar khaki trousers brown shoes short dark brown hair. Standing reference200px high head96px wide. Seated target158px total with head100px wide (do not enlarge head). Figures occupy56% cell height and36% cell width head, generous magenta margins. Front seated horizontal thighs pointed toward viewer, strongly bent knees, tiny downward vertical shins feet in front, broad lap. Back seated only back of head shoulders sweater and rounded seated buttocks on invisible chair, no long standing legs. Head90px tall torso43px legs25px. Row1 front sit hands on lap/front typing hands forward/front typing alternate/back sit; row2 back typing/back typing alternate/empty/empty. Crisp square pixel art same outline thickness as reference, no furniture, shadows, text or grid. At1774px width each figure250px total tall head158px wide. Keep clear kneeling lap and seated hips.
Correct referenced custom seated sprite sheet. CRITICAL TOP RIGHT (row1 column4) MUST FACE AWAY showing back of brown hair, back of burgundy sweater, rounded khaki seated buttocks, NO FACE, NO SHOES, just like bottom two back figures. Front3 figures must sit with horizontal thighs aimed toward viewer, bent knees, very short downward shins, feet in front. Reduce height of front3 by shortening torso and shins while keeping head same size. Output exact2:1 aspect (1122x561),4columns x2rows six figures final2empty pure magenta. Reference original standing200px tall, head96px wide. NEW front sit and back sit must only160px high with head96px wide; at1774wide total253px tall head152px wide. Head90px high, shirt45px, kneesfeet25px. Same identity and pixel style as reference. No furniture shadows text grids. Do not repeat front view in top right. Row1 front sit/front type/front type alternate/BACK SIT; row2 BACKTYPE/BACKTYPE/empty/empty.
Scale all six seated characters uniformly DOWN by15% inside same respective cells, with MORE EMPTY MAGENTA SPACE. Keep4columns x2rows on#ff00ff, output1774x887. Current figure height325px and head210px in1774wide image are too big. New figures total275px high and head175px wide. Do not change any pose. Front3 show broad thighs horizontal toward viewer bent knees tiny downward shins feet forward. Back3 rounded seated buttocks, back of head sweater shoulders only, no face legs hidden. Burgundy sweater white collar khaki pants brown shoes brown hair. Same pixel art same identities. Row1 FRONT SIT/FRONT TYPE/FRONT TYPE/BACK SIT; row2 BACK TYPE/BACK TYPE/EMPTY/EMPTY. No furniture shadows text. Uniformly smaller than input, plenty more magenta margin.
```

## 第三版共用处理（W55）
四分之三视角取代正背朝向；头和上身保持站姿大小，只收腿。协调者批准原图阶段统一最近邻等比系数范围 0.90–1.12；不缩放已量化的 64×96 帧或图集。所有处理先将生成整图最近邻到 1122×561，再对约 280px 原图单元格的六个人物使用同一系数、水平居中、底边对齐。
头宽取包围盒上方 35% 不透明区域宽度；高度与原图 walk/down/0 比较。选中未处理原图见 `https://raw.githubusercontent.com/zygs1083-dotcom/IDesk/pr-assets/w55/selected-original-<kind>.png`。复现沿用上方「第二版共用处理」代码，factor 改为以下数值；除允许范围含放大外，算法相同。

## claude-code-a-seated.png 坐姿补充图第三版
用途：四分之三 front/back 坐姿与打字六帧，末两格空白；生成次数：4；选中第 4 次。实测尺寸：1774×887；整图最近邻到 1122×561 后，六帧统一等比放大 1.09；最终 1122×561。
站姿：高 209px，头宽 105px。 sit/front 高/比/头宽/差：170/0.8134/96/-8.57% → 185/0.8852/105/+0.00%。 sit/back 高/比/头宽/差：167/0.7990/96/-8.57% → 182/0.8708/105/+0.00%。
完整提示词原文（按次数排列；第一张引用原图，后续引用前次对应候选；n8n 第 4 次引用带站姿高度线的参考）：
```text
Use case: identity-preserve. Reference image is original claude-code pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same brown spiky hair teal hoodie charcoal pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair hoodie back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
Correct referenced seated supplement, keep same six three-quarter poses and 4x2 magenta grid with final2empty. Current figures MUCH TOO BIG. Reduce each whole figure 12 percent, leaving more empty magenta around it, and additionally bend legs more sharply to remove 12 percent of total height from legs ONLY. Preserve full torso and head proportions. At1774x887 actual output, figures MUST be only310px tall, head175px wide. Current front351px tall wrong. At1122 wide target195px total and110px head. Front faces LOWER RIGHT 45degrees, back faces UPPER RIGHT45degrees. Show chest face and bent horizontal thighs in front, back of head and one shoulder in back. Keep teal hoodie charcoal pants brown shoes brown spiky hair crisp pixel art. No furniture shadows labels lines.
Uniformly enlarge all six existing figures by exactly9percent inside same respective cells. Keep identical poses pixel proportions head body bent knees short shins. Do not change identity or camera. At1774wide current figures height265px are too small: make height290px and head165px. Keep4x2 sheet pure magenta final2empty. Teal hoodie brown spiky hair charcoal pants brown shoes three-quarter front lower right/back upper right. Keep outlines crisp. No objects text shadows.
Make all six existing figures uniformly SMALLER by exactly8percent. Keep exact shape and pose head body legs proportions. No extra shortening, no redesign. Current actual figures at1774wide337px tall with190px head; target310px tall and175px head. They should be195px tall at1122wide. Keep4columns2rows magenta final2empty. Teal hoodie brown spiky hair dark pants brown shoes, same three-quarter seated front/back poses. No furniture shadows text. Shrink slightly, not dramatically.
```

## codex-a-seated.png 坐姿补充图第三版
用途：四分之三 front/back 坐姿与打字六帧，末两格空白；生成次数：3；选中第 3 次。实测尺寸：1774×887；整图最近邻到 1122×561 后，六帧统一等比缩小 0.92；最终 1122×561。
站姿：高 217px，头宽 110px。 sit/front 高/比/头宽/差：208/0.9585/122/+10.91% → 191/0.8802/112/+1.82%。 sit/back 高/比/头宽/差：208/0.9585/123/+11.82% → 191/0.8802/113/+2.73%。
完整提示词原文（按次数排列；第一张引用原图，后续引用前次对应候选；n8n 第 4 次引用带站姿高度线的参考）：
```text
Use case: identity-preserve. Reference image is original codex pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same brown hair black rectangular glasses ivory button-up shirt navy pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height190px (standing217px, ratio0.88), head width110px (standing110px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
Correct this seated supplement. Keep six 3/4 poses 4columns x2rows magenta last2empty. Figures too big, current height380px head208px at1774wide WRONG. Make ALL six figures height326px head180px, by reducing full figure scale10percent AND bending legs more to shorten lower legs further. Head and torso remain same relative proportions, same glasses cream shirt navy pants brown shoes. Target at1122wide seated height206px head114px. Ample magenta margins, feet local y250 at1122wide. Front should turn face and chest diagonally LOWER RIGHT45degrees, not directly front. Back should turn UPPER RIGHT45degrees showing back of head back of shirt one shoulder, only tiny face sliver. Same pose order front sit/fronttype/fronttype/back sit, row2 backtype/backtype/empty/empty. Crisp square pixel art. No furniture text shadows lines. Much smaller figures than input.
Enlarge ALL six existing codex seated figures uniformly by exactly5percent within their existing cells. Current opaque height286px at1774wide should become300px, head165px should become173px. Keep exact same glasses ivory shirt navy pants brown shoes brown hair identity, same seated bent legs and three-quarter directions. Front face/chest LOWER RIGHT45degrees, back back-of-head and shirt UPPER RIGHT45degrees with little face visible. Same4x2 magenta grid last2empty. Do not change pixel proportions. No furniture shadows labels lines.
```

## n8n-a-seated.png 坐姿补充图第三版
用途：四分之三 front/back 坐姿与打字六帧，末两格空白；生成次数：6；选中第 6 次。实测尺寸：1774×887；整图最近邻到 1122×561 后，六帧统一等比缩小 0.95；最终 1122×561。
站姿：高 200px，头宽 100px。 sit/front 高/比/头宽/差：185/0.9250/99/-1.00% → 176/0.8800/94/-6.00%。 sit/back 高/比/头宽/差：185/0.9250/97/-3.00% → 176/0.8800/92/-8.00%。
完整提示词原文（按次数排列；第一张引用原图，后续引用前次对应候选；n8n 第 4 次引用带站姿高度线的参考）：
```text
Use case: identity-preserve. Reference image is original n8n pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short brown hair orange vest cream short sleeves charcoal pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair vest back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width98px (standing98px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
Edit this six-figure n8n seated supplement. All six figures are oversized. Uniformly reduce every complete figure by exactly20percent inside its current cell. Keep head torso bent knees and feet proportions IDENTICAL, preserve all poses and identity. More empty magenta margins. Do not change grid:4columns x2rows, last2empty, #FF00FF. At1774x887 output figure height300px and head145px. Preserve orange vest cream sleeves dark pants brown shoes brown hair and three-quarter lower-right front and upper-right back orientations. Pixel art. No furniture text grid shadows.
Correct n8n worker proportions in this 4x2 magenta seated sheet. Current heads too small compared to original standing worker. Increase HEAD size by20percent and preserve torso and bent-leg sizes, making overall figures taller by about10percent. At1122wide target height190px and head100px (both front and back). At1774wide target total300px and head158px. Same short brown hair orange vest cream sleeves charcoal trousers brown shoes. Front sit and front typing 3/4 LOWER RIGHT; back sit and backtyping 3/4 UPPER RIGHT showing back of head back of vest one shoulder. Keep six figures final2empty no furniture shadows text lines. Do not enlarge torso or lengthen legs.
Use case identity-preserve. Reference left is EXACT standing n8n worker scale, right empty cell has TOP CYAN LINE for seated head top and BOTTOM CYAN LINE for feet baseline. Create seated sprite supplement4columns2rows1122x561 magenta. DO NOT render cyan lines in output. In each280x280cell feet y244, headtop y69, opaque height175px, headwidth100px identical standing head. Seated person must fit BETWEEN those lines, head identical size left reference, torso same size, ONLY legs bent and shortened: horizontal thighs short downward shins feet pointed right. Orange vest cream sleeves charcoal pants brown shoes short brown hair. SIX FIGURES exactly: row1 sit/front facing LOWER RIGHT45degree showing face chest thighs; typing/front same arms out; alternate typing/front; sit/back facing UPPER RIGHT45degree showing back head back vest one shoulder. Row2 typing/back; alternate typing/back; EMPTY; EMPTY. All6 same scale. Crisp square pixels dark outlines matching reference. Generous magenta margin. No chairs desks keyboard shadows text or grid. At1774wide output each figure must only277px high and158px headwidth. Do not fill cells with oversized figures.
Edit existing n8n seated supplement. Keep head and torso EXACTLY identical unchanged size. Shorten ONLY the lower body below orange vest by50percent in vertical extent by bending knees much tighter: thighs horizontal nearly level, extremely short shins, brown shoes directly below lap. Current figures total237px at1122wide, need200px total. Head115px and torso unchanged. DO NOT shrink whole figures, DO NOT enlarge heads. Keep same six3/4 poses row1 frontsitting/fronttyping/fronttyping/backsitting row2 backtyping/backtyping/empty/empty, 4x2 magenta sheet. Front lower-right/back upper-right45degrees. Orange vest cream sleeves dark pants shoes brown hair same crisp pixel art. No furniture text lines shadows.
Uniformly reduce ALL SIX seated figures by exactly10percent within existing cells, keeping same proportions head torso bent thighs tiny shins. Current214px total height at1122wide too tall. Target190px at1122wide, head103px. At1774wide target300px figure height163px head. Same short brown hair orange vest cream sleeves dark pants brown shoes. Crisp pixel art3/4 front lower right/back upper right. Fourcolumns tworows pure magenta lasttwoempty. Do not modify pose or identity, only slightly reduce whole figures leaving more magenta space. No furniture text shadows lines.
```

## script-a-seated.png 坐姿补充图第三版
用途：四分之三 front/back 坐姿与打字六帧，末两格空白；生成次数：2；选中第 2 次。实测尺寸：1774×887；整图最近邻到 1122×561 后，六帧统一等比放大 1.025；最终 1122×561。
站姿：高 201px，头宽 99px。 sit/front 高/比/头宽/差：174/0.8657/103/+4.04% → 178/0.8856/106/+7.07%。 sit/back 高/比/头宽/差：176/0.8756/88/-11.11% → 180/0.8955/91/-8.08%。
完整提示词原文（按次数排列；第一张引用原图，后续引用前次对应候选；n8n 第 4 次引用带站姿高度线的参考）：
```text
Use case: identity-preserve. Reference image is original script pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same blue baseball cap brown hair mustard short-sleeve shirt navy pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width99px (standing99px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
Correct this six-figure script seated supplement. Uniformly shrink every whole figure by16percent. Further shorten legs slightly, keeping blue cap head and yellow shirt torso proportions. Current figures height360px at1774wide wrong, target300px tall. Head width target169px at1774wide. All six same scale. Front three-quarter toward LOWER RIGHT45degrees, back toward UPPER RIGHT45degrees showing rear cap back shirt shoulder and tiny face sliver. Visible horizontal bent thighs short shins. Navy pants brown shoes. Keep4x2 grid pure#FF00FF final2cells empty. More magenta margins. Pixel art no furniture text lines shadows.
```

## custom-a-seated.png 坐姿补充图第三版
用途：四分之三 front/back 坐姿与打字六帧，末两格空白；生成次数：2；选中第 2 次。实测尺寸：1774×887；整图最近邻到 1122×561 后，六帧统一等比放大 1.1；最终 1122×561。
站姿：高 200px，头宽 97px。 sit/front 高/比/头宽/差：163/0.8150/84/-13.40% → 179/0.8950/93/-4.12%。 sit/back 高/比/头宽/差：161/0.8050/85/-12.37% → 177/0.8850/94/-3.09%。
完整提示词原文（按次数排列；第一张引用原图，后续引用前次对应候选；n8n 第 4 次引用带站姿高度线的参考）：
```text
Use case: identity-preserve. Reference image is original custom pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short brown hair burgundy sweater white collar khaki pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair sweater back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width97px (standing97px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
Uniformly make ALL six custom seated figures smaller by15percent inside same cells. Keep full figures IDENTICAL proportions and poses, just more magenta space. Current opaque height350px at1774wide should be300px, head184px should be157px. Target1122wide figure190px head100px. Preserve burgundy sweater white collar khaki pants brown shoes brown hair pixel art same three-quarter front lower right/back upper right. 4columns2rows final2empty magenta. No props shadows text lines.
```

## 第三版帧锚点（W73c）

所有帧高 96px，锚点统一为 `anchor.y = (96 + lift) / 96`。lift 有符号：正数上抬，负数下移。精灵世界坐标底边是 `座位 y − lift`；座位落地点与 sortY 不变，PNG 像素不变。

| 适用角色 | 帧 | lift | anchor.x | anchor.y |
| --- | --- | ---: | ---: | ---: |
| claude-code、codex、n8n、script、custom | `sit/back`、`typing/back/0`、`typing/back/1` | 32 | 0.5 | 128/96 |
| receptionist | `sit/down`、`typing/down/0`、`typing/down/1` | −7 | 0.5 | 89/96 |
| 全部角色 | `sit/right`、`typing/right/0`、`typing/right/1` | 0 | 0.5 | 1 |
| 全部角色 | 其余帧 | 0 | 0.5 | 1 |

back 按肩膀量，不按被椅背挡住的臀量。工作区 1 四人坐满，以 codex back 帧外侧肩膀上沿 local y57 为标记，椅背对应上沿为世界 y325：

| lift | 肩膀世界 y（392 − 96 − lift + 57） | 露出椅背 |
| ---: | ---: | ---: |
| 20 | 333 | −8px，肩膀被盖住 |
| 24 | 329 | −4px，肩膀被盖住 |
| 28 | 325 | 0px，肩线贴住椅背 |
| 32 | 321 | 4px，符合 4–6px |

负责人审图通过 32px。四档比较图为 `pr-assets/w73c/back-lift{20,24,28,32}@3x.png`：青线是肩膀上沿，紫线是椅背上沿；图中数值均为原背景像素，图片最近邻放大三倍。

礼仪按双手落在台面后沿量。前台座位 (162,637) 不变；原 down 帧手下沿在世界 y615，柜台台面后沿 y623，默认锚点使手悬在台面上方。lift = −7 把手下沿放到 y622，贴住台面后沿；柜台覆盖膝盖和腿，椅背在身后。静坐与两张 typing 帧逐张核对，打字高帧的手仍在后沿上方做小幅动作。负责人审图接受有符号的 −7px，而非移动座位。

侧坐只用于右侧沙发的一个中央座位 (1594,608)，面向左，取 `sit/right` 并水平镜像。可见坐垫中心约 (1594,588)，人物臀/大腿在世界 y588–598，脚底在 y608；不抬升。两张 typing/right 帧同样检查臀/大腿接触坐垫，保留 lift = 0。北侧双人沙发用 front 帧，锚点仍为 1；脚底量在底座前沿 y539 正前方地板 y544，让沙发自然排在人后。大腿接坐垫前缘，膝盖、小腿和鞋在沙发前可见，不再被前沿盖住。会议室按原画前后各三把椅子，分别用 front/back，不造桌端侧座。

`tools/characters.mjs` 是唯一锚点表，生成图集 JSON；`tools/characters.test.mjs` 按真实座位与三个坐姿帧分别断言世界底边 = 座位 y − lift。重跑生成器时 `characters/*.png` 的哈希保持不变。

## W92b 实测尺寸总表

参考图文件名按生成时记录；原有五种的参考图已由 W92a 改名加 `-a`。归一流程经负责人批准：整图最近邻到 1122×561，六帧同系数缩放、水平居中、保持底边；本批均采用 0.90，不量化或转色。

| 原图 | 用途 | 次数 / 选中 | 实测宽×高 / 最终宽×高 |
| --- | --- | --- | --- |
| claude-code-b-seated.png | 4×2 坐姿补充（6 帧） | 3 / 3 | 1774×887 → 1122×561 |
| claude-code-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| codex-b-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| codex-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| n8n-b-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| n8n-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| script-b-seated.png | 4×2 坐姿补充（6 帧） | 2 / 2 | 1774×887 → 1122×561 |
| script-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| custom-b-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| custom-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| gemini-a-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| gemini-b-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| gemini-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| opencode-a-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| opencode-b-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| opencode-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| droid-a-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| droid-b-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| droid-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| cursor-a-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| cursor-b-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |
| cursor-c-seated.png | 4×2 坐姿补充（6 帧） | 1 / 1 | 1774×887 → 1122×561 |

## claude-code-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：3；选中第 3 次。实测尺寸：1774×887。参考图：claude-code-b.png、claude-code-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（未选）提示词原文：

```text
Use case: identity-preserve. Reference image is original claude-code pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same black hair in a low ponytail, fair skin, teal hoodie hood down charcoal pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair hoodie back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

第 2 次（未选）提示词原文：

```text
Edit all six seated figures in this claude-code-b supplement: uniformly reduce complete figures by14percent inside their existing cells, preserving identical head torso bent-leg proportions and poses. Target figure height292px at1774wide (185px at1122wide), head width166px at1774wide (105px at1122wide). Keep black low ponytail fair skin teal hoodie hood down charcoal pants brown shoes crisp pixels same4x2 pure magenta sheet last2empty. All six same scale. No other changes.
```

第 3 次（选中）提示词原文：

```text
Uniformly enlarge all SIX figures by exactly16percent within their existing cells. Existing opaque height254px needs292px at1774wide. Preserve each entire figure shape pose and proportions, black low ponytail fair skin teal hoodie charcoal pants brown shoes. Four columns two rows pure magenta finaltwoempty. Same pixel art no props. Keep feet at current baseline. Target same185px figure height at1122wide, not160px.
```

## claude-code-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：claude-code-c.png、claude-code-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original claude-code pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same brown curly hair, dark skin, round-frame glasses, teal hoodie hood down charcoal pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair hoodie back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## codex-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：codex-b.png、codex-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original codex pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short gray-white hair, fair skin, black rectangular glasses, ivory button-up shirt navy pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height190px (standing217px, ratio0.88), head width110px (standing110px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## codex-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：codex-c.png、codex-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original codex pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same black shoulder-length hair, dark skin, black rectangular glasses, ivory button-up shirt navy pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height190px (standing217px, ratio0.88), head width110px (standing110px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## n8n-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：n8n-b.png、n8n-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original n8n pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same reddish-brown buzz cut, over-ear headphones, warm peach skin, bright orange vest over cream short sleeves charcoal pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair vest back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## n8n-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：n8n-c.png、n8n-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original n8n pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same blonde hair in a bun, fair skin, bright orange vest over cream short sleeves charcoal pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair vest back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## script-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：2；选中第 2 次。实测尺寸：1774×887。参考图：script-b.png、script-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（未选）提示词原文：

```text
Use case: identity-preserve. Reference image is original script pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same blue baseball cap worn BACKWARDS with brim behind head, dark skin, short dark brown hair, mustard short-sleeved shirt navy pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width99px (standing99px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

第 2 次（选中）提示词原文：

```text
Edit ONLY CAPS on three BACK-facing seated figures: row1column4,row2column1,row2column2. These three must wear BACKWARDS baseball caps, so remove adjustment opening from back of cap and draw blue brim extending toward viewer behind head on its lower-left/back side. Front3 already correct backwards caps unchanged. Keep dark skin mustard shirt navy trousers brown shoes poses scale all pixels outside caps unchanged. 4x2 magenta six figures last2empty.
```

## script-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：script-c.png、script-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original script pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same blue baseball cap worn forwards, long BLACK hair tied out through back of cap, warm peach skin, mustard short-sleeved shirt navy pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width99px (standing99px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## custom-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：custom-b.png、custom-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original custom pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short silver-gray hair, thin-frame glasses, warm peach skin, burgundy casual sweater khaki pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair sweater back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width97px (standing97px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## custom-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：custom-c.png、custom-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original custom pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same long chestnut wavy hair, fair skin, burgundy casual sweater khaki pants brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair sweater back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width97px (standing97px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## gemini-a-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：gemini-a.png、custom-seated.png（坐姿比例）。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original gemini pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same dark brown bob haircut, warm peach skin, light lavender knitted cardigan over white T-shirt light gray trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair cardigan back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## gemini-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：gemini-b.png、gemini-a.png、gemini-a-seated.png（未归一候选）。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original gemini pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short BLACK hair, DARK BROWN skin, light lavender knitted cardigan over white T-shirt light gray trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair cardigan back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## gemini-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：gemini-c.png、gemini-a.png、gemini-a-seated.png（未归一候选）。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original gemini pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short hair with PINK highlights, fair skin, light lavender knitted cardigan over white T-shirt light gray trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair cardigan back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## opencode-a-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：opencode-a.png、claude-code-seated.png（坐姿比例）。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original opencode pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same messy short dark brown hair, warm peach skin, black T-shirt olive green cargo trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair T-shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## opencode-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：opencode-b.png、opencode-a.png、opencode-a-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original opencode pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same BALD head with full beard, DARK BROWN skin, black T-shirt olive green cargo trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair T-shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## opencode-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：opencode-c.png、opencode-a.png、opencode-a-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original opencode pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same long dark brown hair with a GREEN HEADBAND, warm peach skin, black T-shirt olive green cargo trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair T-shirt back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## droid-a-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：droid-a.png、claude-code-seated.png（坐姿比例）。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original droid pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short black hair, warm peach skin, light gray industrial one-piece work coveralls with orange collar and plain flat back, brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair plain coverall back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## droid-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：droid-b.png、droid-a.png、droid-a-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original droid pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short RED hair, FAIR skin, light gray industrial one-piece work coveralls with orange collar and plain flat back, brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair plain coverall back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## droid-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：droid-c.png、droid-a.png、droid-a-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original droid pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short black hair, warm peach skin, safety goggles pushed onto FOREHEAD above eyes, light gray industrial one-piece work coveralls with orange collar and plain flat back, brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair plain coverall back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height184px (standing209px, ratio0.88), head width105px (standing105px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## cursor-a-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：cursor-a.png、custom-seated.png（坐姿比例）。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original cursor pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short BLACK hair with charcoal highlights, warm peach skin, black TURTLENECK sweater dark gray trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair turtleneck back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## cursor-b-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：cursor-b.png、cursor-a.png、cursor-a-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original cursor pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same short BLOND hair, FAIR skin, black TURTLENECK sweater dark gray trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair turtleneck back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

## cursor-c-seated.png（W92b）

用途：四分之三 front/back 坐姿与打字六帧，4×2，末两格空白。生成次数：1；选中第 1 次。实测尺寸：1774×887。参考图：cursor-c.png、cursor-a.png、cursor-a-seated.png。

整图最近邻归一到 1122×561 后，六帧统一系数 0.90 等比缩放，每格水平居中、保持原底边；最终 1122×561。不量化、不转色、不重绘。

第 1 次（选中）提示词原文：

```text
Use case: identity-preserve. Reference image is original cursor pixel worker atlas, use first standing row and third right-facing row as exact head/torso scale and identity reference, fifth row as bent-leg reference. Create replacement seated supplement ONLY, exactly FOUR columns x TWO rows, uniform pure #FF00FF background, requested1122x561. Six figures, last two cells empty. Crisp square pixel art same BLACK BRAIDED hair, DARK BROWN skin, black TURTLENECK sweater dark gray trousers brown shoes. THREE-QUARTER oblique view, NOT straight front or straight back. Row1: sit/front body turned 45degrees toward viewer's LOWER RIGHT showing face chest one shoulder and horizontal bent thighs; typing/front same direction arms forward at keyboard height; typing/front alternate hands slightly higher; sit/back turned45degrees away toward UPPER RIGHT showing back hair turtleneck back and one shoulder. Row2: typing/back same upper-right orientation arms forward; typing/back alternate; EMPTY; EMPTY. No furniture keyboard shadows text lines. At1122x561 each figure opaque height176px (standing200px, ratio0.88), head width100px (standing100px). Preserve FULL standing head and torso size; shorten ONLY legs into visibly bent seated thighs and short shins. Do not shrink whole head or torso, no squat tiny bodies. Figure feet local y250, top66. Same scale all six, ample magenta margins. Exact two-to-one sheet aspect. Only new seated supplement, do not reproduce original five rows.
```

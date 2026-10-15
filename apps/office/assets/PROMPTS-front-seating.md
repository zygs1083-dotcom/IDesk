# W67 正面四向坐姿与角色量化

使用 Codex 内置 image_gen，2026-10-15。全部新图为 4×2，品红底，单元格与原 4×5 图一致；行序：sit/down、typing/down/0、typing/down/1、sit/up；第二行 typing/up/0、typing/up/1、空、空。走路、侧坐、四分之三与礼仪 upright 原图及帧名保留到 W68。

按负责人本轮更新，角色只做全调色板 RGB 最近色量化与 alpha 二值化，不调用 cleanIsolated，保留眼睛高光、眼镜反光、纽扣等有意的单像素细节。运行时 id 色相偏移不变。36 色沿用 W64，不重新生成调色板。

## 生成与规范化

所有新生成候选实际均为 1774×887，请求 1122×561（后续编辑沿用实际尺寸）；选中图先整图最近邻变为 1122×561，再用 spriteCells 切六格，每张使用下表唯一系数最近邻等比重采样，水平居中，脚底统一局部 y=245，品红背景。只在原图阶段调整；图集切帧后六姿态与走路、旧坐姿使用相同缩放系数，无单帧缩放。未手工修像素。头宽测量为不透明框上半部的横向跨度，站姿取 walk/down/0；完整六帧及世界像素数据见 assets/probe/front-seating-measurements.json。

| kind | 生成次数 / 选中 | 原图系数 | 最终尺寸 |
| --- | --- | --- | --- |
| claude-code | 2 / 2 | 1.05 | 1122×561 |
| codex | W64 2 / 2，本次 0 | 1.00 | 1122×561 |
| n8n | 3 / 3 | 0.985 | 1122×561 |
| script | 4 / 4 | 0.94 | 1122×561 |
| custom | 2 / 2 | 1.04 | 1122×561 |
| receptionist | 2 / 2 | 1.05 | 1122×561 |

codex 直接 git mv 已确认的 raw/probe/codex-seated-front.png 到 raw/codex-seated-front.png，内容不变；W64 原始生成与完整提示词仍见 [PROMPTS-furniture.md](PROMPTS-furniture.md#codex-正面坐姿)。其余角色第一次引用各自原始走路图和 codex 探针作为姿态参考，后续引用前一次对应候选。claude-code、n8n、custom、礼仪首轮偏高，第二次缩小；script 第三次修正 top-right 朝向，第四次抬手；n8n 第三次抬手，未放宽比例标准。

## 原图比例（最终选择）

| kind | pose | 站高 | 坐高 | 比值 | 站头宽 | 坐头宽 | 头宽差 | 系数 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| claude-code | sit/down | 209 | 184 | 0.8804 | 105 | 107 | +1.90% | 1.05 |
| claude-code | sit/up | 209 | 184 | 0.8804 | 105 | 104 | -0.95% | 1.05 |
| codex | sit/down | 217 | 191 | 0.8802 | 110 | 107 | -2.73% | 1 |
| codex | sit/up | 217 | 191 | 0.8802 | 110 | 108 | -1.82% | 1 |
| n8n | sit/down | 200 | 174 | 0.8700 | 100 | 96 | -4.00% | 0.985 |
| n8n | sit/up | 200 | 174 | 0.8700 | 100 | 94 | -6.00% | 0.985 |
| script | sit/down | 201 | 178 | 0.8856 | 99 | 102 | +3.03% | 0.94 |
| script | sit/up | 201 | 174 | 0.8657 | 99 | 102 | +3.03% | 0.94 |
| custom | sit/down | 200 | 176 | 0.8800 | 97 | 99 | +2.06% | 1.04 |
| custom | sit/up | 200 | 176 | 0.8800 | 97 | 98 | +1.03% | 1.04 |
| receptionist | sit/down | 224 | 196 | 0.8750 | 118 | 110 | -6.78% | 1.05 |
| receptionist | sit/up | 224 | 196 | 0.8750 | 118 | 110 | -6.78% | 1.05 |

## 完整提示词（每节按实际调用顺序）

### claude-code

第 1 次：
```text
Create a production pixel sprite supplement ONLY for the teal hoodie claude-code character from FIRST reference. SECOND reference is exact seated pose and sheet layout guide. Output 1122x561, FOUR columns TWO rows, pure #FF00FF background, six figures final two cells empty. First reference same spiky brown hair, teal hoodie hood down, charcoal trousers brown shoes, no glasses. Row1 straight DOWN sit hands raised in front at desk height / DOWN typing low / DOWN typing alternate / straight UP back sit. Row2 UP back typing / UP back typing alternate / EMPTY / EMPTY. Match codex poses precisely, but claude identity. Front shoulders symmetrical body square to audience and BOTH hands raised near chest bottom at imaginary tabletop, not in lap. Back elbows slightly spread showing hoodie back and back of hair no face. Short folded knees, short shins, never standing straight legs. At 1122-wide sheet EACH figure opaque height184px and head width105px, matching first reference standing head. Feet local y245 top61, centered x140,421,701,982. If output larger, scale all measurements proportionally. Same scale all six figures, generous magenta margins. Crisp square pixel art dark outline three tone shading same pixel density as references. No furniture keyboard text shadows grid or labels.
```

第 2 次：
```text
Uniformly reduce ALL six complete pixel figures by exactly10 percent within their existing cells, preserving all proportions poses colors identities and hands exactly. Current figures 333px tall at1774wide sheet should become300px tall, headwidth190px should become171px. More empty pure #FF00FF magenta margins. Keep4columns2rows final2empty, exact same teal hoodie brown hair charcoal pants shoes, no props text or shadows. Do not change head-to-body ratio. Output1774x887, six same sized smaller seated figures with raised hands and short folded legs.
```

### n8n

第 1 次：
```text
Create ONLY a new n8n pixel character seated supplement. First reference identity: short brown hair bright orange vest cream short sleeves charcoal trousers brown shoes. Second reference EXACT pose layout scale guide, replace codex identity with n8n, no glasses. FOUR columns TWO rows pure #FF00FF, six figures final two empty. Requested1122x561. Row1 straight DOWN sit BOTH hands raised to front tabletop height / DOWN typing hands low / DOWN typing alternate / straight UP back sit elbows slightly spread. Row2 UP back typing / UP back typing alternate / EMPTY / EMPTY. Front body square to audience shoulders symmetrical, hands chest-bottom height not lap. Back only hair and vest back no face. Folded knees broad lap short shins, no straight standing legs, same seated pose as codex. Each figure at1122wide MUST be176px total opaque height head100px wide; standing original200px height. At1774wide target height278px head158px. All six identical scale with generous margins. Crisp square pixel art same dark outlines and simple shading as references. No furniture text shadow grid keyboards or extra figures.
```

第 2 次：
```text
Correct ONLY figure size consistency. At1774x887 ALL SIX seated n8n figures must be exactly280px high headwidth158px, same scale across both rows. Current figures315to326px too tall. Shrink whole figures uniformly about12 percent with more empty pure#FF00FF magenta space, retain orange vest cream sleeves brown hair charcoal pants shoes, raised hands, seated short folded legs and same poses. FOUR columns TWO rows finaltwoempty. Do not alter proportions or identity. No furniture text shadows.
```

第 3 次：
```text
Edit ONLY the ARMS AND HANDS of first THREE front-facing n8n orange vest seated figures. Bend elbows and raise BOTH hands upward by about25px at1774wide image, hands should be at bottom of chest (lower vest), not resting on knees. Match typing with fists held in front at imaginary desktop height. Keep head torso legs shoes scale positions and all back figures unchanged. 4columns2rows sixfigures pure#FF00FF lasttwoempty. No furniture text shadows. Strictly preserve overall opaque figure height280px at1774wide and head154px, do not enlarge figures.
```

### script

第 1 次：
```text
Create ONLY script seated pixel supplement. First reference identity blue baseball cap brown hair mustard short sleeved shirt navy trousers brown shoes no glasses. Second reference exact seated poses and grid. FOUR columns TWO rows six figures finaltwoempty pure#FF00FF. Requested1122x561. Row1 DOWN straight symmetrical sitting BOTH hands raised in front tabletop height / DOWN typing / DOWN typing alternate / UP straight back sitting elbows slightly spread. Row2 UP typing / UP typing alternate / EMPTY / EMPTY. Back cap and shirt no face. Short folded knees broad lap tiny shins, not standing legs. SAME SIZE ALL SIX. At1774x887 output target height280px head156px; at1122wide opaque height177px head99px. First reference standing201px head99px, seated0.88height headunchanged. Plenty magenta margins not oversized. Exact identity crisp square pixel art dark outline upperleftlight simple shading. No furniture text shadow keyboard lines.
```

第 2 次：
```text
Correct this script seated sheet. SIX FIGURES MUST HAVE IDENTICAL total height and headwidth across both rows. Current first four too tall. At1774x887 each total opaque height280px headwidth156px. Reduce first four from342px tall to280px, reduce lasttwo from315px to280px, but headwidth current174px reduce to156px. Shorten lower body more by folding knees to tiny shins, maintain cap head and torso. Pure#FF00FF fourcolumns tworows finaltwoempty, same straight front3 / straight back3 poses, front hands raised tabletop height. Blue cap mustard shirt navy pants brown shoes no glasses. Crisp pixel art no props shadows text lines.
```

第 3 次：
```text
Fix ONLY TOP ROW FOURTH CELL orientation. This character MUST face completely AWAY from audience: show back of blue baseball cap with rear adjustment strap, back of brown hair, back of mustard shirt, elbows slightly spread. NO FACE, NO EYES, NO FRONT CAP BRIM in top right figure. Match bottom row back-facing characters. Preserve SAME total figure size as top row firstthree. Keep other FIVE figures EXACTLY unchanged including scale and poses and pixel art identity and magenta background4columns2rows finaltwoempty. No props shadows text.
```

第 4 次：
```text
Edit ONLY ARMS AND HANDS first THREE front-facing script seated figures. Bend elbows strongly and raise BOTH hands25px upward at1774wide to bottom of CHEST halfway up mustard shirt, not on knees. Fists should be near lower chest at imaginary desktop height. Keep head torso legs shoes scale positions and back figures unchanged, back faces away NOFACE. Same4columns2rows sixfigures finaltwoempty pure#FF00FF. Preserve overall figureheight295px head171px at1774wide, do not enlarge figures. No furniture text shadows.
```

### custom

第 1 次：
```text
Create ONLY custom seated pixel supplement using first reference identity burgundy sweater white collar khaki trousers brown shoes short brown hair NO glasses. Second reference exact pose/layout. FOUR columns TWO rows six figures finaltwoempty pure#FF00FF. Requested1122x561. Row1 DOWN straight symmetrical sit both hands raised to front tabletop height / DOWN typing / DOWN typing alternate / UP straight back sitting elbows slightly spread. Row2 UP typing / UP typing alternate / EMPTY / EMPTY. Back only hair sweater no face. All SIX identical figure scale. At1774x887 output each figure opaque height278px head154px; normalized1122wide totalheight176px head97px, standing200px. Folded knees broad lap short shins as codex, no straight standing legs. Large empty margins. Pixel art same crisp dark square outlines simple upperleft shading. No furniture text shadow grid keyboard.
```

第 2 次：
```text
Uniformly shrink ALL six complete custom figures by exactly10percent within same cells, preserve identical proportions poses identity headbody ratio. Current at1774wide height320px head181px should become288px head163px. More empty pure magenta around figures. Burgundy sweater white collar khaki trousers brown shoes short brownhair. Fourcolumns tworows sixfigures finaltwoempty. Same seated foldedlegs raisedhands straight front3 back3. No objects text shadows.
```

### receptionist

第 1 次：
```text
Create ONLY receptionist seated pixel supplement using first reference identity woman navy blazer white blouse red neck scarf darkbrown hair neat bun navy trousers dark shoes NO GLASSES. Second reference EXACT seated poses/layout but preserve woman identity. FOUR columns TWO rows six figures finaltwoempty pure#FF00FF. Requested1122x561. Row1 DOWN straight symmetrical sitting BOTH hands raised front tabletop height / DOWN typing / DOWN typing alternate / UP straight back sitting elbows slightly spread. Row2 UP typing / UP typing alternate / EMPTY / EMPTY. Back only bun hair navy jacket no face. All SIX same figure height and headwidth. At1774x887 output total opaque height312px head187px; at1122wide height197px head118px (standing224px head118). Bent knees broadlap short shins as codex not standing straightlegs, head and torso same size as original. Large clear magenta margins. Crisp square pixel art dark outlines simple shading upperleftlight. No furniture text shadows grid keyboard.
```

第 2 次：
```text
Uniformly shrink ALL six complete receptionist figures by exactly10percent inside same cells preserving proportions poses outfit hair headbody ratio. Current1774wide figures350px should become315px high, head190px should become171px. All6 equalheight. Keep navy blazer white blouse RED scarf bun darktrousers dark shoes NO GLASSES. Straight front3 raised hands chestbottom tabletop height and short folded seated legs, back3 elbows spread. Fourcolumns tworows finaltwoempty pure#FF00FF generous margin. No text furniture shadows.
```

## 重建与比较

运行 `pnpm --filter office sprites`：183 帧（五种智能体各31，礼仪28），保留旧帧并新增每种6帧；全图只含36色与全透明。脚本摘要打印全图不透明像素加权 RGB 距离均值、P95；数据为 assets/probe/front-seating-error.json。

运行 `node apps/office/tools/seating-preview.mjs`：复用 probe 的 objects、assertSorting 和 composeObjects，输出 25 个座位实例及比例数据。front-seating@3x.png 左上至右下依次 claude-code、codex、n8n、script、custom、礼仪；每组左列 sit、右列 typing，上排朝下笔记本桌，下排朝上显示器桌，最下方礼仪前台。

front-seating-before-after@3x.png 同样每种一行，列依次站原色/量化、sit/down 原色/量化、sit/up 原色/量化；front-seating-face-<kind>@6x.png 每种单独放大正坐头部，左原色右量化，重点检查眼睛与轮廓。量化只映射颜色，不删除不透明像素或填补单像素细节。

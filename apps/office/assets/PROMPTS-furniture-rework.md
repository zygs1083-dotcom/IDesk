# W66 返工素材生成记录

使用 Codex 内置 image_gen；所有原图在 raw/furniture/ 下，量化、cleanIsolated 与最近邻重采样仍走 furniture.mjs，没有手工修图。矮柜和门垫各生成 1 次、选第 1 次；会议桌和茶几各生成 2 次、选第 2 次。会议桌沿用 192×98 目标尺寸与全部 sortY；柜子 64×44 作为打印机、咖啡机共有底件，机器在相同 sortY 下 bias=1；茶几 96×40；门垫 64×24，不挡路。门沿用既有原图，清单改为 64×64、wall 层，嵌入两行北墙。

## meeting-table-rework

```text
Production low resolution JRPG office furniture sprite, pure solid vivid MAGENTA #FF00FF background with margins. Straight FRONT slightly top-down, ALL edges horizontal or vertical, no perspective vanishing points, no trapezoid, no isometric, no visible side face. Warm brown #30231F one gamepixel silhouette outline. Exactly three solid oak shades #805439 #C99962 #E8B94E. No gradients, texture noise, dithering, soft shadows, text, letters, people or props. A wide EMPTY meeting table. Exact RECTANGULAR desktop, straight parallel top and bottom edges SAME width, perfectly VERTICAL left and right edges, square90degree corners. Desktop is a shallow rectangular solid plank. Vertical rectangular legs below left and right corners, simple horizontal apron underneath front edge. Intended192px wide98px tall including table legs; tabletop top third of sprite. Match frontal rectangular RPG office desks, NOT real perspective rendering.
```

## cabinet

```text
Production low resolution JRPG office furniture sprite, pure solid vivid MAGENTA #FF00FF background with margins. Straight FRONT slightly top-down, ALL edges horizontal or vertical, no perspective vanishing points, no trapezoid, no isometric, no visible side face. Warm brown #30231F one gamepixel silhouette outline. Exactly three solid oak shades #805439 #C99962 #E8B94E. No gradients, texture noise, dithering, soft shadows, text, letters, people or props. A low wide warm oak office CABINET with flat rectangular top shelf, two closed plain doors and small rectangular handles, short plinth. Intended64px wide44px tall. Front perfectly symmetrical, all outline corners90degrees. This will support a printer or coffee appliance on top; draw ONLY cabinet, no machine.
```

## coffee-table

```text
Production low resolution JRPG office furniture sprite, pure solid vivid MAGENTA #FF00FF background with margins. Straight FRONT slightly top-down, ALL edges horizontal or vertical, no perspective vanishing points, no trapezoid, no isometric, no visible side face. Warm brown #30231F one gamepixel silhouette outline. Exactly three solid oak shades #805439 #C99962 #E8B94E. No gradients, texture noise, dithering, soft shadows, text, letters, people or props. A low rectangular warm oak COFFEE TABLE with plain empty rectangular top and four short straight vertical legs, front elevation with top visible as a simple RECTANGLE, same width along top and bottom. Intended96px wide40px tall, waist lower than office desks. NO perspective or tapered tabletop.
```

## doormat

```text
Production low resolution JRPG office furniture sprite, pure solid vivid MAGENTA #FF00FF background with margins. Straight FRONT slightly top-down, ALL edges horizontal or vertical, no perspective vanishing points, no trapezoid, no isometric, no visible side face. Warm brown #30231F one gamepixel silhouette outline. Exactly three solid oak shades #805439 #C99962 #E8B94E. No gradients, texture noise, dithering, soft shadows, text, letters, people or props. A small flat rectangular woven warm taupe DOORMAT viewed straight down, intended32px wide24px high. Simple solid beige center and dark brown rectangular border with one lighter inset rectangular band. Only three flat beige shades #B5A083 #D8C8A7 #F6E9CE and warm dark brown outline. No fibers noise letters symbols or welcome text.
```



## 矩形桌面的第二次生成

会议桌与茶几各生成 2 次，选中第 2 次；第 1 次仍有透视斜边，保留为 meeting-table-rework-attempt-1.png 与 coffee-table-attempt-1.png。第二次分别引用各自第 1 次原图，使用以下同一条完整编辑提示词：

```text
Precise edit target: the supplied table sprite. KEEP all legs, horizontal apron, total height, colors, magenta backdrop and material style. Change ONLY THE TOP SURFACE OUTLINE from trapezoid to a PERFECT MATHEMATICAL RECTANGLE: extend both TOP corners horizontally OUTWARD until they are exactly vertically above the BOTTOM corners. Left edge of yellow top plane must be STRICTLY VERTICAL, right edge STRICTLY VERTICAL, no diagonal, no taper, no bevelled corner. Every horizontal scanline through the yellow tabletop must have EXACT SAME width. The yellow tabletop must look like an unambiguous wide rectangular yellow sign, four90degree corners, bounded by two vertical lines and two horizontal lines. It is a 2D orthographic game sprite, deliberately unrealistically FLAT tabletop projection. Do not shrink bottom edge, increase TOP edge width to match bottom. ALL tabletop edges use horizontal/vertical lines ONLY. Do not add text people props shadows or new details. Pure magenta outside silhouette.
```

## 原图实测尺寸

| 文件 | 宽×高 |
| --- | --- |
| meeting-table-rework.png | 1755×896 |
| cabinet.png | 1513×1039 |
| coffee-table.png | 1942×809 |
| doormat.png | 1448×1086 |

# W64 家具与正面坐姿生成记录

使用 Codex 内置 image_gen，所有原图均入库。原图的品红底有偏差，流水线复用 `sprite-cells.mjs` 的 RGB 距离 60 抠色与单遍去边，不复制实现。所有成品最后最近邻缩放、RGB 最近色量化、alpha 二值化。

## 家具

生成次数 3，选中第 3 次。三次实测均为 1448×1086（请求 1536×1152，编辑沿用实际尺寸），4×3，每格 362×362。第 1 次 `raw/furniture/office-sheet.png`；第 2 次 `office-sheet-flat.png`；选中 `office-sheet-corrected.png`。完整提示词按顺序如下；第 2 次引用第 1 次，第 3 次引用第 2 次。

```text
Create a production pixel-art sprite sheet on solid #FF00FF magenta. 4 columns x 3 rows, perfectly equal cells, requested 1536x1152. Straight-on slightly top-down JRPG office furniture, all axes horizontal vertical, NEVER isometric. Each object centered isolated generous margins. Crisp actual low-resolution pixels, one dark warm brown outline, maximum three flat shades per material, top-left light, NO gradients NO noise NO soft shadows NO text. Consistent target world scale 32px tiles; images will downsample. Row1: 64x68 world-pixel oak desk with monitor facing away from viewer (back of monitor visible, for worker below facing up); same oak desk with low open laptop facing viewer (worker above facing down); 96x60 wooden reception counter with solid front hiding legs; 64x88 oak bookshelf full of simple colored books. Row2: padded dark teal office chair facing DOWN toward viewer; same chair facing UP away from viewer; chair facing LEFT; chair facing RIGHT. Each chair world size32x56, seat back to seated shoulder blade. Row3: leafy plant in terracotta pot world32x60; blank rectangular wood wall name plaque world64x24 completely empty cream center; EMPTY MAGENTA; EMPTY MAGENTA. NO people. Flat natural warm wood, cream, moss green, muted blue, darkest warm brown. Pixel density must match each item and clear simple silhouettes.
```

```text
Edit this sprite sheet, preserve EXACT composition, 4 columns x3 rows, all objects same positions and orthogonal orientations, magenta backdrop. SIMPLIFY ALL PIXEL ART MATERIALS to EXACTLY THREE FLAT SOLID SHADES per material. Remove ALL speckles, ALL dithering, ALL noise, ALL wood grain, ALL subtle gradients and realistic reflections. Large uninterrupted FLAT blocks of color only. Make each object's outline one uniform dark warm brown pixel at final game resolution. This is very low-resolution JRPG pixel art to be reduced to desks64px wide chairs32px wide. Each wood object uses ONLY deep brown outline, medium oak shadow, light golden oak fill and cream thin top highlight. Chair cushions use ONLY dark teal and medium teal plus one light edge. Plant uses ONLY three greens and two terra-cotta colors. Books plain flat colored spines, no lettering. Metal grey only3 flat shades. Leave plaque empty. No text shadows people new props. Preserve monitor back and laptop front and4 chair directions. Hard square pixels no antialiasing.
```

```text
Precise pixel-art edit, keep4columns3rows sheet positions and all furniture sizes magenta background exact. Correct only first two desks and simplify reception: Row1col1 MONITOR must show FRONT screen facing viewer, flat blue screen with dark brown bezel and simple stand. Row1col2 LAPTOP must face AWAY from viewer toward worker sitting NORTH of desk: we see the plain BACK of the thin open lid, NOT the screen, and only a small flat base. Laptop very small, about ONE HALF current laptop height, and placed on SOUTH half of desktop nearest viewer. Keep empty NORTH/back edge of desktop for the worker hands; laptop must never reach to the top of desk. Row1col3 counter front perfectly flat solid orange-oak fill, NO grain NO speckles NO gradient NO texture; straight large rectangle with darker bottom plinth and side outline only. Rest objects unchanged. All wood3 flat tones only, no gradients no noise no text. Orthogonal square-pixel JRPG art no isometric angle.
```

清单按原图单元格切割，再以不透明包围盒缩放到目录尺寸。桌椅最终尺寸见清单；显示器桌64×64、笔记本桌64×52、椅子32×40、前台96×52。坐垫与扶手按 behind/front 互补像素掩码分开，无重复像素。正背椅子占地2×1、seat.x=32、精灵dx=16；侧椅1×1。所有椅子 blocks=false。

## codex 正面坐姿

生成次数 2，选中第 2 次。两次实际均为1774×887，请求1122×561，4×2；先最近邻变成1122×561，和原 codex 原图单元格一致。第 1 次 `raw/probe/codex-generated.png` 引用 `raw/codex.png`；第 2 次 `codex-hands-raised.png` 引用第 1 次经0.91（前四格）/0.96（后两格）缩放、居中底边对齐后的补图。最终选中第2次，无额外人物缩放（系数1.00，在0.90–1.12范围内），规范化结果 `codex-seated-front.png`。

```text
Use case identity-preserve. This original Codex sprite atlas is REFERENCE ONLY for character identity and scale. Create ONLY a new supplement 4 columns x2 rows pure #FF00FF magenta background, requested1122x561. Each cell280.5px square. Six identical workers with black rectangular glasses, short dark brown hair, cream button shirt navy trousers brown shoes. EXACT orthogonal FRONT facing DOWN directly toward viewer or BACK facing UP directly away, NO three-quarter angle, NO side angle. Row1: sit/down; typing/down/0 hands forward together at waist desk height; typing/down/1 hands slightly raised; sit/up showing back hair shirt elbows slightly out. Row2: typing/up/0; typing/up/1; EMPTY MAGENTA; EMPTY MAGENTA. Standing reference first sprite opaque height218px headwidth110px. Each seated sprite MUST opaque height191px (0.875 standing) headwidth110px unchanged. Visibly bent knees, broad horizontal lap and short vertical shins. Preserve standing head and torso, shorten only legs. Feet baseline local y245. Same low-resolution crisp square pixels, darkest warm brown one art-pixel outline, max3 flat tones per material, no gradients no texture noise no blur. No furniture keyboard chairs shadows text or grid. Sheet two-to-one aspect ratio. Match reference pixel scale.
```

```text
Edit this 4x2 pixel character sheet preserving EXACT six sprites sizes, head widths, feet baselines and front/back orientations, magenta background and two empty cells. Change ONLY the ARMS AND HANDS: all three FRONT facing figures in row1 cells1,2,3 must hold BOTH hands forward together at the bottom of the SHIRT above trousers, palms visible, elbows bent outward, like actively typing on an invisible desktop at WAIST height. Both hands need to be 15 pixels HIGHER (at1122 sheet scale) than current low hands, so visible when desk hides everything below shirt hem. sit/down first figure also hands forward on invisible desktop. For BACK row1cell4 and row2cells1,2 keep back head shirt feet exact, hands raised a little at waist. No chair desk keyboard, no additional objects, no text. No side angle. Crisp pixel art max3flat tones material. Preserve identity glasses brown hair cream shirt navy trousers brown shoes. Exact4x2 layout lasttwoempty.
```

规范化复现（仓库根执行；不量化原图，量化发生在探针合成前）：

```js
// 保存为 apps/office/tools/normalize-local.mjs 执行，执行后删除。
import { PNG } from "pngjs";
import { readPng, resize, savePng, paste } from "./furniture.mjs";
import { spriteCells } from "./sprite-cells.mjs";
const names = ["sit/down", "typing/down/0", "typing/down/1", "sit/up",
  "typing/up/0", "typing/up/1"];
const source = resize(readPng("assets/raw/probe/codex-hands-raised.png"),1122,561);
const cells = spriteCells(source,2,names,"probe");
const result = new PNG({width:1122,height:561});
for(let p=0;p<result.data.length;p+=4) result.data.set([255,0,255,255],p);
for(let i=0;i<6;i++) {
  const png=cells[i].png;
  const x=Math.round((i%4+.5)*1122/4-png.width/2);
  const y=Math.round(Math.floor(i/4)*561/2+245-png.height);
  paste(result,png,x,y);
}
savePng("assets/raw/probe/codex-seated-front.png",result);
```

原图站高217、头宽110；选中六帧高191（88.02%），上半身头宽依次107、106、107、109、115、115（差值-3.64%至+4.55%）。原图阶段之外没有单独坐姿缩放；探针采用原 codex 站姿94/217的统一密度，64×96框底边居中，实际坐高83。

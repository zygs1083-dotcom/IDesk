# W66 家具生成记录

使用 Codex 内置 image_gen；没有手工修图。下列提示词均为实际调用原文，第一轮打印机、咖啡机和高盆栽缺少共用前缀（出现 undefined），因背景和朝向不合格弃用，第二轮使用完整独立提示词。品红抠除、包围盒裁剪、最近邻重采样、材质量化和 cleanIsolated 都由 furniture.mjs 执行；chair-right 不生图，镜像 chair-left 及其两个互补掩码。

## meeting-table

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. Create one production JRPG office furniture sprite: a wide rectangular warm oak meeting table, six seats capacity, EMPTY table no chairs no people no props. Straight orthogonal FRONT slightly top-down view, horizontal and vertical axes, NEVER isometric or angled. Intended game sprite 192px wide x98px tall, footprint6x2 of32px tiles, top plane about 55px deep, waist-high warm oak apron with legs at corners, room for feet underneath. Pure solid #FF00FF background with generous margins. Crisp low resolution square pixels with uniform one game pixel darkest warm brown #30231F outline. ONLY3 flat oak tones #805439 #C99962 #E8B94E. No gradients noise grain shadows text or antialiasing. Table symmetric front elevation, plain empty desktop, all edges horizontal.
```

## chair-left

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Dark teal padded office swivel chair facing strictly LEFT profile, backrest on RIGHT, seat extends to LEFT, small armrest foreground. Intended32px wide44px tall. Substantial chair proportional to seated chibi94px standing high, back reaches shoulderblade44px above ground. Back and seat dark teal #315641 #286568 #4B8B87, metal #263343 #46596B #718B99. Solid flat panels, symmetrical side elevation.
```

## glass-wall

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. A SINGLE horizontal glass office partition modular segment, intended32px wide64px high, simple rectangular framed panel with no feet projecting sides, can tile side by side. Use ONLY flat opaque light blue #718B99 #A8C5C7 and white highlight, dark warm brown outline. No actual transparency; express glass by two light blue bands and one white diagonal reflection.
```

## glass-wall-v

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. A SINGLE vertical north-south floor-aligned glass office partition segment viewed front slight top-down. Narrow side visible and pane extending back on ground north, intended12px wide64px high, footprint32x32. Flat opaque light blue #718B99 #A8C5C7 white reflection with dark warm brown outline, no transparency.
```

## sofa

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Warm moss teal TWO-seat office sofa facing DOWN toward viewer, intended96px wide56px high, footprint3x1 tiles. Broad backrest behind seating cushion, side armrests, four short wood legs, uninterrupted seat center able to fit one chibi worker. Upholstery3 flat shades #394B45 #52685A #708473, wood #805439 #C99962 #E8B94E. No pillows.
```

## coffee-machine

生成 2 次，选中第 2 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
undefinedOffice espresso coffee machine, one solid compact appliance intended32x40 gamepixels, front facing, cream metal housing with black coffee outlet above drip tray and two plain buttons, one small white mug. Metal grey3tones, cream3tones, NO text.
```

```text
Generate production GAME SPRITE of compact office COFFEE MACHINE on pure vivid MAGENTA #FF00FF background not white grey. STRAIGHT FRONT elevation, symmetrical, no angled side face, never isometric. Low resolution sprite32px wide40px tall upscaled, dark warm brown one gamepixel OUTLINE. Cream housing3 FLAT colors, grey metal3FLAT colors, black outlet, one tiny cream cup, small dark drip tray. NO gradients NO noise NO reflections NO text NO shadows. Generous magenta margins.
```

## printer

生成 2 次，选中第 2 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
undefinedOffice laser printer, intended64x40 gamepixels, front paper tray with one blank white page and flat top scanner lid. Cream plastic #F6E9CE #D8C8A7 #B5A083, dark blue-grey recess #263343 #46596B #718B99. NO letters.
```

```text
Generate a production GAME SPRITE on pure vivid MAGENTA #FF00FF background, not grey not white. A compact office laser PRINTER, viewed STRAIGHT FRONT slightly from above, symmetrical horizontal rectangular front face, NO visible right or left side, never isometric. Low resolution sprite64px wide40px tall upscaled, dark warm brown one-pixel OUTLINE around whole silhouette. Three flat solid cream shades for plastic and3 flat grey shades for metal. No gradients, texture, realistic reflections, shadow, text. All axes horizontal/vertical. Plain blank sheet emerges center front. Generous margin of MAGENTA outside.
```

## plant-tall

生成 2 次，选中第 2 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
undefinedA tall broadleaf indoor office plant in terracotta pot, intended32x80 gamepixels, simple large clean blocky leaves no speckles. Leaf colors #315641 #56804A #91AB5C, pot #805439 #B57756 #CC793E.
```

```text
Generate production GAME SPRITE of a TALL POTTED OFFICE PLANT on PURE VIVID MAGENTA #FF00FF background, no white. Dark warm brown thick uniform OUTLINE around ALL leaves and terracotta pot. Simple clean broad blocky leaves with3FLAT green tones, pot3FLAT orange brown tones. Intended32x80 gamepixels enlarged, vertical plant silhouette, center with generous MAGENTA margin all around. Straight front orthogonal JRPG sprite. NO gradients NO noise NO texture NO shadows NO antialiasing.
```

## whiteboard

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
undefinedOffice task whiteboard wall decoration, intended128x64 gamepixels, wide landscape rectangle viewed directly FRONT, warm oak slim frame and large COMPLETELY BLANK cream-white writing surface, small thin bottom marker shelf. Wood #805439 #C99962 #E8B94E white #FFFFFF #F6E9CE #D8C8A7. No text no symbols no cards.
```

## clock

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Round office wall clock, intended32x32 gamepixels, cream blank dial with ONLY two simple dark hands and four unlettered tick marks, oak rim. NO numbers letters text. Warm oak3tones cream3tones.
```

## bulletin

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Office cork bulletin board wall decoration, intended64x64 gamepixels, plain warm oak outer frame and muted beige cork center with THREE blank cream paper rectangles fastened by small warm-red pins. Absolutely no writing or symbols, flat colors, no cork noise.
```

## file-tray

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Small office single INBOX file tray made of dark blue-grey metal containing flat stack of blank cream papers, intended32x18 gamepixels, FRONT slight top-down. No text, 3 grey shades3cream shades.
```

## bell

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Small reception service bell, intended20x16 gamepixels, round domed brass body with little push button on top and dark brown circular base. Only3 flat brass gold tones, no specular gradient.
```

## door

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Wooden office entrance door and frame, intended64px wide92px high, FRONT slight top-down elevation, closed plain oak door panel with one brass round handle, cream inset rectangle, thick oak frame, bottom sill. Door frame symmetrical, warm oak3tones cream3tones, no glass no text.
```

## plaque-stand

生成 1 次，选中第 1 次；原图尺寸见下表，清单写明实际裁剪框与成品尺寸。

```text
Use case: stylized-concept. One isolated production JRPG office furniture sprite, orthogonal FRONT slight top-down view, axes horizontal vertical, NEVER isometric. Pure solid #FF00FF background generous margin. Crisp very low resolution square game pixels, one gamepixel outline darkest warm brown #30231F, three FLAT solid shades per material, warm calm office. No gradients noise dithering grain soft shadows antialiasing lettering logos or people. Freestanding office nameplate on TWO short wooden legs with flat support feet, intended64px wide44px high. Plain rectangular oak frame with COMPLETELY BLANK cream center matching wall-mounted name plaque. Warm wood #805439 #C99962 #E8B94E, cream #F6E9CE #D8C8A7. FRONT slight top-down, NO letters.
```



## 实测尺寸

| 原图 | 宽×高 |
| --- | --- |
| bell.png | 1402×1122 |
| bulletin.png | 1254×1254 |
| chair-left.png | 1070×1470 |
| clock.png | 1254×1254 |
| coffee-machine-attempt-1.png | 1122×1402 |
| coffee-machine.png | 1122×1402 |
| door.png | 1048×1501 |
| file-tray.png | 1672×941 |
| glass-wall-v.png | 887×1774 |
| glass-wall.png | 887×1774 |
| meeting-table.png | 1756×896 |
| plant-tall-attempt-1.png | 793×1983 |
| plant-tall.png | 887×1774 |
| plaque-stand.png | 1513×1040 |
| printer-attempt-1.png | 1586×992 |
| printer.png | 1586×992 |
| sofa.png | 1643×957 |
| whiteboard.png | 1774×887 |

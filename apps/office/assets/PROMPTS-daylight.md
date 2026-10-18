# W98 昼夜背景生成记录

2026-10-18，使用 Codex 内置 image_gen 编辑 `assets/raw/background.png`，黄昏、夜晚各生成一次，均选中第一次结果。原图与两张结果都是 1672×941 RGB。生图是编辑原图，家具轮廓由对齐脚本复核，不将提示词当作几何保证。

## background-dusk.png

生成次数：1；选中第 1 次。

```text
Use case: lighting-weather. Edit target: supplied 1672×941 pixel-art office background for a game. Make a DUSK version by changing ONLY lighting, outdoor view, and cast shadows. Preserve exact framing, perspective, all architecture and furniture silhouettes, wall clock, plants, doors, rugs, signs, counters, desk monitors and chairs at their original pixel coordinates with ≤2 px edge movement. Warm orange low-angle sunset enters from left windows; floor window-shaped light patches become longer, more oblique, softer amber. Outside left windows show orange/pink twilight sky and darkening city. Interior lamps are only subtly beginning to glow. Keep image crisp pixel art with hard outlines and no blur. No people, letters, new furniture, rearrangement, or new openings. Output a fully opaque complete background.
```

## background-night.png

生成次数：1；选中第 1 次。

```text
Use case: lighting-weather. Edit the supplied pixel-art office background into NIGHT. Keep exactly the same composition and all architecture, furniture, plants, wall clock, doors, desks, signs, monitors, rugs and their edges at the original pixel coordinates (≤2 px edge deviation). Change illumination and view through left windows: dark blue night sky, city buildings with scattered warm lit windows, a few stars or moon. Remove every daytime window-shaped sunlight patch and long diagonal daylight shadow from the floor. Warm overhead pendants, desk lamps and lounge floor lamp illuminate localized soft pools on floors and tabletops; monitors emit subtle cool blue light. Overall readable and cozy, with rich dark brown and blue shadows, not black. Crisp outlined pixel art, no blur. No characters, text, extra furniture or structural changes. Fully opaque complete background.
```

`node apps/office/tools/daylight-align.mjs <输出 PNG>` 量了窗框、白板、挂钟、墙柜、书架、会议区、前台、四组工位、休息区、入口共 13 个结构区域的边缘图互相关偏移：黄昏最大 0px，夜晚最大 1px。检查图并排展示三张背景及同一套遮挡件轮廓。三张遮挡图集由 `pnpm --filter office occluders` 按同一套多边形和帧坐标重建。`public/background-dusk.webp` 与 `background-night.webp` 用 Pillow WebP quality 80、method 6 编码。

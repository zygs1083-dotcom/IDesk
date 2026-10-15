# 礼仪专属角色图生成记录

使用 Codex 内置 image_gen，2026-10-15。参考 codex.png、claude-code.png 的画风、头身比、像素粗细。

## receptionist.png
用途：4 列 × 5 行角色原图，19 帧；前四行下／左／右／上，站／左脚／站／右脚；第五行右侧坐／打字两帧／空。
生成次数：2；选中第 2 次。候选实测尺寸：第 1 次 1072×1467，第 2 次 1122×1402；最终 1122×1402。
缩放系数：人物统一系数 1.00；第 1 次参考图仅整图最近邻归一至 1122×1402，第 2 次尺寸已匹配。
比例：walk/down/0 高 224px，头宽 118px；codex 高 217px、头宽 110px，差 +3.23%／+7.27%。
人工检查：四方向均为深蓝外套、白衬衫、红丝巾、盘发；第 2 次移除侧身帧误带的眼镜。
完整提示词原文（第 1 次引用 codex.png、claude-code.png，第 2 次引用归一后的第 1 次）：
```text
Use case: stylized-concept. Production pixel-game character atlas. Reference images codex and claude-code are STYLE AND SCALE guides only. Create receptionist woman, navy blazer over white shirt, small RED neck scarf, dark brown hair in a neat bun, navy trousers and dark shoes. Same two-head-tall chibi proportions, head width and figure height as codex, same crisp thick dark square pixel outlines and 3-tone shading. Exactly FOUR columns and FIVE rows, equal cells, requested1122x1402. Pure #FF00FF background, no lines text shadows furniture. Standing opaque height214px and head width108px at1122-wide sheet; generous margins. Feet same local baseline y245. Row1 DOWN facing audience: stand,left foot,stand,right foot. Row2 LEFT profile: stand,left foot,stand,right foot. Row3 RIGHT profile: stand,left foot,stand,right foot. Row4 UP back: stand,left foot,stand,right foot. Row5 RIGHT profile SITTING bent knees: sit hands lap, typing hands low, typing hands raised, EMPTY MAGENTA. All19 figures same woman same bun navy jacket white shirt red scarf, identical head and torso scale. Only bend legs for sitting, no enlarged seated heads. Need exactly4x5 grid, last cell empty.
```
```text
Edit ONLY the eyes/glasses in rows TWO, THREE and FIVE of this receptionist sprite sheet. REMOVE the unintended black rectangular eyeglasses from ALL left profile, right profile and side seated figures. Replace with a single simple black pixel eye consistent with the front face in row1. Keep every other pixel unchanged: exact same19figures, 4columns5rows, bun, dark navy blazer white blouse red scarf, trousers shoes, head sizes torso sizes pixel scale positions poses and pure magenta background; bottomright empty. Rows1and4 unchanged. No glasses anywhere.
```


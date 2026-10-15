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

## receptionist-seated.png
用途：4 列 × 1 行，sit/upright、typing/upright/0、typing/upright/1、空。
生成次数：2；选中第 2 次。两次候选实测尺寸均 1983×793，整图最近邻归一至 1122×280。
缩放系数：归一后同一张原图的全部人物统一等比 1.09，最近邻重采样后放回各格，脚底固定；未缩放已量化帧或图集。
比例：站立 224px／118px；正坐 197px／128px，高度比 0.8795、头宽差 +8.47%；打字两帧分别 197px／126px、197px／127px。
第 1 次归一后头宽过宽，弃用；第 2 次只定向收窄头身，归一后高 180px、头宽 118px，统一 1.09 后达标。
人工检查：正对观众，肩膀放松，两手在身前腰部柜台高度；收腿为坐姿，没有侧身或整身压矮。
完整提示词原文（第 1 次引用归一后的礼仪第 1 次原图，第 2 次引用第 1 次补充图）：
```text
Use case: identity-preserve. Reference image is receptionist original sheet. Generate ONLY seated supplement, exactly FOUR columns by ONE row, pure #FF00FF magenta. Requested1122x280, aspect4:1. THREE same receptionist women and fourth cell completely EMPTY. Same navy blazer white blouse RED little neck scarf dark brown neat bun navy trousers dark shoes. Match original DOWN front-facing face NO glasses, same head and torso pixel scale, dark square pixel outlines, chibi2-head proportion. ALL three face STRAIGHT toward audience, shoulders level symmetrical, NO oblique or side angle. Pose1 sit upright on invisible chair, relaxed shoulders elbows bent both hands extended in front at counter-top height roughly waist. Pose2 same sit typing both hands low, pose3 same hands raised a few pixels. No actual counter chair keyboard furniture text shadows grid lines. Visibly horizontal short thighs and folded knees, tiny vertical shins below lap. At1122wide standing original is225px tall head118px, these MUST be197px tall head118px (0.875height). Keep full head and torso SAME size, shorten ONLY legs, do not shrink body. In each280.5x280 cell feet local y245, head top48, figure centered. Do not fill entire cell with huge heads; generous magenta space. All3 same size. Only upright sitting3figures plus empty4th, one row.
```
```text
Edit ONLY the proportions of the three figures in this one-row seated receptionist supplement. Keep same woman navy blazer white shirt red scarf bun, straight toward audience, same bent knees short shins hands forward at waist and typing3poses, fourthcell empty. Make each HEAD and TORSO NARROWER by22percent while retaining same vertical size; legs same height. The current head is too wide relative to original standing character. Target at1122x280 sheet opaque figure height197px headwidth118px. Entire sheet must be FOUR TIMES WIDER THAN TALL (4:1 aspect), equal four square cells, 3figures then empty. Pure magenta, hard square pixel outlines, no props text shadows. Preserve seated posture. No glasses.
```


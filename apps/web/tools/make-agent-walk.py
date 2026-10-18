import json
from pathlib import Path

from PIL import Image


web = Path(__file__).resolve().parents[1]
characters = web.parent / "office" / "public" / "characters"
atlas = Image.new("RGBA", (48 * 4, 72 * 9))

for kind_index, kind in enumerate(("claude-code", "codex", "gemini")):
    sheet = Image.open(characters / f"{kind}-a.png").convert("RGBA")
    frames = json.loads((characters / f"{kind}-a.json").read_text())["frames"]
    for direction_index, direction in enumerate(("left", "right", "down")):
        for frame_index in range(4):
            frame = frames[f"{kind}-a/walk/{direction}/{frame_index}"]["frame"]
            crop = sheet.crop(
                (
                    frame["x"],
                    frame["y"],
                    frame["x"] + frame["w"],
                    frame["y"] + frame["h"],
                )
            )
            sprite = crop.resize((48, 72), Image.Resampling.LANCZOS)
            atlas.paste(sprite, (frame_index * 48, (kind_index * 3 + direction_index) * 72))

atlas.save(web / "public" / "pixel-office" / "agent-walk.webp", "WEBP", quality=80, method=6)

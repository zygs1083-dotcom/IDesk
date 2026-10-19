import json
from pathlib import Path

from PIL import Image


web = Path(__file__).resolve().parents[1]
characters = web.parent / "office" / "public" / "characters"
index = json.loads((characters / "index.json").read_text())
output = web / "public" / "pixel-office" / "avatars"
output.mkdir(parents=True, exist_ok=True)

for kind, appearances in index.items():
    for appearance in appearances:
        name = f"{kind}-{appearance}"
        atlas = json.loads((characters / f"{name}.json").read_text())
        frame = atlas["frames"][f"{name}/walk/down/0"]["frame"]
        sheet = Image.open(characters / f"{name}.png").convert("RGBA")
        head = sheet.crop((frame["x"] + 8, frame["y"], frame["x"] + 56, frame["y"] + 48))
        head.resize((32, 32), Image.Resampling.NEAREST).save(
            output / f"{name}.webp", "WEBP", lossless=True, method=6
        )

(web / "src" / "pages" / "agents" / "avatar-index.json").write_text(
    json.dumps(index, ensure_ascii=False, indent=2) + "\n"
)

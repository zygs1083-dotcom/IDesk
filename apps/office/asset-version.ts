import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function officeAssetVersion(publicDir: string) {
  const files = readdirSync(publicDir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(publicDir, join(entry.parentPath, entry.name)).split(sep).join("/"))
    .filter((file) =>
      /^(background[^/]*\.webp|occluders[^/]*\.(png|json)|characters\/.*\.(png|json))$/.test(file),
    )
    .sort();
  const hash = createHash("sha256");
  for (const file of files) {
    const bytes = readFileSync(join(publicDir, file));
    hash.update(`${file}\0${bytes.length}\0`).update(bytes);
  }
  return hash.digest("hex").slice(0, 16);
}

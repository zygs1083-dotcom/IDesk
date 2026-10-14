import { rmSync } from "node:fs";

export default function () {
  rmSync(new URL("../.test-data", import.meta.url), { recursive: true, force: true });
}

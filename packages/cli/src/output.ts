export function output<T>(json: boolean, value: T, summary: string | string[][]): void {
  if (json) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  } else if (typeof summary === "string") {
    process.stdout.write(`${summary}\n`);
  } else {
    const rows = summary.map((row) => row.map((cell) => cell.replace(/\s+/g, " ")));
    const width = (cell: string) =>
      [...cell].reduce(
        (n, c) =>
          n +
          (/[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe10-\ufe6f\uff01-\uff60\uffe0-\uffe6]/u.test(
            c,
          )
            ? 2
            : 1),
        0,
      );
    const widths = new Map<number, number>();
    for (const row of rows) {
      row.forEach((cell, i) => {
        widths.set(i, Math.max(widths.get(i) ?? 0, width(cell)));
      });
    }
    for (const row of rows) {
      process.stdout.write(
        `${row
          .map((cell, i) => cell + " ".repeat((widths.get(i) ?? 0) - width(cell)))
          .join("  ")
          .trimEnd()}\n`,
      );
    }
  }
}

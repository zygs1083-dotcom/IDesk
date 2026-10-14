export function parseEntries(text: string, separator: ":" | "="): Record<string, string> {
  return Object.fromEntries(
    text.split("\n").flatMap((line) => {
      const index = line.indexOf(separator);
      if (index < 0 || !line.slice(0, index).trim()) return [];
      return [[line.slice(0, index).trim(), line.slice(index + 1).trim()]];
    }),
  );
}

export function entriesText(entries: Record<string, string>, separator: ":" | "="): string {
  return Object.entries(entries)
    .map(([key, value]) => `${key}${separator} ${value}`)
    .join("\n");
}

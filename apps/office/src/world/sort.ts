export type SortKey = { sortY: number; bias: number };

export function sortDrawables<T extends SortKey>(drawables: readonly T[]): T[] {
  return [...drawables].sort((a, b) => a.sortY - b.sortY || a.bias - b.bias);
}

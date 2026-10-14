export function hueOffset(id: string): number {
  const hash = [...id].reduce((value, char) => (value * 31 + char.charCodeAt(0)) | 0, 0);
  return ((hash >>> 0) % 41) - 20;
}

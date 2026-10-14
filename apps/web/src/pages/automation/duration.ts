export function duration(startedAt: string | null, finishedAt: string | null, now: number): string {
  if (startedAt === null) return "—";
  const seconds = Math.floor(
    ((finishedAt === null ? now : new Date(finishedAt).getTime()) - new Date(startedAt).getTime()) /
      1000,
  );
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分 ${seconds % 60} 秒`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}

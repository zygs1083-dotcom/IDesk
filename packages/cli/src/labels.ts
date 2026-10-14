export function formatTime(iso: string): string {
  const date = new Date(iso);
  const [month, day, hour, minute] = [
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
  ].map((value) => String(value).padStart(2, "0"));
  return `${month}-${day} ${hour}:${minute}`;
}

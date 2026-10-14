export const statusLabels = {
  open: "待领取",
  recruiting: "招募中",
  assigned: "已指定",
  in_progress: "进行中",
  paused: "已暂停",
  done: "已完成",
  cancelled: "已取消",
};

export const priorityLabels = { low: "低", normal: "普通", high: "高", urgent: "紧急" };
export const kindLabels = { note: "说明", deliverable: "成果", request: "请求", reply: "回复" };

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

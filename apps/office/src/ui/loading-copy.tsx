import { initialGlyphs } from "../stage/glyphs.ts";

export const loadingPhrases = {
  zh: [
    "老板来了，快去通知摸鱼的同事",
    "正在给咖啡机续命…",
    "打印机又卡纸了，前台正在处理",
    "正在叫醒午睡的同事",
    "工位擦干净了，键盘正在搬进来",
    "正在把需求从 v7 改回 v1",
    "会议室被占了，换个角落开会",
    "有人拿错了外卖，正在物归原主",
    "绿植浇水中，请勿踩踏",
    "正在假装很忙…",
    "周报还差最后一句",
    "电梯太挤，小人改走楼梯",
  ],
  en: [
    "The boss is coming — go warn the slackers",
    "Reviving the coffee machine…",
    "Printer jammed again, reception is on it",
    "Waking up the nap squad",
    "Desks wiped, keyboards on the way",
    "Rolling the spec back from v7 to v1",
    "Meeting room taken, finding a corner",
    "Returning someone's misdelivered lunch",
    "Watering the plants, mind your step",
    "Pretending to look busy…",
    "One more line on the weekly report",
    "Elevator's packed, taking the stairs",
  ],
};

export function LoadingCopy({ text }: { text: string }) {
  let prefix = "";
  return Array.from(text, (char) => {
    prefix += char;
    return (
      // Loading copy must not trigger font shards beyond the existing first-screen set.
      <span key={prefix} className={initialGlyphs.includes(char) ? undefined : "loading-fallback"}>
        {char}
      </span>
    );
  });
}

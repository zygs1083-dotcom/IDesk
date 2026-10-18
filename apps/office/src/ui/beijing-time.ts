import { sunTimes } from "../lib/sun.ts";

const format = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai",
});

export function beijingTime(date: Date) {
  const { sunrise, sunset } = sunTimes(date);
  const daytime = date >= sunrise && date < sunset;
  const nextSunrise =
    date < sunrise ? sunrise : sunTimes(new Date(date.getTime() + 86_400_000)).sunrise;
  return {
    time: format.format(date),
    event: daytime ? "sunset" : "sunrise",
    sun: format.format(daytime ? sunset : nextSunrise),
  } as const;
}

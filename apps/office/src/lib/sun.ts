// 北京（39.90°N, 116.40°E）的太阳位置，NOAA 简化算法，误差在一两分钟内
const latitude = (39.9042 * Math.PI) / 180;
const longitude = 116.4074;
const rad = Math.PI / 180;
const dayMs = 86_400_000;
const horizon = -0.833;

function declinationAndEquation(date: Date) {
  const days = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / dayMs;
  const gamma = (2 * Math.PI * days) / 365;
  const equation =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(gamma) -
      0.032077 * Math.sin(gamma) -
      0.014615 * Math.cos(2 * gamma) -
      0.040849 * Math.sin(2 * gamma));
  const declination =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma);
  return { declination, equation };
}

/** 太阳高度角（度） */
export function sunAltitude(date: Date): number {
  const { declination, equation } = declinationAndEquation(date);
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const hourAngle = ((utcMinutes + equation + 4 * longitude) / 4 - 180) * rad;
  const sin =
    Math.sin(latitude) * Math.sin(declination) +
    Math.cos(latitude) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(sin) / rad;
}

/** date 所在北京日的日出、日落时刻 */
export function sunTimes(date: Date): { sunrise: Date; sunset: Date } {
  const beijingMidnight =
    Math.floor((date.getTime() + 8 * 3_600_000) / dayMs) * dayMs - 8 * 3_600_000;
  const noon = new Date(beijingMidnight + 12 * 3_600_000);
  const { declination, equation } = declinationAndEquation(noon);
  const cos =
    (Math.sin(horizon * rad) - Math.sin(latitude) * Math.sin(declination)) /
    (Math.cos(latitude) * Math.cos(declination));
  const halfDay = Math.acos(cos) / rad;
  const solarNoonUtc = 720 - 4 * longitude - equation;
  const utcMidnight = Math.floor(noon.getTime() / dayMs) * dayMs;
  const at = (minutes: number) => new Date(utcMidnight + minutes * 60_000);
  return { sunrise: at(solarNoonUtc - 4 * halfDay), sunset: at(solarNoonUtc + 4 * halfDay) };
}

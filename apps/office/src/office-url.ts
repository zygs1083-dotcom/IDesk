declare const __OFFICE_BUILD__: string;

// Sprites and scene media keep fixed names; the build stamp busts the 24h cache on deploy.
export const officeUrl = (file: string) => `/office/${file}?v=${__OFFICE_BUILD__}`;

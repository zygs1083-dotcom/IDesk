declare const __OFFICE_ASSET_VERSION__: string;

// Fixed-name media share a content version so unchanged assets keep their cached URLs.
export const officeUrl = (file: string) => `/office/${file}?v=${__OFFICE_ASSET_VERSION__}`;

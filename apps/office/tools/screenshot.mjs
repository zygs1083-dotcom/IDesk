export function screenshot(page, options) {
  return page.screenshot({ ...options, animations: "disabled" });
}

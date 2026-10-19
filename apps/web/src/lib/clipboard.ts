export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const activeElement = document.activeElement;
  const textarea = document.createElement("textarea");
  textarea.readOnly = true;
  textarea.value = text;
  (activeElement?.closest("dialog") ?? document.body).append(textarea);
  try {
    textarea.select();
    if (!document.execCommand("copy")) throw new Error("Copy failed");
  } finally {
    textarea.remove();
    if (activeElement instanceof HTMLElement) activeElement.focus();
  }
}

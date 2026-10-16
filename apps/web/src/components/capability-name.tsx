import { useLang } from "../i18n/lang.tsx";
import { capabilityName } from "./capability-options.ts";

export function CapabilityName({ value }: { value: string }) {
  const { lang } = useLang();
  const { label, detail } = capabilityName(value, lang);
  return (
    <span className="min-w-0 break-words">
      <span className={detail ? "text-secondary" : undefined}>{label}</span>
      {detail && <span className="ml-2 text-label text-text-2"> {detail}</span>}
    </span>
  );
}

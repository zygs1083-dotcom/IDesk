import { useState } from "react";
import { useLang } from "../../i18n/lang.tsx";
import { applySkin, type Skin } from "../../lib/skin.ts";

export function AppearancePage() {
  const { t } = useLang();
  const [skin, setSkin] = useState<Skin>(() =>
    document.documentElement.dataset.skin === "cartoon" ? "cartoon" : "classic",
  );
  return (
    <section className="max-w-2xl space-y-4">
      <fieldset aria-describedby="appearance-note">
        <legend className="mb-4 text-section">{t("settings.appearance")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["classic", "cartoon"] as const).map((value) => (
            <label
              key={value}
              className="skin-option min-w-0 cursor-pointer rounded-panel border border-line-strong bg-surface p-4"
            >
              <div data-skin={value} className="skin-preview" aria-hidden="true">
                <div className="skin-preview-sidebar">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="skin-preview-sheet">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
              <span className="mt-4 flex items-center gap-2 text-body">
                <input
                  type="radio"
                  name="skin"
                  value={value}
                  checked={skin === value}
                  onChange={() => {
                    applySkin(value);
                    setSkin(value);
                  }}
                  aria-describedby={`skin-${value}-description`}
                  className="size-4 shrink-0 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                />
                {t(`appearance.${value}`)}
              </span>
              <span
                id={`skin-${value}-description`}
                className="mt-2 block text-secondary text-text-2"
              >
                {t(`appearance.${value}Description`)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p id="appearance-note" className="text-secondary text-text-2">
        {t("appearance.note")}
      </p>
    </section>
  );
}

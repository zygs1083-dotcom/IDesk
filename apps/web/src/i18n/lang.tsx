import type { Lang } from "@idesk/shared/labels";
import { createContext, type ReactNode, useContext, useState } from "react";
import { initialLang } from "./format.ts";
import { type Translate, translator } from "./translate.ts";

type LanguageContext = { lang: Lang; setLang: (lang: Lang) => void; t: Translate };
const LangContext = createContext<LanguageContext | null>(null);
let language = initialLang(localStorage.getItem("idesk.lang"), navigator.language);
document.documentElement.lang = language === "zh" ? "zh-CN" : "en";

export function currentLang(): Lang {
  return language;
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, updateLang] = useState(language);
  function setLang(value: Lang) {
    language = value;
    localStorage.setItem("idesk.lang", value);
    document.documentElement.lang = value === "zh" ? "zh-CN" : "en";
    updateLang(value);
  }
  const t = translator(lang);
  return <LangContext value={{ lang, setLang, t }}>{children}</LangContext>;
}

export function useLang() {
  return useContext(LangContext) as LanguageContext;
}

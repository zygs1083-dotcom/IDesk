import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { LangProvider } from "./i18n/lang.tsx";
import { WorldCheck } from "./world/check.tsx";
import "./office.css";

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <LangProvider>
      {new URLSearchParams(window.location.search).has("check") ? <WorldCheck /> : <App />}
    </LangProvider>,
  );

import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { LangProvider } from "./i18n/lang.tsx";
import { WorldPreview } from "./world/preview.tsx";
import "./office.css";

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <LangProvider>
      {new URLSearchParams(window.location.search).has("world") ? <WorldPreview /> : <App />}
    </LangProvider>,
  );

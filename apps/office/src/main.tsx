import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { LangProvider } from "./i18n/lang.tsx";
import "./office.css";

const root = document.getElementById("root");
if (root)
  createRoot(root).render(
    <LangProvider>
      <App />
    </LangProvider>,
  );

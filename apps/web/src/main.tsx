import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { App } from "./app.tsx";
import "./styles/index.css";

function redirectUnauthorized(error: Error) {
  if ("status" in error && error.status === 401 && window.location.pathname !== "/login") {
    window.location.replace(
      `/login?from=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    );
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: redirectUnauthorized }),
  mutationCache: new MutationCache({ onError: redirectUnauthorized }),
});

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);

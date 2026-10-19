import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilRuler } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../components/button.tsx";
import { Field } from "../components/field.tsx";
import { PixelIcon } from "../components/pixel-icon.tsx";
import { useLang } from "../i18n/lang.tsx";
import { request } from "../lib/api.ts";

export function Login() {
  const { t } = useLang();
  const client = useQueryClient();
  const [password, setPassword] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationKey: ["login"],
    mutationFn: () =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: () => {
      client.removeQueries({ queryKey: ["auth", "me"], exact: true });
      const from = params.get("from");
      if (from?.startsWith("/office")) {
        window.location.assign(from);
        return;
      }
      navigate(from?.startsWith("/") && !from.startsWith("//") ? from : "/desk", { replace: true });
    },
  });
  return (
    <main data-scene="login" className="flex h-full items-center justify-center p-6">
      <div data-ui="login-composition">
        <div data-ui="login-art" aria-hidden="true">
          <img
            data-ui="login-reception"
            src="/pixel-office/reception.webp"
            width="720"
            height="300"
            alt=""
          />
        </div>
        <form
          data-ui="panel"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
          className="w-90 max-w-full space-y-4 rounded-panel border border-line bg-surface p-4"
        >
          <h1 className="text-title" data-ui="login-brand">
            <PixelIcon
              name="pencil"
              fallback={<PencilRuler size={24} strokeWidth={1.5} />}
              className="skin-mark"
            />
            IDesk
          </h1>
          <p data-ui="login-subtitle" className="pixel-only">
            {t("login.subtitle")}
          </p>
          <Field
            label={t("login.password")}
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            {...(mutation.error ? { error: mutation.error.message } : {})}
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={!password || mutation.isPending}
          >
            {t("login.submit")}
          </Button>
        </form>
      </div>
    </main>
  );
}

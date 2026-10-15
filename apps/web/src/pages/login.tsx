import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../components/button.tsx";
import { Field } from "../components/field.tsx";
import { useLang } from "../i18n/lang.tsx";
import { request } from "../lib/api.ts";

export function Login() {
  const { t } = useLang();
  const [password, setPassword] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationKey: ["login"],
    mutationFn: () =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: () => {
      const from = params.get("from");
      if (from?.startsWith("/office")) {
        window.location.assign(from);
        return;
      }
      navigate(from?.startsWith("/") && !from.startsWith("//") ? from : "/desk", { replace: true });
    },
  });
  return (
    <main className="flex h-full items-center justify-center p-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          mutation.mutate();
        }}
        className="w-90 max-w-full space-y-4 rounded-panel border border-line bg-surface p-4"
      >
        <h1 className="text-title">IDesk</h1>
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
    </main>
  );
}

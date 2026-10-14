import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "../components/button.tsx";
import { Field } from "../components/field.tsx";
import { request } from "../lib/api.ts";

export function Login() {
  const [password, setPassword] = useState("");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationKey: ["login"],
    mutationFn: () =>
      request("/auth/login", { method: "POST", body: JSON.stringify({ password }) }),
    onSuccess: () => {
      const from = params.get("from");
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
          label="密码"
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
          登录
        </Button>
      </form>
    </main>
  );
}

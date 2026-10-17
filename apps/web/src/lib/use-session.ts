import type { authMeSchema } from "@idesk/shared/agent-schemas";
import { useQuery } from "@tanstack/react-query";
import type { z } from "zod";
import { request } from "./api.ts";

export function useSession() {
  const query = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => request<z.infer<typeof authMeSchema>>("/auth/me"),
  });
  return { ...query, isAdmin: query.data?.role === "admin" };
}

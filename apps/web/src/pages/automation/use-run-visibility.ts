import type { automationRunWithJobSchema } from "@idesk/shared/automation-schemas";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import { request } from "../../lib/api.ts";

type Run = z.infer<typeof automationRunWithJobSchema>;

export function useRunVisibility(
  connectorId: string | undefined,
  onError: (message: string) => void,
) {
  const client = useQueryClient();
  const queryKey = ["automation", "runs", connectorId];
  return useMutation({
    mutationFn: (run: Run) =>
      request<Run>(`/automation/runs/${run.id}`, {
        method: "PATCH",
        body: JSON.stringify({ hidden: run.hiddenAt === null }),
      }),
    onMutate: async (run) => {
      await client.cancelQueries({ queryKey });
      const previous = client.getQueryData<Run[]>(queryKey);
      client.setQueryData<Run[]>(queryKey, (runs) =>
        runs?.map((item) =>
          item.id === run.id
            ? { ...item, hiddenAt: run.hiddenAt === null ? new Date().toISOString() : null }
            : item,
        ),
      );
      return { previous };
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["automation"] }),
    onError: (error, _run, context) => {
      if (context?.previous !== undefined) client.setQueryData(queryKey, context.previous);
      onError(error.message);
    },
  });
}

import { TransitionError } from "@idesk/shared/task-machine";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export function toolResult<T>(result: T | TransitionError | undefined): CallToolResult {
  if (result === undefined || result instanceof TransitionError) {
    return {
      isError: true,
      content: [
        { type: "text", text: result instanceof TransitionError ? result.message : "任务不存在" },
      ],
    };
  }
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
}

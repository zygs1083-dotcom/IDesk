import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { readConfig } from "./config.js";

export async function mcpBridge(): Promise<void> {
  const { url, key } = await readConfig();
  const http = new StreamableHTTPClientTransport(new URL(`${url}/mcp`), {
    requestInit: { headers: { Authorization: `Bearer ${key}` } },
  });
  const stdio = new StdioServerTransport();
  await new Promise<void>((resolve, reject) => {
    stdio.onmessage = (message) => {
      http.send(message).catch(reject);
    };
    http.onmessage = (message) => {
      stdio.send(message).catch(reject);
    };
    stdio.onerror = reject;
    http.onerror = reject;
    stdio.onclose = () => {
      delete http.onclose;
      http.close().then(resolve, reject);
    };
    http.onclose = () => {
      delete stdio.onclose;
      stdio.close().then(resolve, reject);
    };
    http
      .start()
      .then(() => stdio.start())
      .catch(reject);
  });
}

import { pathToFileURL } from "node:url";

export async function demoEvents(
  base,
  password,
  capture = async (name) => process.stdout.write(`${name}\n`),
) {
  const endpoint = new URL("/api/v1/", base);
  const login = await fetch(new URL("auth/login", endpoint), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!login.ok) throw new Error(`Login: ${login.status} ${await login.text()}`);
  const cookie = login.headers
    .getSetCookie()
    .map((value) => value.split(";")[0])
    .join("; ");
  const request = async (path, body, key) => {
    const response = await fetch(new URL(path, endpoint), {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        ...(key ? { Authorization: `Bearer ${key}` } : { Cookie: cookie }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`);
    return response.json();
  };
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const step = async (name, action, ms = 5000) => {
    await action();
    await capture(`${name}-start`);
    await wait(ms);
    await capture(name);
  };
  const kinds = ["claude-code", "codex", "n8n", "script", "custom", "codex"];
  const agents = [];
  for (const [index, kind] of kinds.entries()) {
    agents.push(
      await request("agents", {
        name: `Demo ${kind} ${index + 1}`,
        kind,
        host: `demo-${Math.floor(index / 2) + 1}`,
        capabilities: ["office-demo"],
      }),
    );
  }
  const online = new Set(agents.map(({ apiKey }) => apiKey));
  const heartbeat = async () =>
    Promise.all([...online].map((key) => request("agents/me/heartbeat", {}, key)));
  const timer = setInterval(() => void heartbeat(), 30_000);
  const act = (task, type, index = 0, data = {}) =>
    request(`tasks/${task.id}/actions/${type}`, data, agents[index].apiKey);
  try {
    let task;
    await step("online", heartbeat, 15_000);
    await step("created", async () => {
      task = await request("tasks", { title: "Office demo: shipping the world", priority: "high" });
    });
    await step("claim", () => act(task, "claim"), 35_000);
    await step("reported", () =>
      request(
        `tasks/${task.id}/report`,
        { message: "The new world is ready for review" },
        agents[0].apiKey,
      ),
    );
    await step(
      "handoff",
      () => act(task, "handoff", 0, { to: agents[1].agent.id, note: "Please verify the world" }),
      12_000,
    );
    await step("accept", () => act(task, "accept", 1), 45_000);
    await step("pause", () => act(task, "pause", 1), 20_000);
    await step("resume", () => act(task, "resume", 1), 20_000);
    await step("complete", () => act(task, "complete", 1, { result: "Verified" }));
    let released;
    await step("release-created", async () => {
      released = await request("tasks", { title: "Office demo: release to board" });
    });
    await step("release-claim", () => act(released, "claim", 2), 15_000);
    await step("release", () => act(released, "release", 2));
    let meeting;
    await step("recruit", async () => {
      meeting = await request("tasks", {
        title: "Office demo: team review",
        dispatch: { type: "recruit", needed: 6 },
      });
    });
    for (let index = 0; index < agents.length; index++)
      await step(
        `join-${index + 1}`,
        () => act(meeting, "join", index),
        index === agents.length - 1 ? 45_000 : 25_000,
      );
    await step("meeting-cancel", () => request(`tasks/${meeting.id}/actions/cancel`, {}), 15_000);
    await step("envelope", () =>
      request(
        "relay",
        {
          to: { kind: "agent", id: agents[1].agent.id },
          kind: "note",
          subject: "World ready",
          body: "Thank you",
        },
        agents[0].apiKey,
      ),
    );
    await step("broadcast", () =>
      request(
        "relay",
        { to: { kind: "broadcast" }, kind: "note", subject: "All done" },
        agents[0].apiKey,
      ),
    );
    await capture("idle-start");
    await wait(60_000);
    await capture("idle-end");
    await step(
      "offline",
      async () => {
        online.delete(agents[0].apiKey);
      },
      155_000,
    );
  } finally {
    clearInterval(timer);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, password] = process.argv.slice(2);
  if (!base || !password) throw new Error("Usage: node demo-events.mjs <API URL> <admin password>");
  await demoEvents(base, password);
}

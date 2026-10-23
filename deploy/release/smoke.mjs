import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { chromium, request } = await import(process.env.PLAYWRIGHT_MODULE);
const baseURL = process.env.BASE_URL;
const password = (await readFile(process.env.ADMIN_PASSWORD_FILE, "utf8")).trimEnd();
const mode = process.argv[2];
const started = Date.now();
const result = { login: false, tasks: false, office: false, attempts: [] };
let browser;
let context;

async function taskCount(api) {
  const login = await api.post("/api/v1/auth/login", { data: { password } });
  assert.equal(login.status(), 200, "admin login failed");
  const tasks = await api.get("/api/v1/tasks");
  assert.equal(tasks.status(), 200, "task listing failed");
  return (await tasks.json()).length;
}

try {
  if (mode === "count") {
    context = await request.newContext({ baseURL });
    process.stdout.write(`${await taskCount(context)}\n`);
  } else {
    assert.equal(mode, "check", "expected count or check");
    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({ baseURL });
    const count = await taskCount(context.request);
    const login = await context.request.get("/login");
    assert.equal(login.status(), 200, "/login did not return 200");
    result.login = true;
    result.count = count;
    assert.ok(count >= Number(process.argv[3]), "task count decreased");
    result.tasks = true;
    const page = await context.newPage();
    for (let attempt = 1; attempt <= 2; attempt++) {
      const since = Date.now();
      try {
        await page.goto("/office", { waitUntil: "domcontentloaded", timeout: 120000 });
        const state = await page.waitForFunction(
          () => {
            if (document.querySelector(".office-error")) return "error";
            if (
              document.querySelector(".stage-host canvas") &&
              !document.querySelector(".office-loading")
            ) {
              return "ready";
            }
            return false;
          },
          null,
          { timeout: Math.max(1, 120000 - (Date.now() - since)) },
        );
        assert.equal(await state.jsonValue(), "ready", "office displayed an error");
        result.office = true;
        result.attempts.push({ attempt, ready: true, durationMs: Date.now() - since });
        break;
      } catch (error) {
        result.attempts.push({ attempt, ready: false, durationMs: Date.now() - since });
        if (error.name !== "TimeoutError" || attempt === 2) throw error;
      }
    }
  }
} catch (error) {
  result.error = error.name === "AssertionError" ? error.message : error.name;
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  else if (context) await context.dispose();
  if (mode !== "count" || process.exitCode) {
    process.stdout.write(`${JSON.stringify({ ...result, durationMs: Date.now() - started })}\n`);
  }
}

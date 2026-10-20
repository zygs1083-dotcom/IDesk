import type { AssistantReply } from "@idesk/shared/assistant-schemas";
import { getPerson } from "../people/people.ts";
import { confirmation } from "./confirmation.ts";
import { deterministic } from "./deterministic.ts";
import { modelFailure, runModel } from "./model.ts";
import { type SessionKey, saveSession, sessionFor } from "./sessions.ts";
import { modelSettings, redact } from "./settings.ts";
import { executeTool } from "./tools.ts";

export async function converse(
  key: SessionKey,
  text: string,
  action?: string,
): Promise<AssistantReply> {
  const session = sessionFor(key.channel, key.chatId, key.personId);
  const person = getPerson(key.personId);
  if (!person) return { text: "人员已删除，请联系管理员重新开通。" };
  let reply = deterministic(session, text, action);
  if (!reply) {
    const settings = modelSettings();
    if (!settings.enabled) reply = { text: "助理暂时不可用：未启用" };
    else {
      const previous = JSON.stringify(session.draft);
      let failure = "";
      try {
        const answer = await runModel(
          settings,
          session.history,
          text,
          person.role === "member",
          (call) => executeTool(session, call),
        );
        reply = { text: answer };
      } catch (error) {
        failure = modelFailure(error);
        reply = { text: failure };
      }
      if (session.draft && JSON.stringify(session.draft) !== previous) {
        reply = confirmation(session.draft);
        if (failure) reply.text = `${failure}\n${reply.text}`;
      }
    }
  }
  const current = getPerson(key.personId);
  if (!current) {
    session.draft = null;
    reply = { text: "人员已删除，请联系管理员重新开通。" };
  } else if (current.role !== "member" && session.draft) {
    session.draft = null;
    reply = { text: "没有发布或取消任务的权限。" };
  }
  reply = { ...reply, text: redact(reply.text).slice(0, 1500) };
  saveSession(session, redact(action ?? text), reply.text);
  return reply;
}

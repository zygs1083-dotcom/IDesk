import type { AssistantChannel, AssistantHistory } from "@idesk/shared/assistant-schemas";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.ts";
import { assistantSessions, people } from "../../db/schema.ts";

export type Session = typeof assistantSessions.$inferSelect;
export type SessionKey = Pick<Session, "channel" | "chatId" | "personId">;

export function sessionFor(channel: AssistantChannel, chatId: string, personId: string): Session {
  const key = { channel, chatId, personId };
  const session = db
    .select()
    .from(assistantSessions)
    .where(
      and(
        eq(assistantSessions.channel, channel),
        eq(assistantSessions.chatId, chatId),
        eq(assistantSessions.personId, personId),
      ),
    )
    .get();
  if (session && Date.now() - session.updatedAt.getTime() < 30 * 60_000) return session;
  return { ...key, history: [], draft: null, updatedAt: new Date() };
}

export function saveSession(session: Session, user: string, assistant: string): void {
  if (!db.select({ id: people.id }).from(people).where(eq(people.id, session.personId)).get())
    return;
  const history: AssistantHistory =
    user.trim() === "重来"
      ? []
      : [
          ...session.history,
          { role: "user" as const, content: user },
          { role: "assistant" as const, content: assistant },
        ].slice(-20);
  const value = { ...session, history, updatedAt: new Date() };
  db.insert(assistantSessions)
    .values(value)
    .onConflictDoUpdate({
      target: [assistantSessions.channel, assistantSessions.chatId, assistantSessions.personId],
      set: value,
    })
    .run();
}

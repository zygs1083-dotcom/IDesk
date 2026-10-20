import type { AssistantReceiveInput } from "@idesk/shared/assistant-schemas";
import { consumeBindCode } from "../people/codes.ts";
import { getBoundPerson } from "../people/people.ts";
import { converse } from "./conversation.ts";

export async function receive(input: AssistantReceiveInput): Promise<void> {
  const person = getBoundPerson(input.channel, input.externalUserId);
  const match = /^绑定\s*(\d{6})$/.exec(input.text?.trim() ?? "");
  if (match) {
    const result = consumeBindCode(match[1] as string, {
      channel: input.channel,
      externalId: input.externalUserId,
      displayName: input.displayName,
    });
    await input.reply({
      text: result.ok
        ? `已绑定：${result.person.name}`
        : result.reason === "alreadyBound"
          ? "此账号已绑定其他人员，请先在网页解绑。"
          : "绑定码无效或已过期，请联系管理员。",
    });
    return;
  }
  if (!person) {
    await input.reply({
      text: "你还没有开通。请管理员在 IDesk 设置 · 人员里为你生成绑定码，然后发『绑定 123456』",
    });
    return;
  }
  if (input.text === undefined && input.action === undefined) {
    await input.reply({ text: "目前只支持文字。" });
    return;
  }
  await input.reply(
    await converse(
      { channel: input.channel, chatId: input.chatId, personId: person.id },
      input.text ?? "",
      input.action,
    ),
  );
}

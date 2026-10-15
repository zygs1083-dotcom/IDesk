import type { Lang } from "@idesk/shared/labels";
import {
  type MessageArguments,
  type MessageKey,
  type MessageParams,
  message,
} from "@idesk/shared/messages";
import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HttpError<K extends MessageKey = MessageKey> extends Error {
  readonly params: MessageParams<K>;

  constructor(
    public readonly status: ContentfulStatusCode,
    readonly key: K,
    ...args: MessageArguments<K>
  ) {
    const params = args[0] as MessageParams<K>;
    super(message("zh", key, params));
    this.params = params;
  }

  translate(lang: Lang): string {
    return message(lang, this.key, this.params);
  }
}

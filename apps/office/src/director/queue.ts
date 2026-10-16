export class ActionQueue {
  private tails = new Map<string, Promise<void>>();

  constructor(private onIdle: (id: string) => Promise<void> | void = () => {}) {}

  async drain() {
    await Promise.all(this.tails.values());
  }

  enqueue(id: string, action: () => Promise<void> | void): Promise<void> {
    const next = (this.tails.get(id) ?? Promise.resolve()).then(action).then(async () => {
      if (this.tails.get(id) !== next) return;
      await this.onIdle(id);
      if (this.tails.get(id) === next) this.tails.delete(id);
    });
    this.tails.set(id, next);
    return next;
  }
}

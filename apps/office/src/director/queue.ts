export class ActionQueue {
  private tails = new Map<string, Promise<void>>();

  async drain() {
    await Promise.all(this.tails.values());
  }

  enqueue(id: string, action: () => Promise<void> | void): Promise<void> {
    const next = (this.tails.get(id) ?? Promise.resolve()).then(action);
    this.tails.set(id, next);
    return next;
  }
}

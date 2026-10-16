export class BubbleClock {
  remaining: number;
  constructor(duration: number) {
    this.remaining = duration;
  }
  advance(elapsed: number, visible: boolean) {
    if (visible) this.remaining -= elapsed;
    return this.remaining <= 0;
  }
}

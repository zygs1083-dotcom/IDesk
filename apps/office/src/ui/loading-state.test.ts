import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type LoadingState, startLoading } from "./loading-state.ts";

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Office loading feedback", () => {
  it("only reaches each real milestone after completion and never invents 100%", () => {
    const updates: LoadingState[] = [];
    const loading = startLoading((state) => updates.push(state));
    for (const [step, limit] of [
      [0, 3],
      [5, 73],
      [75, 88],
      [90, 98],
    ] as const) {
      loading.advance(step);
      expect(updates.at(-1)?.progress).toBe(step);
      vi.advanceTimersByTime(120_000);
      expect(updates.at(-1)?.progress).toBe(limit);
      expect(updates.at(-1)?.progress).toBeLessThan(100);
    }
    expect(
      updates.every(
        (state, index) =>
          index === 0 || state.progress >= (updates[index - 1] as LoadingState).progress,
      ),
    ).toBe(true);
    loading.advance(100);
    expect(updates.at(-1)?.progress).toBe(100);
    loading.dispose();
  });

  it("waits 200ms to show, holds ready for 150ms, then removes after a 300ms fade", () => {
    let state: LoadingState | undefined;
    const loading = startLoading((next) => {
      state = next;
    });
    vi.advanceTimersByTime(199);
    expect(state?.visible).toBe(false);
    vi.advanceTimersByTime(1);
    expect(state?.visible).toBe(true);
    loading.advance(100);
    vi.advanceTimersByTime(149);
    expect(state).toMatchObject({ visible: true, fading: false, progress: 100 });
    vi.advanceTimersByTime(1);
    expect(state?.fading).toBe(true);
    vi.advanceTimersByTime(299);
    expect(state?.visible).toBe(true);
    vi.advanceTimersByTime(1);
    expect(state?.visible).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not flash for fast loads or after a failure", () => {
    let state: LoadingState | undefined;
    const fast = startLoading((next) => {
      state = next;
    });
    vi.advanceTimersByTime(199);
    fast.advance(100);
    vi.advanceTimersByTime(1000);
    expect(state?.visible).toBe(false);
    const failed = startLoading((next) => {
      state = next;
    });
    vi.advanceTimersByTime(200);
    expect(state?.visible).toBe(true);
    failed.fail();
    expect(state?.visible).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("discards old timers and late milestones when replay restarts a loading session", () => {
    const oldUpdates = vi.fn();
    const old = startLoading(oldUpdates);
    vi.advanceTimersByTime(200);
    old.advance(100);
    old.dispose();
    const count = oldUpdates.mock.calls.length;
    const updates = vi.fn();
    const current = startLoading(updates);
    old.advance(75);
    vi.advanceTimersByTime(199);
    expect(updates.mock.lastCall?.[0]).toMatchObject({ visible: false, phrase: 0 });
    vi.advanceTimersByTime(1);
    expect(updates.mock.lastCall?.[0]).toMatchObject({ visible: true, fading: false });
    vi.advanceTimersByTime(500);
    expect(oldUpdates).toHaveBeenCalledTimes(count);
    current.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("starts on the boss line and changes phrases every 2.5s without repeating a neighbor", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.4);
    const phrases: number[] = [];
    const loading = startLoading((state) => {
      if (phrases.at(-1) !== state.phrase) phrases.push(state.phrase);
    });
    expect(phrases).toEqual([0]);
    vi.advanceTimersByTime(2499);
    expect(phrases).toEqual([0]);
    vi.advanceTimersByTime(1);
    expect(phrases).toHaveLength(2);
    vi.advanceTimersByTime(250_000);
    expect(phrases).toHaveLength(102);
    expect(
      phrases.every((phrase, index) => phrase >= 0 && phrase < 12 && phrase !== phrases[index - 1]),
    ).toBe(true);
    expect(new Set(phrases).size).toBeGreaterThan(2);
    loading.dispose();
  });
});

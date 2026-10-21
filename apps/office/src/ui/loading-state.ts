export type LoadingStep = 0 | 5 | 75 | 90 | 100;
export type LoadingState = {
  progress: number;
  visible: boolean;
  fading: boolean;
  phrase: number;
};

export function startLoading(update: (state: LoadingState) => void) {
  let state: LoadingState = { progress: 0, visible: false, fading: false, phrase: 0 };
  let step: LoadingStep = 0;
  let disposed = false;
  let since = Date.now();
  let fade: ReturnType<typeof setTimeout>;
  let remove: ReturnType<typeof setTimeout>;
  const show = setTimeout(() => {
    state = { ...state, visible: true };
    update(state);
  }, 200);
  const tick = setInterval(() => {
    const ceiling = ({ 0: 3, 5: 73, 75: 88, 90: 98, 100: 100 } as const)[step];
    const progress = Math.round(
      ceiling - (ceiling - step) * Math.exp(-(Date.now() - since) / 8000),
    );
    state = { ...state, progress: Math.max(state.progress, progress) };
    update(state);
  }, 100);
  const phrases = setInterval(() => {
    const next = Math.floor(Math.random() * 11);
    state = { ...state, phrase: next >= state.phrase ? next + 1 : next };
    update(state);
  }, 2500);
  const stop = () => {
    clearTimeout(show);
    clearInterval(tick);
    clearInterval(phrases);
    clearTimeout(fade);
    clearTimeout(remove);
  };
  update(state);
  return {
    advance(next: LoadingStep) {
      if (disposed) return;
      step = next;
      since = Date.now();
      state = { ...state, progress: next };
      if (next === 100) {
        stop();
        if (state.visible) {
          fade = setTimeout(() => {
            state = { ...state, fading: true };
            update(state);
          }, 150);
          remove = setTimeout(() => {
            state = { ...state, visible: false };
            update(state);
          }, 450);
        }
      }
      update(state);
    },
    fail() {
      stop();
      disposed = true;
      state = { ...state, visible: false };
      update(state);
    },
    dispose() {
      disposed = true;
      stop();
    },
  };
}

/**
 * Trailing debounce. Calls `fn` after `wait` ms of inactivity.
 * `flush()` invokes immediately if a call is pending.
 * `cancel()` drops the pending call.
 */
export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  wait: number,
): {
  (...args: Args): void;
  flush: () => void;
  cancel: () => void;
} {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Args | null = null;

  const wrapped = ((...args: Args) => {
    lastArgs = args;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (lastArgs) {
        const a = lastArgs;
        lastArgs = null;
        fn(...a);
      }
    }, wait);
  }) as ReturnType<typeof debounce<Args>>;

  wrapped.flush = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (lastArgs) {
      const a = lastArgs;
      lastArgs = null;
      fn(...a);
    }
  };

  wrapped.cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    lastArgs = null;
  };

  return wrapped;
}

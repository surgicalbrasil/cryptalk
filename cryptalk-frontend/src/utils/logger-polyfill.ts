// Logger polyfill utility for Magic SDK and other libraries
export function ensureLoggerPolyfill(): void {
  const logger = {
    log: (...args: any[]) => console.log(...args),
    warn: (...args: any[]) => console.warn(...args),
    error: (...args: any[]) => console.error(...args),
    info: (...args: any[]) => console.info(...args),
    debug: (...args: any[]) => console.debug(...args)
  };

  // Try to set logger in all possible global contexts
  const contexts = [
    typeof window !== 'undefined' ? window : null,
    typeof globalThis !== 'undefined' ? globalThis : null,
    typeof self !== 'undefined' ? self : null,
    typeof global !== 'undefined' ? global : null
  ];

  contexts.forEach(context => {
    if (context && !(context as any).logger) {
      try {
        (context as any).logger = logger;
      } catch (e) {
        // Ignore if we can't set it in this context
      }
    }
  });

  // Also try to set it directly on the global object
  try {
    if (typeof window !== 'undefined') {
      (window as any).logger = logger;
    }
  } catch (e) {
    // Ignore
  }

  // Extend the global scope with logger
  try {
    (globalThis as any).logger = logger;
  } catch (e) {
    // Ignore
  }
}

// Auto-initialize on import
ensureLoggerPolyfill();
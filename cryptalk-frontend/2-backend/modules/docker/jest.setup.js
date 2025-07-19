// Mock do módulo fs/promises
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    rm: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock do módulo tar-stream
jest.mock('tar-stream', () => ({
  pack: jest.fn(() => ({
    entry: jest.fn(),
    finalize: jest.fn(),
    pipe: jest.fn()
  })),
  extract: jest.fn(() => {
    const { EventEmitter } = require('events');
    return new EventEmitter();
  })
}));

// Mock global para setTimeout/clearTimeout
global.setTimeout = jest.fn((callback, timeout) => {
  // Simular execução imediata para testes
  if (typeof callback === 'function') {
    process.nextTick(callback);
  }
  return 'mocked-timeout';
});

global.clearTimeout = jest.fn();
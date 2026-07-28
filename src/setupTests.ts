// Setup file for Vitest
import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

type UUID = `${string}-${string}-${string}-${string}-${string}`;

const createMockUUID = (): UUID => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
  const r = Math.random() * 16 | 0;
  const v = c === 'x' ? r : (r & 0x3 | 0x8);
  return v.toString(16);
}) as UUID;

// Mock next-themes if needed
vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'system',
    setTheme: () => {}
  })
}));

// MatchMedia mock for useTheme
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
});

// Mock resizeTo
window.resizeTo = vi.fn();

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string): string | null => store[key] ?? null,
    setItem: (key: string, value: string): void => {
      store[key] = value.toString();
    },
    removeItem: (key: string): void => {
      delete store[key];
    },
    clear: (): void => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock crypto.randomUUID for Dexie
if (!global.crypto) {
  global.crypto = {
    randomUUID: createMockUUID
  } as unknown as Crypto;
} else if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = createMockUUID;
}

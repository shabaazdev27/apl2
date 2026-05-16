import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock motion/react
vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    header: ({ children, ...props }: any) => <header {...props}>{children}</header>,
    main: ({ children, ...props }: any) => <main {...props}>{children}</main>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    img: (props: any) => <img {...props} />,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock WebSocket
class MockWebSocket {
  onopen: any = null;
  onmessage: any = null;
  onerror: any = null;
  onclose: any = null;
  readyState = 1;
  send = vi.fn();
  close = vi.fn();
}
(window as any).WebSocket = MockWebSocket;
